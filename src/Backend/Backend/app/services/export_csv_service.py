# Backend/app/services/export_csv_service.py
# Full updated exporter: 
# - Works with your patients/forms/form_status/FormSubmissions schema
# - When includeAnswers=true + groupPerTemplate=true -> returns a ZIP with one CSV per template,
#   pivoting FormResponses so each field_label becomes a column (Lobbie-style).
# - Falls back gracefully if some columns are missing.

import csv
import io
import datetime
import zipfile
from typing import Iterable, Tuple, Dict, Any, List, Optional
from ..database import get_connection


# ---------- small helpers ----------

def _in_clause(values: Iterable[Any]) -> Tuple[str, Tuple[Any, ...]]:
    vals = tuple(values or [])
    if not vals:
        return "(NULL)", tuple()
    return "(" + ",".join(["?"] * len(vals)) + ")", vals


def _cols(cur, table: str) -> List[str]:
    cur.execute("""
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
    """, (table,))
    return [r[0] for r in cur.fetchall()]


def _pick(cols: List[str], *candidates: str) -> Optional[str]:
    low = {c.lower(): c for c in cols}
    for cand in candidates:
        name = low.get(cand.lower())
        if name:
            return name
    return None


def _slug_filename(s: str) -> str:
    s = (s or "").strip().lower()
    out = []
    for ch in s:
        if ch.isalnum() or ch in ("-", "_"):
            out.append(ch)
        elif ch.isspace():
            out.append("-")
    return "".join(out) or "form"


