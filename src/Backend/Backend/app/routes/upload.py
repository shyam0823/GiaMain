# Backend/app/routes/upload.py
from flask import Blueprint, request, jsonify
from app.database import get_cursor
from datetime import datetime
from uuid import UUID, uuid4
import json

uploads_bp = Blueprint("uploads", __name__)  # register with url_prefix="/api"

# ---------- helpers ----------
def parse_iso_dt(s):
    if isinstance(s, datetime):
        return s
    # tolerate trailing Z
    return datetime.fromisoformat(str(s).replace("Z", "+00:00"))

def rowify(cursor, row):
    cols = [c[0] for c in cursor.description]
    return {cols[i]: row[i] for i in range(len(cols))}

def is_guid(s: str) -> bool:
    try:
        UUID(str(s))
        return True
    except Exception:
        return False

# ---------- core upsert routine (used by POST and PUT) ----------
def _do_upsert(uid: str, payload: dict):
    """
    Executes an UPSERT for a single upload row.
    Returns (ok: bool, id: str, err: str|None)
    """
    # Validate required fields
    required = ["name", "source", "uploadedAt", "data"]
    missing = [k for k in required if k not in payload]
    if missing:
        return False, uid, f"missing fields: {', '.join(missing)}"

    # Ensure GUID id
    use_uid = uid if is_guid(uid) else str(uuid4())

    name      = payload["name"]
    source    = payload["source"]
    original  = payload.get("original")
    uploaded  = parse_iso_dt(payload["uploadedAt"])
    data      = payload["data"]
    row_count = int(payload.get("rowCount", len(data) if isinstance(data, list) else 0) or 0)
    data_json = json.dumps(data, ensure_ascii=False)

    upsert_sql = """
IF EXISTS (SELECT 1 FROM dbo.Uploads WHERE [UploadId] = ?)
BEGIN
  UPDATE dbo.Uploads
     SET [Name] = ?, [Source] = ?, [Original] = ?, [UploadedAt] = ?, [RowCount] = ?, [IsSaved] = 1, [DataJson] = ?, [IsDeleted] = 0
   WHERE [UploadId] = ?;
END
ELSE
BEGIN
  INSERT dbo.Uploads ([UploadId],[Name],[Source],[Original],[UploadedAt],[RowCount],[IsSaved],[DataJson])
  VALUES (?,?,?,?,?,?,1,?);
END
"""

    conn, cursor = get_cursor()
    try:
        cursor.execute(
            upsert_sql,
            (
                use_uid,                                # UPDATE check
                name, source, original, uploaded, row_count, data_json, use_uid,  # UPDATE set
                use_uid, name, source, original, uploaded, row_count, data_json   # INSERT values
            ),
        )
        conn.commit()
        return True, use_uid, None
    except Exception as e:
        return False, use_uid, str(e)
    finally:
        cursor.close()
        conn.close()

# ---------- routes ----------
@uploads_bp.route("/uploads", methods=["GET"])
def list_uploads():
    q_date = request.args.get("date")
    sort = (request.args.get("sort") or "desc").lower()
    include_deleted = (request.args.get("includeDeleted") or "false").lower() == "true"

    where = []
    params = []

    if not include_deleted:
        where.append("[IsDeleted] = 0")

    if q_date:
        try:
            d = datetime.fromisoformat(q_date)
        except ValueError:
            return jsonify({"error": "date must be YYYY-MM-DD"}), 400
        where.append("[UploadedAt] >= ? AND [UploadedAt] < DATEADD(day, 1, ?)")
        params += [d, d]

    order = "ASC" if sort == "asc" else "DESC"
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    sql = f"""
      SELECT [UploadId],[Name],[Source],[Original],[UploadedAt],[RowCount],[IsSaved],[DataJson]
      FROM dbo.Uploads
      {where_sql}
      ORDER BY [UploadedAt] {order}
    """

    conn, cursor = get_cursor()
    try:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        out = []
        for r in rows:
            item = rowify(cursor, r)
            if isinstance(item.get("UploadedAt"), datetime):
                item["UploadedAt"] = item["UploadedAt"].isoformat()
            try:
                item["DataJson"] = json.loads(item["DataJson"])
            except Exception:
                pass
            out.append(item)
        return jsonify(out)
    finally:
        cursor.close()
        conn.close()

