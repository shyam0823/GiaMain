from flask import Blueprint, request, jsonify
from Backend.app.database import get_cursor
from datetime import datetime, timedelta

analytics_bp = Blueprint("analytics", __name__)


# ---------------- Helper ---------------- #
def adjust_date_range(start, end):
    """Convert YYYY-MM-DD strings into datetime range [start, end+1day)."""
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d") + timedelta(days=1)
        return start_dt, end_dt
    except Exception:
        return None, None


# ------------------ Forms Analytics ------------------ #
@analytics_bp.route("/forms", methods=["GET"])
def get_form_analytics():
    start_date = request.args.get("startDate")
    end_date = request.args.get("endDate")
    compare_start = request.args.get("compareStart")
    compare_end = request.args.get("compareEnd")

    if not start_date or not end_date:
        return jsonify({"error": "Missing date range"}), 400

    start_dt, end_dt = adjust_date_range(start_date, end_date)

    conn, cursor = get_cursor()

    def run_query(s, e):
        s_dt, e_dt = adjust_date_range(s, e)
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_forms,
                SUM(CASE WHEN status IN ('Active','Not Started') THEN 1 ELSE 0 END) AS assigned,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'Completed' 
                         AND DATEDIFF(HOUR, created, due_date) <= 24 THEN 1 ELSE 0 END) AS within24_completed
            FROM dbo.form_status
            WHERE created >= ? AND created < ?
        """, (s_dt, e_dt))
        row = cursor.fetchone()

        if not row:
            return {
                "Assigned": 0,
                "Completed": 0,
                "CompletionRate": "0%",
                "Within24_Completed": 0,
                "Within24_CompletionRate": "0%"
            }

        total = row.total_forms or 0
        assigned = row.assigned or 0
        completed = row.completed or 0
        within24_completed = row.within24_completed or 0

        completion_rate = f"{int((completed * 100) / total) if total else 0}%"
        within24_rate = f"{int((within24_completed * 100) / completed) if completed else 0}%"

        return {
            "Assigned": assigned,
            "Completed": completed,
            "CompletionRate": completion_rate,
            "Within24_Completed": within24_completed,
            "Within24_CompletionRate": within24_rate
        }

    # run for current + comparison
    current = run_query(start_date, end_date)
    compare = run_query(compare_start, compare_end) if compare_start and compare_end else None

    cursor.close()
    conn.close()

    return jsonify({"current": current, "compare": compare})


# ------------------ Patients Analytics ------------------ #
@analytics_bp.route("/patients", methods=["GET"])
def get_patient_analytics():
    start_date = request.args.get("startDate")
    end_date = request.args.get("endDate")
    compare_start = request.args.get("compareStart")
    compare_end = request.args.get("compareEnd")

    conn, cursor = get_cursor()

    def run_query(s, e):
        if s and e:
            s_dt, e_dt = adjust_date_range(s, e)
            cursor.execute("""
                SELECT COUNT(*) AS patient_count
                FROM dbo.patients
                WHERE created_on >= ? AND created_on < ?
            """, (s_dt, e_dt))
        else:
            cursor.execute("SELECT COUNT(*) AS patient_count FROM dbo.patients")
        row = cursor.fetchone()
        return {
            "Total": row.patient_count if row else 0,
            # intake_method not in schema → returning only total
            "Bulk_Import": 0,
            "Integration": 0,
            "Patient_Self_Scheduling": 0,
            "Sent_Forms": 0,
            "Staff_Created": 0,
            "Staff_Scheduled_Appointments": 0,
            "Static_Anonymous_Link": 0
        }

    current = run_query(start_date, end_date)
    compare = run_query(compare_start, compare_end) if compare_start and compare_end else None

    cursor.close()
    conn.close()

    return jsonify({"current": current, "compare": compare})