def _csv_bytes(rows: List[Dict[str, Any]]) -> bytes:
    if not rows:
        return "No data found.\n".encode("utf-8-sig")
    headers: List[str] = []
    seen = set()
    for r in rows:
        for k in r.keys():
            if k not in seen:
                seen.add(k)
                headers.append(k)
    sio = io.StringIO()
    w = csv.DictWriter(sio, fieldnames=headers, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    return sio.getvalue().encode("utf-8-sig")


# ---------- main exporter ----------

def generate_csv_export(filters: Dict[str, Any] | None = None) -> Tuple[bytes, str, str]:
    """
    Base behavior: one CSV with (patient, form) and latest submission timestamp.
    If filters.includeAnswers == True -> return a ZIP, one CSV per template (fields as columns).
    Supported filters keys (all optional):
      respectPage, patientIds
      respectTemplates, templateIds
      respectStatus, statuses
      respectDueDate, dueFrom, dueTo
      includeCurrentAndArchived (False to exclude archived if column exists)
      includeAnswers (True to build per-template files and pivot answers)
      groupPerTemplate (True -> ZIP per template; kept for parity)
      respectLocation/location (ignored unless you wire a location join)
    """
    filters = filters or {}

    conn = get_connection()
    if not conn:
        raise RuntimeError("No DB connection")

    cur = conn.cursor()

    # Discover columns on core tables
    patients_cols     = _cols(cur, "patients")
    forms_cols        = _cols(cur, "forms")
    form_status_cols  = _cols(cur, "form_status")

    # Patients
    P_ID    = _pick(patients_cols, "id", "patient_id")
    P_FIRST = _pick(patients_cols, "first_name", "firstname")
    P_LAST  = _pick(patients_cols, "last_name", "lastname")
    if not (P_ID and P_FIRST and P_LAST):
        raise RuntimeError("Required columns not found on dbo.patients (need id, first_name, last_name).")

    # Forms
    F_ID   = _pick(forms_cols, "form_id", "id", "template_id")
    F_NAME = _pick(forms_cols, "form_name", "name", "template_name", "title")
    if not F_ID:
        raise RuntimeError("Required column not found on dbo.forms (need form_id/id/template_id).")

    # Form status
    FS_PATIENT  = _pick(form_status_cols, "patient_id")
    FS_FORM     = _pick(form_status_cols, "form_id")
    FS_STATUS   = _pick(form_status_cols, "status")
    FS_DUE      = _pick(form_status_cols, "due_date", "dueon", "due_on")
    FS_ARCHIVED = _pick(form_status_cols, "is_archived", "archived", "activeflag")
    if not (FS_PATIENT and FS_FORM and FS_STATUS):
        raise RuntimeError("Required columns not found on dbo.form_status (need patient_id, form_id, status).")

    # WHERE clauses from filters
    where_parts: List[str] = []
    params: List[Any] = []

    if filters.get("respectPage") and filters.get("patientIds"):
        frag, vals = _in_clause(filters["patientIds"])
        where_parts.append(f"p.{P_ID} IN {frag}")
        params.extend(vals)

    if filters.get("respectTemplates") and filters.get("templateIds"):
        frag, vals = _in_clause(filters["templateIds"])
        where_parts.append(f"f.{F_ID} IN {frag}")
        params.extend(vals)

    if filters.get("respectStatus") and filters.get("statuses"):
        frag, vals = _in_clause(filters["statuses"])
        where_parts.append(f"fs.{FS_STATUS} IN {frag}")
        params.extend(vals)

    if filters.get("respectDueDate"):
        if filters.get("dueFrom"):
            where_parts.append(f"fs.{FS_DUE} >= ?")
            params.append(filters["dueFrom"])
        if filters.get("dueTo"):
            where_parts.append(f"fs.{FS_DUE} < DATEADD(day, 1, ?)")
            params.append(filters["dueTo"])

    if filters.get("includeCurrentAndArchived") is False and FS_ARCHIVED:
        where_parts.append(f"(fs.{FS_ARCHIVED} IN (0, '0', 'False', 'N'))")

    where_sql = "WHERE " + " AND ".join(where_parts) if where_parts else ""

    # Latest submission CTE from dbo.FormSubmissions
    subs_cols = _cols(cur, "FormSubmissions")
    SUBS_ID = _pick(subs_cols, "submission_id", "id")
    SUBS_FID = _pick(subs_cols, "form_id")
    SUBS_PID = _pick(subs_cols, "patient_id")
    SUBS_AT = _pick(subs_cols, "submitted_at", "created_on", "created_at")
    if not (SUBS_ID and SUBS_FID and SUBS_PID and SUBS_AT):
        raise RuntimeError("FormSubmissions required columns not found (need submission_id, form_id, patient_id, submitted_at).")

    base_sql = f"""
        WITH LatestSubmission AS (
            SELECT
                {SUBS_ID}  AS submission_id,
                {SUBS_FID} AS form_id,
                {SUBS_PID} AS patient_id,
                {SUBS_AT}  AS submitted_at,
                ROW_NUMBER() OVER(
                    PARTITION BY {SUBS_FID}, {SUBS_PID}
                    ORDER BY {SUBS_AT} DESC
                ) AS rn
            FROM dbo.FormSubmissions
        )
        SELECT 
            ls.submission_id,
            p.{P_ID}                         AS patient_id,
            (p.{P_FIRST} + ' ' + p.{P_LAST}) AS patient_name,
            f.{F_ID}                         AS form_id,
            {("f." + F_NAME) if F_NAME else "CAST(NULL AS NVARCHAR(255))"} AS form_name,
            fs.{FS_STATUS}                   AS status,
            {"CONVERT(VARCHAR(19), fs." + FS_DUE + ", 120)" if FS_DUE else "CAST(NULL AS NVARCHAR(19))"} AS due_date,
            CONVERT(VARCHAR(19), ls.submitted_at, 120) AS completed_date
        FROM dbo.patients AS p
        LEFT JOIN dbo.form_status AS fs
               ON p.{P_ID} = fs.{FS_PATIENT}
        LEFT JOIN dbo.forms AS f
               ON fs.{FS_FORM} = f.{F_ID}
        LEFT JOIN LatestSubmission AS ls
               ON ls.form_id = f.{F_ID}
              AND ls.patient_id = p.{P_ID}
              AND ls.rn = 1
        {where_sql}
        ORDER BY p.{P_ID}, f.{F_ID};
    """

    cur.execute(base_sql, tuple(params))
    base_cols = [d[0] for d in cur.description]
    base_rows = [dict(zip(base_cols, r)) for r in cur.fetchall()]
    print(f"[CSV EXPORT] base rows: {len(base_rows)}")

    # If NOT including answers -> return single CSV
    if not filters.get("includeAnswers"):
        csv_bytes = _csv_bytes(base_rows)
        return csv_bytes, f"forms-export-{datetime.datetime.now():%Y%m%d-%H%M%S}.csv", "text/csv"

    # ---------- Answers pivot (Lobbie-style) ----------

    # Discover fields & responses tables
    ff_cols = _cols(cur, "FormFields")
    fr_cols = _cols(cur, "FormResponses")

    # FormFields picks (supports your schema: field_id, form_id, field_label)
    FF_ID     = _pick(ff_cols, "field_id", "id")
    FF_FORMID = _pick(ff_cols, "form_id", "template_id")
    FF_LABEL  = _pick(
        ff_cols,
        "field_label",            # your table has this column
        "label", "question", "title", "text", "name"
    )
    FF_ORDER  = _pick(ff_cols, "display_order", "sort_order", "position", "order")  # optional

    if not (FF_ID and FF_FORMID and FF_LABEL):
        raise RuntimeError("FormFields required columns not found. Need field_id, form_id and field_label/label/question/name.")

    # FormResponses picks (broadened for resilience)
    FR_ID       = _pick(fr_cols, "id", "response_id")
    FR_SUBID    = _pick(fr_cols, "submission_id", "patientform_id", "header_id")
    FR_FIELDID  = _pick(fr_cols, "field_id", "question_id")
    FR_VALUE    = _pick(
        fr_cols,
        "value", "answer", "response",
        "response_value", "answer_value",
        "value_text", "text", "choice", "number", "date"
    )

    if not (FR_SUBID and FR_FIELDID and FR_VALUE):
        raise RuntimeError("FormResponses required columns not found. Need submission_id, field_id and value/answer/response.")

    # Work on forms present in base rows
    form_ids = sorted({r["form_id"] for r in base_rows if r.get("form_id") is not None})
    if not form_ids:
        # No forms -> return base CSV
        csv_bytes = _csv_bytes(base_rows)
        return csv_bytes, f"forms-export-{datetime.datetime.now():%Y%m%d-%H%M%S}.csv", "text/csv"

    # Load field labels for those forms
    frag, vals = _in_clause(form_ids)
    q_fields = f"""
        SELECT {FF_ID} AS field_id,
               {FF_FORMID} AS form_id,
               {FF_LABEL} AS label
               {(", " + FF_ORDER + " AS sort_order") if FF_ORDER else ""}
        FROM dbo.FormFields
        WHERE {FF_FORMID} IN {frag}
    """
    cur.execute(q_fields, vals)
    cols = [d[0] for d in cur.description]
    fields_rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    # Build form_id -> ordered list of (field_id, label)
    form_fields: Dict[Any, List[Tuple[Any, str]]] = {}
    for fr in fields_rows:
        lbl = (fr["label"] or "").strip()
        form_fields.setdefault(fr["form_id"], []).append((fr["field_id"], lbl))

    # Sort by sort_order if present; else alphabetical by label
    if fields_rows and "sort_order" in fields_rows[0]:
        for fid in form_fields:
            order_map = {r["field_id"]: r.get("sort_order") for r in fields_rows if r["form_id"] == fid}
            form_fields[fid].sort(key=lambda x: (order_map.get(x[0]) is None, order_map.get(x[0], 10**9), str(x[1]).lower()))
    else:
        for fid in form_fields:
            form_fields[fid].sort(key=lambda x: str(x[1]).lower())

    # Load responses for the submissions from base_rows
    sub_ids = sorted({r["submission_id"] for r in base_rows if r.get("submission_id") is not None})
    ans_map: Dict[Any, Dict[Any, Any]] = {}
    if sub_ids:
        frag, vals = _in_clause(sub_ids)
        q_resp = f"""
            SELECT {FR_SUBID}   AS submission_id,
                   {FR_FIELDID} AS field_id,
                   {FR_VALUE}   AS value
            FROM dbo.FormResponses
            WHERE {FR_SUBID} IN {frag}
        """
        cur.execute(q_resp, vals)
        for submission_id, field_id, value in cur.fetchall():
            ans_map.setdefault(submission_id, {})[field_id] = value

    # Group base rows per template and pivot answers into columns
    per_template: Dict[Any, List[Dict[str, Any]]] = {}
    counters: Dict[Any, int] = {}
    for row in base_rows:
        fid = row["form_id"]
        counters[fid] = counters.get(fid, 0) + 1
        form_no = counters[fid]

        widened = {
            "Form #": form_no,
            "Created On": row.get("completed_date") or "",
            "Location": "",  # fill if you wire a location join
            "Patient": row.get("patient_name") or "",
            "Template": row.get("form_name") or f"Form {fid}",
            "Completed On": row.get("completed_date") or "",
        }

        fields_for_form = form_fields.get(fid, [])
        given = ans_map.get(row.get("submission_id"), {})
        for field_id, label in fields_for_form:
            col = label or f"Field {field_id}"
            widened[col] = given.get(field_id, "")

        per_template.setdefault(fid, []).append(widened)

    # Emit ZIP: one CSV per template
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for fid, rows in per_template.items():
            base_name = _slug_filename(rows[0].get("Template") or f"form-{fid}")
            fname = f"{base_name}-{datetime.datetime.now():%Y%m%d-%H%M%S}.csv"
            zf.writestr(fname, _csv_bytes(rows))
    mem.seek(0)
    return mem.getvalue(), f"forms-export-{datetime.datetime.now():%Y%m%d-%H%M%S}.zip", "application/zip"