@uploads_bp.route("/uploads/<uid>", methods=["GET"])
def get_upload(uid):
    sql = """
      SELECT [UploadId],[Name],[Source],[Original],[UploadedAt],[RowCount],[IsSaved],[DataJson]
      FROM dbo.Uploads
      WHERE [UploadId] = ? AND [IsDeleted] = 0
    """
    conn, cursor = get_cursor()
    try:
        cursor.execute(sql, (uid,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "not found"}), 404
        item = rowify(cursor, row)
        if isinstance(item.get("UploadedAt"), datetime):
            item["UploadedAt"] = item["UploadedAt"].isoformat()
        try:
            item["DataJson"] = json.loads(item["DataJson"])
        except Exception:
            pass
        return jsonify(item)
    finally:
        cursor.close()
        conn.close()

@uploads_bp.route("/uploads", methods=["POST"])
def upsert_upload():
    """
    Body:
    {
      "id": "<guid>", "name": "...", "source": "csv|google-sheet",
      "original": "...", "uploadedAt": "ISO", "rowCount": 123, "data": [ ... ]
    }
    """
    body = request.get_json(silent=True) or {}
    uid_in = str(body.get("id", "")).strip()
    uid = uid_in if is_guid(uid_in) else str(uuid4())

    ok, final_id, err = _do_upsert(uid, body)
    if not ok:
        return jsonify({"error": err}), 400
    return jsonify({"ok": True, "id": final_id})

@uploads_bp.route("/uploads/<uid>", methods=["PUT"])
def update_upload(uid):
    """Update or insert an uploaded dataset entry (UPSERT by UID)."""
    body = request.get_json(silent=True) or {}

    # Validate required fields
    uid_final = uid if is_guid(uid) else str(uuid4())
    required = ["name", "source", "uploadedAt", "data"]
    missing = [k for k in required if k not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Extract data
    name = body["name"]
    source = body["source"]
    original = body.get("original")
    uploaded = parse_iso_dt(body["uploadedAt"])
    data = body["data"]
    row_count = int(body.get("rowCount", len(data) if isinstance(data, list) else 0) or 0)
    data_json = json.dumps(data, ensure_ascii=False)

    # SQL UPSERT logic
    upsert_sql = """
    IF EXISTS (SELECT 1 FROM dbo.Uploads WHERE [UploadId] = ?)
    BEGIN
      UPDATE dbo.Uploads
         SET [Name] = ?, [Source] = ?, [Original] = ?, [UploadedAt] = ?, 
             [RowCount] = ?, [IsSaved] = 1, [DataJson] = ?, [IsDeleted] = 0
       WHERE [UploadId] = ?;
    END
    ELSE
    BEGIN
      INSERT dbo.Uploads ([UploadId],[Name],[Source],[Original],[UploadedAt],
                          [RowCount],[IsSaved],[DataJson])
      VALUES (?,?,?,?,?,?,1,?);
    END
    """

    # Execute upsert
    conn, cursor = get_cursor()
    try:
        cursor.execute(
            upsert_sql,
            (
                uid_final,  # UPDATE check
                name, source, original, uploaded, row_count, data_json, uid_final,  # UPDATE set
                uid_final, name, source, original, uploaded, row_count, data_json   # INSERT values
            ),
        )
        conn.commit()
        return jsonify({"ok": True, "id": uid_final}), 200
    except Exception as e:
        # Minimal log (safe for prod)
        print(f"[ERROR] PUT /api/uploads/{uid_final}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()



@uploads_bp.route("/uploads", methods=["DELETE"])
def delete_uploads():
    """
    ?ids=guid1,guid2,...
    Soft delete (IsDeleted = 1).
    """
    ids_str = (request.args.get("ids") or "").strip()
    if not ids_str:
        return jsonify({"error": "ids query param is required"}), 400

    raw_ids = [s.strip() for s in ids_str.split(",") if s.strip()]
    ids = [s for s in raw_ids if is_guid(s)]
    if not ids:
        return jsonify({"error": "no valid guid ids"}), 400

    placeholders = ",".join(["?"] * len(ids))
    sql = f"UPDATE dbo.Uploads SET [IsDeleted] = 1 WHERE [UploadId] IN ({placeholders})"

    conn, cursor = get_cursor()
    try:
        cursor.execute(sql, ids)
        conn.commit()
        return jsonify({"ok": True, "deleted": len(ids)})
    finally:
        cursor.close()
        conn.close()
