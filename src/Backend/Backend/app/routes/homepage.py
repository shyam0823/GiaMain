from flask import Blueprint, jsonify, request, url_for, redirect
from app.database import get_cursor
from datetime import datetime, date
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client
import os
import traceback
from ..database import get_cursor
 

homepage_bp = Blueprint("homepage", __name__)

# ------------------ Helper Functions ------------------ #
def _normalize_value(v):
    """Convert DB datetime/date objects to YYYY-MM-DD strings for frontend."""
    try:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d")
        if isinstance(v, date):
            return v.strftime("%Y-%m-%d")
    except Exception:
        pass
    return v


def _sanitize_params(params):
    """Ensure SQL params are safe: convert '24.1' → 24 where possible."""
    safe = []
    for p in params or []:
        if isinstance(p, str):
            try:
                num = float(p)
                if num.is_integer():
                    safe.append(int(num))
                    continue
            except Exception:
                pass
        safe.append(p)
    return tuple(safe)


def fetch_all(query, params=None):
    conn, cursor = get_cursor()
    try:
        safe_params = _sanitize_params(params)
        cursor.execute(query, safe_params)
        columns = [col[0] for col in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        results = []
        for row in rows:
            mapped = {}
            for col_idx, col_name in enumerate(columns):
                mapped[col_name] = _normalize_value(row[col_idx])
            results.append(mapped)
        return results
    finally:
        cursor.close()
        conn.close()


def execute_query(query, params=None, commit=False):
    conn, cursor = get_cursor()
    try:
        safe_params = _sanitize_params(params)
        cursor.execute(query, safe_params)
        if commit:
            conn.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        conn.close()


# ------------------ Routes ------------------ #

#GET /home/data (flat rows for dashboard, with completion % using latest submission)
@homepage_bp.route("/home/data", methods=["GET"])
def get_home_data_flat():
    query = """
        WITH LatestSubmission AS (
            SELECT
                submission_id,
                form_id,
                patient_id,
                ROW_NUMBER() OVER (PARTITION BY form_id, patient_id ORDER BY submitted_at DESC) AS rn
            FROM FormSubmissions
        )
        SELECT 
            p.id AS patient_id,
            p.first_name + ' ' + p.last_name AS patient_name,
            f.form_id,
            f.form_name,
            fs.status,
            fs.due_date,
            fs.email_sent,
            fs.sms_sent,
            fs.created AS form_created,
            fs.location,
            CAST(
                (100.0 * COUNT(
                    CASE 
                        WHEN fr.response_value IS NOT NULL AND LTRIM(RTRIM(fr.response_value)) <> '' 
                        THEN 1 END
                )) / NULLIF(COUNT(ff.field_id), 0) AS DECIMAL(5,2)
            ) AS completion_percentage
        FROM patients p
        LEFT JOIN form_status fs 
            ON p.id = fs.patient_id
        LEFT JOIN forms f 
            ON fs.form_id = f.form_id
        LEFT JOIN LatestSubmission ls 
            ON ls.form_id = f.form_id AND ls.patient_id = p.id AND ls.rn = 1
        LEFT JOIN FormFields ff 
            ON ff.form_id = f.form_id
        LEFT JOIN FormResponses fr 
            ON fr.submission_id = ls.submission_id AND fr.field_id = ff.field_id
        GROUP BY 
            p.id, p.first_name, p.last_name,
            f.form_id, f.form_name,
            fs.status, fs.due_date, fs.email_sent, fs.sms_sent, fs.created, fs.location
        ORDER BY fs.created DESC, p.created_on DESC;
    """
    results = fetch_all(query)

    data = []
    for row in results:
        data.append({
            "patientId": row.get("patient_id"),
            "patient": row.get("patient_name"),
            "formId": row.get("form_id"),
            "form": row.get("form_name") or "No Form Assigned",
            "status": row.get("status") or "Not Started",
            "dueDate": row.get("due_date"),
            "emailSent": row.get("email_sent") or "—",
            "smsSent": row.get("sms_sent") or "—",
            "created": row.get("form_created"),
            "location": row.get("location"),
            "completion": float(row.get("completion_percentage") or 0)
        })

    return jsonify(data)


#GET /home/data_grouped (patient -> forms[])
@homepage_bp.route("/home/data_grouped", methods=["GET"])
def get_home_data_grouped():
    query = """
        WITH LatestSubmission AS (
            SELECT
                submission_id,
                form_id,
                patient_id,
                ROW_NUMBER() OVER (PARTITION BY form_id, patient_id ORDER BY submitted_at DESC) AS rn
            FROM FormSubmissions
        )
        SELECT
            p.id AS patient_id,
            p.first_name + ' ' + p.last_name AS patient_name,
            p.created_on,
            f.form_id,
            f.form_name,
            fs.status,
            fs.due_date,
            fs.email_sent,
            fs.sms_sent,
            fs.created AS form_created,
            fs.location,
            COUNT(ff.field_id) AS total_fields,
            COUNT(
                CASE
                    WHEN fr.response_value IS NOT NULL AND LTRIM(RTRIM(fr.response_value)) <> ''
                    THEN 1 END
            ) AS answered_fields,
            CAST(
                (100.0 * COUNT(
                    CASE
                        WHEN fr.response_value IS NOT NULL AND LTRIM(RTRIM(fr.response_value)) <> ''
                        THEN 1 END
                )) / NULLIF(COUNT(ff.field_id), 0) AS DECIMAL(5,2)
            ) AS completion_percentage
        FROM patients p
        LEFT JOIN form_status fs ON p.id = fs.patient_id
        LEFT JOIN forms f ON fs.form_id = f.form_id
        LEFT JOIN LatestSubmission ls ON ls.form_id = f.form_id AND ls.patient_id = p.id AND ls.rn = 1
        LEFT JOIN FormFields ff ON ff.form_id = f.form_id
        LEFT JOIN FormResponses fr ON fr.submission_id = ls.submission_id AND fr.field_id = ff.field_id
        GROUP BY
            p.id, p.first_name, p.last_name, p.created_on,
            f.form_id, f.form_name,
            fs.status, fs.due_date, fs.email_sent, fs.sms_sent, fs.created, fs.location
        ORDER BY p.created_on DESC;
    """
    results = fetch_all(query)

    patients_map = {}
    for row in results:
        pid = row.get("patient_id")
        if pid not in patients_map:
            patients_map[pid] = {
                "patientId": pid,
                "patient": row.get("patient_name"),
                "createdOn": row.get("created_on"),
                "forms": []
            }

        if row.get("form_id"):
            patients_map[pid]["forms"].append({
                "formId": row.get("form_id"),
                "form": row.get("form_name"),
                "status": row.get("status") or "Not Assigned",
                "dueDate": row.get("due_date"),
                "emailSent": row.get("email_sent"),
                "smsSent": row.get("sms_sent"),
                "created": row.get("form_created"),
                "location": row.get("location"),
                "completion": float(row.get("completion_percentage") or 0)
            })

    return jsonify(list(patients_map.values()))


@homepage_bp.route("/home/forms", methods=["GET"])
def get_forms():
    try:
        conn, cursor = get_cursor()
        cursor.execute("SELECT form_id AS id, form_name AS title, form_url FROM forms ORDER BY form_name ASC")
        rows = cursor.fetchall()
        # Convert to list of dicts
        templates = [{"id": r[0], "title": r[1], "form_url": r[2]} for r in rows]
        return jsonify(templates), 200
    except Exception as e:
        print("Error fetching forms:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
 
@homepage_bp.route("/home/forms", methods=["POST"])
def create_form():
    data = request.json
    name = data.get("name")
    fields = data.get("fields", [])
 
    if not name or not fields:
        return jsonify({"error": "Template name and fields required"}), 400
 
    conn, cursor = get_cursor()
    try:
        # Insert form and get new form_id
        cursor.execute("""
            INSERT INTO Forms (form_name)
            OUTPUT INSERTED.form_id
            VALUES (?);
        """, (name,))
        new_form_id = int(cursor.fetchone()[0])
        print("New form_id:", new_form_id)
 
        # Insert fields
        for index, field in enumerate(fields, start=1):
            field_id = f"{new_form_id}.{index}"
            field_label = field.get("label")  # Ensure this is not None
            field_type = field.get("type")   # Optional, can be None
 
            if not field_label:
                raise ValueError(f"Field label is required for field {index}")
 
            cursor.execute(
                "INSERT INTO FormFields (field_id, form_id, field_label, field_type) VALUES (?, ?, ?, ?)",
                (field_id, new_form_id, field_label, field_type)
            )
 
        conn.commit()
        return jsonify({
            "message": "Template and fields saved successfully",
            "form_id": new_form_id
        }), 200
 
    except Exception as e:
        conn.rollback()
        print("Error saving template:", e)
        return jsonify({"error": str(e)}), 500
 
    finally:
        cursor.close()
        conn.close()

#POST /home/assign_forms
@homepage_bp.route("/home/assign_forms", methods=["POST"])
def assign_forms():
    data = request.json
    patient_id = data.get("patientId")
    form_ids = data.get("formIds", [])

    if not patient_id or not form_ids:
        return jsonify({"error": "Missing patientId or formIds"}), 400

    for fid in form_ids:
        execute_query(
            """
            MERGE form_status AS target
            USING (SELECT ? AS patient_id, ? AS form_id) AS source
            ON (target.patient_id = source.patient_id AND target.form_id = source.form_id)
            WHEN MATCHED THEN
                UPDATE SET 
                    status = ?, 
                    due_date = ?, 
                    location = ?
            WHEN NOT MATCHED THEN
                INSERT (patient_id, form_id, status, due_date, created, location)
                VALUES (source.patient_id, source.form_id, ?, ?, GETDATE(), ?);
            """,
            (
                patient_id,
                fid,
                "Active",
                data.get("dueDate"),
                data.get("location", "GIA HR"),
                "Active",
                data.get("dueDate"),
                data.get("location", "GIA HR"),
            ),
            commit=True,
        )

    return jsonify({"message": "Forms assigned successfully"})


#GET /home/forms/<int:form_id> (latest submission only; supports ?patientId=)
@homepage_bp.route("/home/forms/<int:form_id>", methods=["GET"])
def get_form_details(form_id):
    patient_id = request.args.get("patientId")

    query = """
        WITH LatestSubmission AS (
            SELECT
                submission_id,
                form_id,
                patient_id,
                status,
                submitted_at,
                ROW_NUMBER() OVER (PARTITION BY form_id, patient_id ORDER BY submitted_at DESC) AS rn
            FROM FormSubmissions
        )
        SELECT 
            f.form_id AS id,
            f.form_name AS title,
            fs.status,
            fs.due_date,
            fs.location,
            fs.patient_id AS patient_id,
            p.first_name,
            p.last_name,
            p.email,
            p.phone,
            p.dob,
            ls.submission_id,
            ls.submitted_at,
            ls.status AS submission_status
        FROM forms f
        LEFT JOIN form_status fs ON f.form_id = fs.form_id
        LEFT JOIN patients p ON fs.patient_id = p.id
        LEFT JOIN LatestSubmission ls 
            ON f.form_id = ls.form_id AND p.id = ls.patient_id AND ls.rn = 1
        WHERE f.form_id = ?
    """
    params = [form_id]
    if patient_id:
        query += " AND p.id = ?"
        params.append(patient_id)

    rows = fetch_all(query, params)
    if not rows:
        return jsonify({"error": "Form not found"}), 404

    form_data = rows[0]
    submission_id = form_data.get("submission_id")

    field_query = """
        SELECT 
            ff.field_id,
            ff.form_id,
            ff.field_label,
            ff.field_type,
            ff.is_required,
            fr.response_value
        FROM FormFields ff
        LEFT JOIN FormResponses fr 
            ON ff.field_id = fr.field_id 
            AND fr.submission_id = ?
        WHERE ff.form_id = ?
        ORDER BY ff.field_id
    """
    fields = fetch_all(field_query, (submission_id, form_id))

    total_fields = len(fields)
    answered_fields = len([f for f in fields if f.get("response_value") not in (None, "", " ")])
    completion = round((answered_fields / total_fields) * 100, 2) if total_fields > 0 else 0

    return jsonify({
        "formId": form_data.get("id"),
        "title": form_data.get("title"),
        "status": form_data.get("status"),
        "dueDate": form_data.get("due_date"),
        "location": form_data.get("location"),
        "patientId": form_data.get("patient_id"),
        "patientName": f"{form_data.get('first_name') or ''} {form_data.get('last_name') or ''}".strip(),
        "dob": form_data.get("dob"),
        "submissionId": submission_id,
        "submittedAt": form_data.get("submitted_at"),
        "submissionStatus": form_data.get("submission_status"),
        "completion": completion,
        "fields": fields
    })


#GET /home/patient_forms/<patient_id>
@homepage_bp.route("/home/patient_forms/<int:patient_id>", methods=["GET"])
def get_patient_forms(patient_id):
    query = """
        WITH LatestSubmission AS (
            SELECT 
                submission_id,
                form_id,
                patient_id,
                ROW_NUMBER() OVER (PARTITION BY form_id, patient_id ORDER BY submitted_at DESC) AS rn
            FROM FormSubmissions
        )
        SELECT 
            f.form_id,
            f.form_name,
            fs.status,
            fs.due_date,
            fs.location,
            COUNT(ff.field_id) AS total_fields,
            COUNT(
                CASE 
                    WHEN fr.response_value IS NOT NULL AND LTRIM(RTRIM(fr.response_value)) <> '' 
                    THEN 1 END
            ) AS answered_fields,
            CAST(
                (100.0 * COUNT(
                    CASE 
                        WHEN fr.response_value IS NOT NULL AND LTRIM(RTRIM(fr.response_value)) <> '' 
                        THEN 1 END
                )) / NULLIF(COUNT(ff.field_id), 0) AS DECIMAL(5,2)
            ) AS completion_percentage
        FROM forms f
        JOIN form_status fs ON fs.form_id = f.form_id AND fs.patient_id = ?
        LEFT JOIN LatestSubmission ls ON ls.form_id = f.form_id AND ls.patient_id = fs.patient_id AND ls.rn = 1
        LEFT JOIN FormFields ff ON ff.form_id = f.form_id
        LEFT JOIN FormResponses fr ON fr.submission_id = ls.submission_id AND fr.field_id = ff.field_id
        GROUP BY f.form_id, f.form_name, fs.status, fs.due_date, fs.location;
    """
    rows = fetch_all(query, (patient_id,))
    for r in rows:
        r["completion"] = r.get("completion_percentage") or 0
    return jsonify(rows)


#PUT /home/forms/<int:form_id> (update responses + patient info → always latest submission)
@homepage_bp.route("/home/forms/<int:form_id>", methods=["PUT"])
def update_form(form_id):
    try:
        data = {}
        fields = []

        #Handle multipart/form-data
        if request.content_type and request.content_type.startswith("multipart/form-data"):
            data = request.form.to_dict()
            for k, v in data.items():
                fid = str(k).strip()
                fields.append({"field_id": fid, "response_value": v})
        else:
            data = request.get_json(silent=True) or {}
            raw_fields = data.get("fields", [])
            for f in raw_fields:
                fid = str(f.get("field_id")).strip()
                fields.append({"field_id": fid, "response_value": f.get("response_value")})

        form_id = int(float(form_id))

        #Resolve patient_id
        patient_id = request.args.get("patientId") or data.get("patientId")
        if not patient_id or str(patient_id).lower() == "null":
            return jsonify({"error": "Missing patientId"}), 400

        try:
            patient_id = int(float(patient_id))
        except ValueError:
            return jsonify({"error": f"Invalid patientId {patient_id}"}), 400

        status = data.get("status", "Completed")
        due_date = data.get("dueDate")
        location = data.get("location", "GIA HR")

        if due_date:
            try:
                due_date = datetime.strptime(due_date, "%Y-%m-%d").strftime("%Y-%m-%d")
            except Exception:
                due_date = None

        #Ensure latest submission
        submission_id = None
        latest = fetch_all(
            """
            WITH LatestSubmission AS (
                SELECT submission_id, form_id, patient_id,
                       ROW_NUMBER() OVER (PARTITION BY form_id, patient_id ORDER BY submitted_at DESC) AS rn
                FROM FormSubmissions
                WHERE form_id = ? AND patient_id = ?
            )
            SELECT submission_id FROM LatestSubmission WHERE rn = 1
            """,
            (form_id, patient_id),
        )

        if latest:
            submission_id = int(latest[0].get("submission_id"))
            execute_query(
                "UPDATE FormSubmissions SET status=?, submitted_at=GETDATE() WHERE submission_id=?",
                (status, submission_id),
                commit=True,
            )
        else:
            execute_query(
                "INSERT INTO FormSubmissions (form_id, patient_id, submitted_at, status) VALUES (?, ?, GETDATE(), ?)",
                (form_id, patient_id, status),
                commit=True,
            )
            new_sub = fetch_all(
                """
                SELECT TOP 1 submission_id 
                FROM FormSubmissions 
                WHERE form_id = ? AND patient_id = ? 
                ORDER BY submitted_at DESC
                """,
                (form_id, patient_id),
            )
            submission_id = int(new_sub[0].get("submission_id"))

        #Save field responses
        for field in fields:
            field_id = str(field.get("field_id")).strip()
            response_value = field.get("response_value")

            exists = fetch_all(
                "SELECT 1 FROM FormFields WHERE field_id = ? AND form_id = ?",
                (field_id, form_id),
            )
            if not exists:
                continue

            check = fetch_all(
                "SELECT response_id FROM FormResponses WHERE submission_id=? AND field_id=?",
                (submission_id, field_id),
            )
            if check:
                execute_query(
                    "UPDATE FormResponses SET response_value=? WHERE response_id=?",
                    (response_value, check[0].get("response_id")),
                    commit=True,
                )
            else:
                execute_query(
                    "INSERT INTO FormResponses (submission_id, field_id, response_value) VALUES (?, ?, ?)",
                    (submission_id, field_id, response_value),
                    commit=True,
                )

        #Recalculate completion
        completion = 0
        comp = fetch_all(
            """
            SELECT 
                COUNT(ff.field_id) AS total_fields,
                COUNT(CASE WHEN fr.response_value IS NOT NULL 
                               AND LTRIM(RTRIM(fr.response_value)) <> '' 
                          THEN 1 END) AS answered_fields
            FROM FormFields ff
            LEFT JOIN FormResponses fr 
                ON fr.field_id = ff.field_id AND fr.submission_id = ?
            WHERE ff.form_id = ?
            """,
            (submission_id, form_id),
        )
        if comp and comp[0].get("total_fields"):
            completion = round(
                (comp[0].get("answered_fields", 0) or 0) / comp[0]["total_fields"] * 100,
                2,
            )

        return jsonify({
            "message": "Form submitted successfully",
            "submissionId": submission_id,
            "completion": completion
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

#send Forms
@homepage_bp.route("/home/send_forms", methods=["POST"])
def send_forms():
    data = request.json or {}
    recipients = data.get("recipients", [])
    forms = data.get("forms", [])
    delivery = data.get("delivery", "patient")  # patient/email, sms, or office

    if not recipients or not forms:
        return jsonify({"error": "Recipients or forms missing"}), 400

    form_ids = [str(f.get("id") or f.get("formId") or f.get("form_id")) for f in forms]
    qr_tokens = {}
    updated_recipients = []

    for rec in recipients:
        patient_id = rec.get("patientId")
        email = rec.get("email")
        name = rec.get("name")
        phone = rec.get("phone")
        loc = rec.get("location", "GIA HR")
        due_in = rec.get("dueDate")
        due_iso = _norm_due(due_in)

        if not patient_id:
            continue

        try:
            patient_id = int(float(patient_id))
        except Exception:
            continue

        # QR token for this patient + forms
        timestamp = int(datetime.now().timestamp())
        ids_segment = ",".join(form_ids)
        qr_token = f"{patient_id}-{ids_segment}-{timestamp}"
        qr_url = url_for("homepage.fill_form_qr", token=qr_token, _external=True)
        qr_tokens[patient_id] = qr_url

        # Ensure record exists
        for fid in form_ids:
            fid_int = int(float(fid))
            rows_updated = execute_query(
                "UPDATE form_status SET qr = ? WHERE patient_id = ? AND form_id = ?",
                (qr_token, patient_id, fid_int),
                commit=True,
            )
            if rows_updated == 0:
                execute_query(
                    """
                    INSERT INTO form_status
                      (patient_id, form_id, status, due_date, qr, created, location)
                    VALUES (?, ?, 'Active', ?, ?, GETDATE(), ?)
                    """,
                    (patient_id, fid_int, due_iso, qr_token, loc),
                    commit=True,
                )

        recipient_log = {"name": name, "emailSent": None, "smsSent": None, "error": None, "hint": None}

        # ---------------- EMAIL DELIVERY ----------------
        if delivery == "patient" and email:
            try:
                html_body = f"""
                <div>
                    <h2>GIA HR</h2>
                    <p>Hello <b>{name}</b>,<br>
                    You have been assigned {len(forms)} forms:</p>
                    <p><a href="{qr_url}">Click here to fill your forms</a></p>
                </div>
                """
                sender_email = os.getenv("SMTP_EMAIL", "vakashyamsundar8@gmail.com")
                sender_password = os.getenv("SMTP_PASS", "jiss tsmp agkr aqdr")

                msg = MIMEMultipart("alternative")
                msg["From"] = sender_email
                msg["To"] = email
                msg["Subject"] = "Forms from GIA HR"
                msg.attach(MIMEText(html_body, "html"))

                with smtplib.SMTP("smtp.gmail.com", 587) as server:
                    server.starttls()
                    server.login(sender_email, sender_password)
                    server.sendmail(sender_email, email, msg.as_string())

                for fid in form_ids:
                    fid_int = int(float(fid))
                    execute_query(
                        """
                        UPDATE form_status
                        SET email_sent = GETDATE(),
                            due_date   = ?,
                            location   = ?,
                            status     = 'Active'
                        WHERE patient_id = ? AND form_id = ?
                        """,
                        (due_iso, loc, patient_id, fid_int),
                        commit=True,
                    )

                recipient_log["emailSent"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            except Exception as e:
                recipient_log["error"] = "EMAIL_FAILED"
                recipient_log["hint"] = str(e)
                print(f"❌ Email failed for {email}: {e}")

        # ---------------- SMS DELIVERY ----------------
        elif delivery == "sms" and phone:
            try:
                # Lazy import Twilio
                try:
                    from twilio.rest import Client
                    from twilio.base.exceptions import TwilioRestException
                except ImportError as e:
                    current_app.logger.error("Twilio not installed: %s", e)
                    abort(500, description="Twilio dependency missing.")

                account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
                auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
                messaging_sid = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")
                from_number = os.getenv("TWILIO_FROM", "+19786198530")

                if not account_sid or not auth_token:
                    abort(500, description="Twilio credentials not configured.")

                message_body = f"""
Hello {name},
You have been assigned {len(forms)} forms by GIA HR.

Open here: {qr_url}
"""
                client = Client(account_sid, auth_token)
                to_number = to_e164(phone)

                send_kwargs = {"body": message_body.strip(), "to": to_number}
                if messaging_sid:
                    send_kwargs["messaging_service_sid"] = messaging_sid
                else:
                    send_kwargs["from_"] = from_number

                msg = client.messages.create(**send_kwargs)
                print("✅ Twilio SID:", msg.sid, "Status:", msg.status)

                for fid in form_ids:
                    fid_int = int(float(fid))
                    execute_query(
                        """
                        UPDATE form_status
                        SET sms_sent = GETDATE(),
                            due_date = ?,
                            location = ?,
                            status = 'Active'
                        WHERE patient_id = ? AND form_id = ?
                        """,
                        (due_iso, loc, patient_id, fid_int),
                        commit=True,
                    )

                recipient_log["smsSent"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            except Exception as e:
                recipient_log["error"] = "SMS_FAILED"
                recipient_log["hint"] = str(e)
                print(f"❌ SMS failed for {phone}: {e}")

        # ---------------- OFFICE DELIVERY ----------------
        elif delivery == "office":
            for fid in form_ids:
                fid_int = int(float(fid))
                execute_query(
                    """
                    UPDATE form_status
                    SET due_date = ?,
                        location = ?,
                        status = 'Active'
                    WHERE patient_id = ? AND form_id = ?
                    """,
                    (due_iso, loc, patient_id, fid_int),
                    commit=True,
                )

        updated_recipients.append(recipient_log)

    return jsonify({
        "message": "Forms processed successfully",
        "qr_tokens": qr_tokens,
        "delivery_method": delivery,
        "recipients": updated_recipients
    })


# ========== QR REDIRECT ==========
@homepage_bp.route("/fill-form/<string:token>", methods=["GET"])
def fill_form_qr(token):
    try:
        parts = token.split("-")
        if len(parts) < 3:
            return "Invalid token", 400

        patient_id = parts[0]
        form_ids = parts[1]

        rows = fetch_all(
            "SELECT 1 FROM form_status WHERE patient_id = ? AND qr = ?",
            (patient_id, token),
        )
        if not rows:
            return "Form not assigned or invalid link", 404

        first_form_id = form_ids.split(",")[0]
        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:5173")

        return redirect(f"{frontend_base}/form-editor/{first_form_id}?patient={patient_id}&forms={form_ids}")
    except Exception as e:
        traceback.print_exc()
        return f"Error: {str(e)}", 500
    
#GET /home/forms/<int:form_id>/fields
@homepage_bp.route("/home/forms/<int:form_id>/fields", methods=["GET"])
def get_form_fields(form_id):
    query = """
        SELECT 
            field_id,
            form_id,
            field_label,
            field_type,
            is_required
        FROM FormFields
        WHERE form_id = ?
        ORDER BY field_id ASC
    """
    rows = fetch_all(query, (form_id,))
    if not rows:
        return jsonify({"error": "No fields found for this form"}), 404
    return jsonify(rows)


#PUT /home/patients/archive
@homepage_bp.route("/home/patients/archive", methods=["PUT"])
def archive_patients():
    data = request.json
    patient_ids = data.get("patientIds", [])
    if not patient_ids:
        return jsonify({"error": "No patientIds provided"}), 400

    placeholders = ",".join(["?"] * len(patient_ids))
    execute_query(
        f"UPDATE form_status SET status = 'Archived' WHERE patient_id IN ({placeholders})",
        tuple(patient_ids),
        commit=True,
    )
    return jsonify({"message": f"{len(patient_ids)} patients archived"})


#Account settings update
@homepage_bp.route("/account/update", methods=["POST"])
def update_account():
    data = request.json
    try:
        query = """
        UPDATE dbo.account_settings
        SET name = ?, 
            min_age = ?, 
            verify_dob = ?, 
            patient_label = ?, 
            practitioner_label = ?, 
            appointment_label = ?, 
            clinical_label = ?, 
            show_timestamps = ?
        WHERE id = 1
        """
        values = (
            data.get("name"),
            data.get("min_age"),
            1 if data.get("verify_dob") else 0,
            data.get("patient_label"),
            data.get("practitioner_label"),
            data.get("appointment_label"),
            data.get("clinical_label"),
            1 if data.get("show_timestamps") else 0,
        )

        rows_updated = execute_query(query, values, commit=True)
        if rows_updated == 0:
            return jsonify({"error": "No row found with id=1"}), 404

        return jsonify({"message": "Account updated successfully"}), 200
    except Exception as e:
        print("❌ Error updating account:", e)
        return jsonify({"error": str(e)}), 500


#GET /home/patients/search?q=<term>
@homepage_bp.route("/home/patients/search", methods=["GET"])
def search_patients():
    term = request.args.get("q", "").strip()
    if not term:
        return jsonify([])

    query = """
        SELECT 
            p.id AS patient_id,
            p.first_name + ' ' + p.last_name AS name,
            p.email,
            p.phone,
            p.dob
        FROM patients p
        WHERE p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ?
        ORDER BY p.first_name ASC
    """
    like_term = f"%{term}%"
    rows = fetch_all(query, (like_term, like_term, like_term))
    return jsonify(rows)


#PUT /home/patients/unarchive
@homepage_bp.route("/home/patients/unarchive", methods=["PUT"])
def unarchive_patients():
    data = request.json
    patient_ids = data.get("patientIds", [])
    if not patient_ids:
        return jsonify({"error": "No patientIds provided"}), 400

    placeholders = ",".join(["?"] * len(patient_ids))
    execute_query(
        f"UPDATE form_status SET status = 'Active' WHERE patient_id IN ({placeholders})",
        tuple(patient_ids),
        commit=True,
    )
    return jsonify({"message": f"{len(patient_ids)} patients unarchived"})
