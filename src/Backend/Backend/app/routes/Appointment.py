from flask import Flask, request, jsonify, Blueprint
import pyodbc
import datetime
from app.database import get_cursor

Appointment_bp = Blueprint('Appointment', __name__)
app = Flask(__name__)

# ---------------------- Utility ----------------------

def fetch_all(query, params=None):
    """Helper to fetch rows from DB and return as list of dicts"""
    conn, cursor = get_cursor()
    try:
        cursor.execute(query, params or [])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()

#Helper: parse and normalize date correctly (no timezone shift)
def parse_local_date(date_str):
    """
    Converts 'YYYY-MM-DD' or 'MM/DD/YYYY' to a Python date (no UTC shift).
    Ensures SQL Server saves the same calendar date the user picked.
    """
    if not date_str:
        return None
    try:
        # Try ISO format (from input type='date')
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        try:
            # Try MM/DD/YYYY
            return datetime.datetime.strptime(date_str, "%m/%d/%Y").date()
        except ValueError:
            raise ValueError(f"Invalid date format: {date_str}")

#Helper: parse and normalize time
def parse_time(time_str):
    """Ensure time is stored as HH:MM:SS"""
    if not time_str:
        return None
    try:
        if len(time_str.split(":")) == 2:
            return datetime.datetime.strptime(time_str, "%H:%M").time()
        return datetime.datetime.strptime(time_str, "%H:%M:%S").time()
    except Exception:
        raise ValueError(f"Invalid time format: {time_str}")

