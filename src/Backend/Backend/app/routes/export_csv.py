from flask import Blueprint, request, send_file, jsonify
from flask_cors import cross_origin
from io import BytesIO
import traceback

# Blueprint has no prefix — it’s mounted in __init__.py at /api/exports/forms
bp_export_csv = Blueprint("export_csv", __name__)

@bp_export_csv.route("/csv", methods=["POST", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    expose_headers=["Content-Disposition"]
)
def export_forms_csv():
    if request.method == "OPTIONS":
        return ("", 200)

    try:
        filters = request.get_json(force=True) or {}
        from ..services.export_csv_service import generate_csv_export
        file_bytes, filename, mimetype = generate_csv_export(filters)

        resp = send_file(
            BytesIO(file_bytes),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename,
        )
        resp.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        return resp

    except Exception as e:
        print("\n--- CSV EXPORT ERROR ---")
        traceback.print_exc()
        print("------------------------\n")
        return jsonify({"message": f"CSV export failed: {e}"}), 500


#Optional test route to confirm frontend-download works
@bp_export_csv.route("/testcsv", methods=["GET"])
@cross_origin(
    origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    expose_headers=["Content-Disposition"]
)
def test_csv():
    data = "patient_id,patient_name,form_name,status\n1,Alice,Intake,Completed\n"
    resp = send_file(
        BytesIO(data.encode("utf-8-sig")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="forms-export-test.csv",
    )
    resp.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
    return resp
