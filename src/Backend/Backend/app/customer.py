from flask import Blueprint, jsonify, request
from .database import get_cursor
 
customer_bp = Blueprint("customer_bp", __name__)
 
# ------------------------------
#Fetch forms assigned to a specific customer
# ------------------------------
@customer_bp.route("/customer/forms/<int:customer_id>", methods=["GET"])
def get_assigned_forms(customer_id):
    conn, cursor = get_cursor()
    try:
        cursor.execute(""" 
            SELECT f.form_id, f.name AS form_name
            FROM Forms f
            JOIN AssignedForms af ON af.form_id = f.form_id
            WHERE af.customer_id = ?
        """, (customer_id,))
        forms = cursor.fetchall()
 
        results = []
        for form in forms:
            cursor.execute("""
                SELECT field_id, label, type
                FROM FormFields
                WHERE form_id = ?
            """, (form.form_id,))
            fields = cursor.fetchall()
            results.append({
                "FormID": form.form_id,
                "FormName": form.form_name,
                "Fields": [
                    {"FieldID": f.field_id, "Label": f.label, "Type": f.type}
                    for f in fields
                ]
            })
 
        return jsonify(results)
    except Exception as e:
        print("Error fetching forms:", e)
        return jsonify({"error": "Failed to load forms"}), 500
    finally:
        conn.close()
 
 
# ------------------------------
#Submit a completed form
# ------------------------------
@customer_bp.route("/customer/forms/submit", methods=["POST"])
def submit_form():
    data = request.json
    customer_id = data.get("customer_id")
    form_id = data.get("form_id")
    answers = data.get("answers", {})
 
    if not (customer_id and form_id and answers):
        return jsonify({"error": "Missing required data"}), 400
 
    conn, cursor = get_cursor()
    try:
        for field_id, value in answers.items():
            cursor.execute("""
                INSERT INTO FormResponses (customer_id, form_id, field_id, answer)
                VALUES (?, ?, ?, ?)
            """, (customer_id, form_id, field_id, value))
        conn.commit()
        return jsonify({"message": "Form submitted successfully"})
    except Exception as e:
        print("Error submitting form:", e)
        return jsonify({"error": "Submission failed"}), 500
    finally:
        conn.close()
 
 
# ------------------------------
#Book an appointment
# ------------------------------
@customer_bp.route("/customer/appointment", methods=["POST"])
def book_appointment():
    data = request.json
    patient_name = data.get("name")
    patient_email = data.get("email")
    phone_number = data.get("phone")
    appointment_date = data.get("date")
    appointment_time = data.get("time")
    specialist = data.get("doctor")  # maps to Specialist column
 
    # Validate required fields
    if not all([patient_name, patient_email, phone_number, appointment_date, appointment_time, specialist]):
        return jsonify({"error": "All fields are required"}), 400
 
    conn, cursor = get_cursor()
    try:
        cursor.execute("""
            INSERT INTO Appointments
            (PatientName, PatientEmail, PhoneNumber, AppointmentDate, AppointmentTime, Specialist)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (patient_name, patient_email, phone_number, appointment_date, appointment_time, specialist))
        conn.commit()
        return jsonify({"message": "Appointment booked successfully!"})
    except Exception as e:
        print("Error booking appointment:", e)
        return jsonify({"error": "Failed to book appointment"}), 500
    finally:
        conn.close()