# ---------------------- ROUTES ----------------------
#Add new appointment (with slot-level uniqueness)
@Appointment_bp.route('/book_appointment', methods=['POST'])
def book_appointment():
    try:
        data = request.get_json() or {}

        patient_name         = (data.get('patientName') or '').strip()
        patient_email        = (data.get('patientEmail') or '').strip().lower()
        phone_number         = (data.get('phoneNumber') or '').strip()
        appointment_date_raw = (data.get('appointmentDate') or '').strip()
        appointment_time_raw = (data.get('appointmentTime') or '').strip()
        specialist           = (data.get('specialist') or '').strip()

        # ---- Validate input ----
        if not all([patient_name, patient_email, phone_number,
                    appointment_date_raw, appointment_time_raw, specialist]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Parse date/time safely (no timezone shift)
        appointment_date = parse_local_date(appointment_date_raw)
        appointment_time = parse_time(appointment_time_raw)
        if not appointment_date or not appointment_time:
            return jsonify({'error': 'Invalid date or time format'}), 400

        # ---- Open DB ----
        conn, cursor = get_cursor()

        # ---- Uniqueness: block slot already taken for this specialist ----
        # If you want clinic-wide uniqueness (ignore specialist), drop the last line in WHERE.
        cursor.execute("""
            SELECT COUNT(1)
            FROM Appointments
            WHERE AppointmentDate = ?
              AND AppointmentTime = ?
              AND LOWER(ISNULL(Specialist,'')) = LOWER(?)
        """, (appointment_date, appointment_time, specialist))
        (slot_count,) = cursor.fetchone()

        if slot_count > 0:
            cursor.close(); conn.close()
            # Friendly message with the exact slot
            return jsonify({
                'error': f"No availability for {appointment_time.strftime('%H:%M')} on {appointment_date} ({specialist})."
            }), 409  # Conflict

        # (Optional) Also prevent same-patient duplicates on that slot
        cursor.execute("""
            SELECT COUNT(1)
            FROM Appointments
            WHERE AppointmentDate = ?
              AND AppointmentTime = ?
              AND LOWER(ISNULL(Specialist,'')) = LOWER(?)
              AND LOWER(PatientEmail) = LOWER(?)
        """, (appointment_date, appointment_time, specialist, patient_email))
        (patient_dup_count,) = cursor.fetchone()

        if patient_dup_count > 0:
            cursor.close(); conn.close()
            return jsonify({
                'error': 'You already have an appointment at that time.'
            }), 409

        # ---- Insert appointment ----
        try:
            cursor.execute("""
                INSERT INTO Appointments 
                (PatientName, PatientEmail, PhoneNumber,
                 AppointmentDate, AppointmentTime, Specialist,
                 Status, SubmittedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                patient_name,
                patient_email,
                phone_number,
                appointment_date,     # exact local date
                appointment_time,     # exact local time
                specialist,
                "Pending",            # default status
                datetime.datetime.now()
            ))
            conn.commit()
        except pyodbc.Error as ex:
            # If a unique index exists in DB, catch it here too (race-condition safe)
            msg = str(ex)
            if "2627" in msg or "2601" in msg:  # unique constraint violations
                cursor.close(); conn.close()
                return jsonify({'error': 'No availability for that slot.'}), 409
            raise

        cursor.close(); conn.close()
        return jsonify({'message': 'Appointment booked successfully!'}), 201

    except ValueError as ve:
        print("❌ ValueError:", ve)
        return jsonify({'error': str(ve)}), 400
    except pyodbc.Error as ex:
        print("❌ Database error:", ex)
        return jsonify({'error': f'Database error: {ex}'}), 500
    except Exception as e:
        print("❌ Exception:", e)
        return jsonify({'error': str(e)}), 500

    
@Appointment_bp.route('/appointment', methods=['GET'])
def get_appointment():
    try:
        name  = (request.args.get('name')  or '').strip()
        email = (request.args.get('email') or '').strip().lower()
        phone = (request.args.get('phone') or '').strip()
        upcoming = request.args.get('upcoming', '1').strip() != '0'

        conn, cursor = get_cursor()

        clauses = []
        params = []

        # Build an OR group from whatever was provided
        or_parts = []
        if email:
            or_parts.append("LOWER(PatientEmail) = LOWER(?)")
            params.append(email)
        if phone:
            or_parts.append("PhoneNumber = ?")
            params.append(phone)
        if name:
            # allow exact match OR starts-with to be forgiving
            or_parts.append("(LOWER(PatientName) = LOWER(?) OR LOWER(PatientName) LIKE LOWER(?))")
            params.extend([name, name + '%'])

        where_sql = ""
        if or_parts:
            where_sql = "WHERE (" + " OR ".join(or_parts) + ")"

        # Only future appointments if requested
        if upcoming:
            where_sql += (" AND " if where_sql else "WHERE ") + \
                "(CAST(AppointmentDate AS DATETIME) + CAST(AppointmentTime AS DATETIME)) >= GETDATE()"

        sql = f"""
            SELECT AppointmentID, PatientName, PatientEmail, PhoneNumber,
                   AppointmentDate, AppointmentTime, Specialist, Status, SubmittedAt
              FROM Appointments
              {where_sql}
            ORDER BY AppointmentDate ASC, AppointmentTime ASC
        """

        cursor.execute(sql, params)
        cols = [c[0] for c in cursor.description]
        rows = cursor.fetchall()

        out = []
        for row in rows:
            r = dict(zip(cols, row))
            # serialize
            if isinstance(r.get("AppointmentDate"), (datetime.date, datetime.datetime)):
                r["AppointmentDate"] = r["AppointmentDate"].strftime("%Y-%m-%d")
            if isinstance(r.get("AppointmentTime"), datetime.time):
                r["AppointmentTime"] = r["AppointmentTime"].strftime("%H:%M:%S")
            if isinstance(r.get("SubmittedAt"), datetime.datetime):
                r["SubmittedAt"] = r["SubmittedAt"].strftime("%Y-%m-%d %H:%M:%S")
            # normalize
            r["id"]     = r.pop("AppointmentID", None)
            r["date"]   = r["AppointmentDate"]
            r["time"]   = r["AppointmentTime"]
            r["doctor"] = r.get("Specialist") or ""
            r["status"] = r.get("Status") or "Pending"
            out.append(r)

        cursor.close(); conn.close()
        return jsonify(out), 200

    except pyodbc.Error as ex:
        return jsonify({"error": f"Database error: {ex}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500



#Postpone (reschedule) an appointment
@Appointment_bp.route('/appointment/<int:appointment_id>/postpone', methods=['PUT'])
def postpone_appointment(appointment_id):
    try:
        data = request.get_json() or {}

        new_date_raw = data.get('appointmentDate')   # 'YYYY-MM-DD' or 'MM/DD/YYYY'
        new_time_raw = data.get('appointmentTime')   # 'HH:MM' or 'HH:MM:SS'
        reason       = data.get('reason')            # optional

        if not new_date_raw or not new_time_raw:
            return jsonify({'error': 'appointmentDate and appointmentTime are required'}), 400

        # Normalize using your helpers
        new_date = parse_local_date(new_date_raw)
        new_time = parse_time(new_time_raw)

        conn, cursor = get_cursor()

        # Ensure the record exists
        cursor.execute("SELECT COUNT(1) FROM Appointments WHERE AppointmentID = ?", (appointment_id,))
        if cursor.fetchone()[0] == 0:
            cursor.close(); conn.close()
            return jsonify({'error': f'Appointment {appointment_id} not found'}), 404

        # Update date/time (keep Status as-is; set to Pending if NULL)
        cursor.execute("""
            UPDATE Appointments
               SET AppointmentDate = ?,
                   AppointmentTime = ?,
                   Status = COALESCE(Status, 'Pending')
             WHERE AppointmentID = ?
        """, (new_date, new_time, appointment_id))

        # (Optional) if you have a Notes column, you could append the reason:
        # cursor.execute("""
        #     UPDATE Appointments
        #        SET Notes = CONCAT(COALESCE(Notes, ''), ?)
        #      WHERE AppointmentID = ?
        # """, (f"\n[Postponed {datetime.datetime.now():%Y-%m-%d %H:%M}] {reason or ''}", appointment_id))

        conn.commit()

        # Return fresh record in the same shape you use elsewhere
        cursor.execute("""
            SELECT AppointmentID, PatientName, PatientEmail, PhoneNumber,
                   AppointmentDate, AppointmentTime, Specialist, Status, SubmittedAt
              FROM Appointments
             WHERE AppointmentID = ?
        """, (appointment_id,))
        row = cursor.fetchone()
        columns = [c[0] for c in cursor.description] if row else []
        record = dict(zip(columns, row)) if row else None

        cursor.close(); conn.close()

        if not record:
            return jsonify({'error': 'Updated record not found'}), 404

        # Serialize for JSON
        if isinstance(record.get("AppointmentDate"), (datetime.date, datetime.datetime)):
            record["AppointmentDate"] = record["AppointmentDate"].strftime("%Y-%m-%d")
        if isinstance(record.get("AppointmentTime"), datetime.time):
            record["AppointmentTime"] = record["AppointmentTime"].strftime("%H:%M:%S")
        if isinstance(record.get("SubmittedAt"), datetime.datetime):
            record["SubmittedAt"] = record["SubmittedAt"].strftime("%Y-%m-%d %H:%M:%S")

        record["id"] = record.pop("AppointmentID", None)
        record["purpose"] = "Regular appointment"
        if not record.get("Status"):
            record["Status"] = "Pending"

        return jsonify(record), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except pyodbc.Error as ex:
        return jsonify({'error': f'Database error: {ex}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500



#Cancel appointment (hard delete)
@Appointment_bp.route('/appointment/<int:appointment_id>', methods=['DELETE'])
def cancel_appointment(appointment_id):
    try:
        conn, cursor = get_cursor()
        cursor.execute("DELETE FROM Appointments WHERE AppointmentID = ?", (appointment_id,))
        rows = cursor.rowcount
        conn.commit()
        cursor.close(); conn.close()

        if rows == 0:
            return jsonify({'error': f'Appointment {appointment_id} not found'}), 404

        return jsonify({'ok': True, 'deleted': appointment_id}), 200

    except pyodbc.Error as ex:
        return jsonify({'error': f'Database error: {ex}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
#Fetch appointments by patient name or ID
@Appointment_bp.route('/customer/appointment/<int:patient_id>', methods=['GET'])
def get_customer_appointments(patient_id):
    """
    Fetch all appointments for a given patient_id or name.
    """
    try:
        conn, cursor = get_cursor()

        # Try matching either by ID or by name/email if you store those.
        sql_query = """
            SELECT AppointmentID, PatientName, PatientEmail, PhoneNumber,
                   AppointmentDate, AppointmentTime, Specialist, Status, SubmittedAt
              FROM Appointments
             WHERE PatientID = ? OR AppointmentEmail IN (
                   SELECT Email FROM Patients WHERE PatientID = ?
             )
             ORDER BY AppointmentDate ASC, AppointmentTime ASC
        """

        # If you don't store PatientID in your Appointments table yet,
        # use this simpler version instead:
        # sql_query = """
        #     SELECT AppointmentID, PatientName, PatientEmail, PhoneNumber,
        #            AppointmentDate, AppointmentTime, Specialist, Status, SubmittedAt
        #       FROM Appointments
        #      WHERE PatientEmail IN (
        #            SELECT Email FROM Patients WHERE PatientID = ?
        #      )
        #      ORDER BY AppointmentDate ASC, AppointmentTime ASC
        # """

        cursor.execute(sql_query, (patient_id, patient_id))
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

        if not rows:
            cursor.close()
            conn.close()
            return jsonify([]), 200  # no appointments yet

        appointments = []
        for row in rows:
            record = dict(zip(columns, row))

            if isinstance(record.get("AppointmentDate"), (datetime.date, datetime.datetime)):
                record["AppointmentDate"] = record["AppointmentDate"].strftime("%Y-%m-%d")
            if isinstance(record.get("AppointmentTime"), datetime.time):
                record["AppointmentTime"] = record["AppointmentTime"].strftime("%H:%M:%S")
            if isinstance(record.get("SubmittedAt"), datetime.datetime):
                record["SubmittedAt"] = record["SubmittedAt"].strftime("%Y-%m-%d %H:%M:%S")

            record["id"] = record.pop("AppointmentID", None)
            record["date"] = record["AppointmentDate"]
            record["time"] = record["AppointmentTime"]
            record["doctor"] = record["Specialist"]
            record["status"] = record["Status"] or "Pending"
            appointments.append(record)

        cursor.close()
        conn.close()

        return jsonify(appointments), 200

    except Exception as e:
        print("❌ Error fetching customer appointments:", e)
        return jsonify({'error': str(e)}), 500
