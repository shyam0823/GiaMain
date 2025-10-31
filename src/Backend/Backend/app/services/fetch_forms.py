# Backend/app/services/fetch_forms.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from .. import database as _db

# ---------- helpers ----------
def _fetch_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    if hasattr(_db, "fetch_all"):
        return _db.fetch_all(sql, params)
    conn, cur = _db.get_cursor()
    try:
        cur.execute(sql, params)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]
    finally:
        conn.close()

def _fetch_one(sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    rows = _fetch_all(sql, params)
    return rows[0] if rows else None

# ---------- reads ----------
def get_patient_basic(patient_id: int) -> Dict[str, Any]:
    sql = """
    SELECT TOP 1
        p.id,
        p.first_name,
        p.last_name,
        CONCAT(p.first_name, ' ', p.last_name) AS name,
        p.email,
        p.phone,
        p.dob,
        p.created_on
    FROM dbo.patients AS p
    WHERE p.id = ?
    """
    row = _fetch_one(sql, (patient_id,))
    return row or {
        "id": patient_id, "first_name": None, "last_name": None,
        "name": f"Patient {patient_id}", "email": None, "phone": None,
        "dob": None, "created_on": None,
    }

def get_assigned_forms(patient_id: int) -> List[Dict[str, Any]]:
    """
    Return EVERY assigned form for the patient from dbo.form_status,
    and LEFT JOIN the latest submission (if it exists) from dbo.FormSubmissions.
    """
    sql = """
    ;WITH last_sub AS (
        SELECT
            fs.form_id,
            fs.patient_id,
            MAX(fs.submitted_at) AS submitted_at
        FROM dbo.FormSubmissions AS fs
        WHERE fs.patient_id = ?
        GROUP BY fs.form_id, fs.patient_id
    )
    SELECT
        a.form_id,
        a.patient_id,
        a.status              AS assign_status,   -- e.g. 'Active'
        a.due_date,
        a.location,
        f.form_name           AS title,
        f.description,
        f.form_url,
        f.created_at          AS form_created_at,

        s.submission_id,
        s.status              AS submit_status,   -- e.g. 'Completed', 'In Progress'
        s.submitted_at
    FROM dbo.form_status AS a
    JOIN dbo.Forms AS f
      ON f.form_id = a.form_id
    LEFT JOIN last_sub AS ls
      ON ls.form_id = a.form_id AND ls.patient_id = a.patient_id
    LEFT JOIN dbo.FormSubmissions AS s
      ON s.form_id = ls.form_id
     AND s.patient_id = ls.patient_id
     AND s.submitted_at = ls.submitted_at
    WHERE a.patient_id = ?
    ORDER BY
        COALESCE(s.submitted_at, a.due_date) DESC,
        a.form_id DESC
    """
    rows = _fetch_all(sql, (patient_id, patient_id))
    return rows

def get_submission_responses(submission_id: int) -> List[Dict[str, Any]]:
    sql = """
    SELECT
        fr.field_id,
        fr.response_value,
        fr.response_id,
        ff.form_id,
        ff.field_label  AS label,
        ff.field_type   AS type,
        ff.is_required
    FROM dbo.FormResponses AS fr
    LEFT JOIN dbo.FormFields AS ff
      ON ff.field_id = fr.field_id
    WHERE fr.submission_id = ?
    ORDER BY fr.response_id
    """
    return _fetch_all(sql, (submission_id,))

def get_patient_export_data(patient_id: int) -> Dict[str, Any]:
    patient = get_patient_basic(patient_id)
    forms   = get_assigned_forms(patient_id)

    # Attach responses from the latest submission (if any)
    for f in forms:
        sid = f.get("submission_id")
        f["responses"] = get_submission_responses(sid) if sid else []

        # Provide a consistent display_status WITHOUT guessing 'Completed'
        # Priority: submit_status (from submission) -> assign_status (from assignment) -> 'Assigned'
        f["display_status"] = (
            f.get("submit_status")
            or f.get("assign_status")
            or "Assigned"
        )

    return {"patient": patient, "forms": forms}
