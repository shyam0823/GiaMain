from flask import Blueprint, request, jsonify
from Backend.app.database import get_cursor
from datetime import datetime, date

patients_bp = Blueprint('patients', __name__)

# ---------------------------
# Helpers
# ---------------------------
def _parse_dob(dob_str):
    if not dob_str:
        return None
    try:
        if "-" in dob_str:               # YYYY-MM-DD
            return datetime.strptime(dob_str, "%Y-%m-%d").date()
        if "/" in dob_str:               # MM/DD/YYYY
            return datetime.strptime(dob_str, "%m/%d/%Y").date()
    except ValueError:
        return "INVALID"
    return None


def _normalize_phone(p):
    return "".join(ch for ch in (p or "") if ch.isdigit())


def _fmt_dt(d):
    if isinstance(d, datetime):
        return d.strftime("%m/%d/%Y, %I:%M %p")
    if isinstance(d, date):
        return d.strftime("%m/%d/%Y")
    return d

# ---------------------------
# GET all patients
# ---------------------------
@patients_bp.route('/patients', methods=['GET'])
def get_patients():
    conn, cursor = get_cursor()
    try:
        cursor.execute("""
            SELECT id, first_name, last_name, email, phone, dob, created_on
            FROM patients
        """)
        rows = cursor.fetchall()
        patients = []
        for row in rows:
            patients.append({
                "id": row[0],
                "first_name": row[1],
                "last_name": row[2],
                "email": row[3],
                "phone": row[4],
                "dob": _fmt_dt(row[5]),
                "created_on": _fmt_dt(row[6]),
            })
        return jsonify(patients)
    finally:
        conn.close()

# ---------------------------
# CREATE patient
# ---------------------------
@patients_bp.route('/patients', methods=['POST'])
def create_patient():
    data = request.json or {}
    conn, cursor = get_cursor()
    try:
        dob = _parse_dob(data.get("dob"))
        if dob == "INVALID":
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD or MM/DD/YYYY"}), 400

        #Insert and return ID (gender removed)
        cursor.execute("""
            INSERT INTO patients (first_name, last_name, email, phone, dob, created_on)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            (data.get("first_name") or "").strip(),
            (data.get("last_name") or "").strip(),
            (data.get("email") or "").strip(),
            _normalize_phone(data.get("phone")),
            dob,
            datetime.utcnow()
        ))
        new_id = cursor.fetchone()[0]
        conn.commit()

        cursor.execute("""
            SELECT id, first_name, last_name, email, phone, dob, created_on
              FROM patients WHERE id = ?
        """, (new_id,))
        row = cursor.fetchone()
        patient = {
            "id": row[0],
            "first_name": row[1],
            "last_name": row[2],
            "email": row[3],
            "phone": row[4],
            "dob": _fmt_dt(row[5]),
            "created_on": _fmt_dt(row[6]),
        }
        return jsonify(patient), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ---------------------------
# UPDATE patient (also syncs USERS)
# ---------------------------
@patients_bp.route('/patients/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    data = request.json or {}
    conn, cursor = get_cursor()
    try:
        dob = _parse_dob(data.get("dob"))
        if dob == "INVALID":
            return jsonify({"error": "Invalid date format"}), 400

        first_name = (data.get("first_name") or "").strip()
        last_name  = (data.get("last_name") or "").strip()
        email      = (data.get("email") or "").strip()
        phone      = _normalize_phone(data.get("phone"))

        # 1) Update PATIENTS (gender removed)
        cursor.execute("""
            UPDATE patients
               SET first_name = ?, last_name = ?, email = ?, phone = ?, dob = ?
             WHERE id = ?
        """, (first_name, last_name, email, phone, dob, patient_id))

        # 2) Sync USERS (match by email OR phone) — gender removed
        cursor.execute("""
            UPDATE users
               SET first_name = ?, last_name = ?, email = ?, mobile_phone = ?
             WHERE email = ? OR mobile_phone = ?
        """, (first_name, last_name, email, phone, email, phone))

        conn.commit()

        # Return fresh row
        cursor.execute("""
            SELECT id, first_name, last_name, email, phone, dob, created_on
              FROM patients WHERE id = ?
        """, (patient_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Patient not found after update"}), 404

        patient = {
            "id": row[0],
            "first_name": row[1],
            "last_name": row[2],
            "email": row[3],
            "phone": row[4],
            "dob": _fmt_dt(row[5]),
            "created_on": _fmt_dt(row[6]),
        }
        return jsonify(patient)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ---------------------------
# GET single patient
# ---------------------------
@patients_bp.route('/patients/<int:patient_id>', methods=['GET'])
def get_patient(patient_id):
    conn, cursor = get_cursor()
    try:
        cursor.execute("""
            SELECT id, first_name, last_name, email, phone, dob, created_on
              FROM patients WHERE id = ?
        """, (patient_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Patient not found"}), 404

        patient = {
            "id": row[0],
            "first_name": row[1],
            "last_name": row[2],
            "email": row[3],
            "phone": row[4],
            "dob": _fmt_dt(row[5]),
            "created_on": _fmt_dt(row[6]),
        }
        return jsonify(patient)
    finally:
        conn.close()

# ---------------------------
# DELETE patient
# ---------------------------
@patients_bp.route('/patients/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    conn, cursor = get_cursor()
    try:
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        conn.commit()
        return jsonify({"message": "Patient deleted successfully"})
    finally:
        conn.close()
