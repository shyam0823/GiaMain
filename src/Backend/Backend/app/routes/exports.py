from flask import Blueprint, request, jsonify, send_file
from werkzeug.exceptions import BadRequest
from ..services.export_service import (
    start_export_job,
    get_job_state,
    get_job_file_path,
)

# --------------------------
# Primary /api/exports routes
# (mounted under url_prefix="/api" in app factory)
# Final paths:
#   POST /api/exports
#   GET  /api/exports/<export_id>
#   GET  /api/exports/<export_id>/file
# --------------------------
bp_exports = Blueprint("exports", __name__, url_prefix="/exports")

# Accept both /api/exports  and /api/exports/
@bp_exports.route("", methods=["POST", "OPTIONS"])
@bp_exports.route("/", methods=["POST", "OPTIONS"])
def start_export():
    """
    Body: { "patientId": <int>, "view": "staff" | "patient" }
    Returns: { "exportId": "<id>" }
    """
    if request.method == "OPTIONS":
        # CORS preflight handled by flask-cors, but returning 200 is harmless
        return ("", 200)

    data = request.get_json(silent=True) or {}
    patient_id = data.get("patientId")
    view = data.get("view")

    if not patient_id or view not in ("staff", "patient"):
        raise BadRequest("patientId and view are required")

    export_id = start_export_job(patient_id=int(patient_id), view=view)
    return jsonify({"exportId": export_id})


@bp_exports.route("/<export_id>", methods=["GET"])
def poll_export(export_id):
    """
    Returns: { "status": "pending" | "ready" | "error", "url"?: string }
    """
    status = get_job_state(export_id)
    if not status:
        return jsonify({"status": "error"}), 404

    if status == "ready":
        return jsonify({"status": "ready", "url": f"/api/exports/{export_id}/file"})
    return jsonify({"status": status})


@bp_exports.route("/<export_id>/file", methods=["GET"])
def download_export(export_id):
    path = get_job_file_path(export_id)
    if not path:
        return "Not found", 404

    return send_file(
        path,
        mimetype="application/pdf",
        as_attachment=False,
        download_name=f"patient-{export_id}.pdf",
    )


# -------------------------------------------------------
# Compatibility routes for legacy frontend calls:
#   /api/export/patient/<id>
#   /api/export/staff/<id>
# We allow both GET and POST so older code keeps working.
# -------------------------------------------------------
bp_export_compat = Blueprint("export_compat", __name__, url_prefix="/export")


@bp_export_compat.route("/patient/<int:patient_id>", methods=["GET", "POST", "OPTIONS"])
def compat_start_patient_export(patient_id: int):
    if request.method == "OPTIONS":
        return ("", 200)
    export_id = start_export_job(patient_id=patient_id, view="patient")
    return jsonify({"exportId": export_id})


@bp_export_compat.route("/staff/<int:patient_id>", methods=["GET", "POST", "OPTIONS"])
def compat_start_staff_export(patient_id: int):
    if request.method == "OPTIONS":
        return ("", 200)
    export_id = start_export_job(patient_id=patient_id, view="staff")
    return jsonify({"exportId": export_id})
