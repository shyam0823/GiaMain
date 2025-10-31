import os
from flask import Flask, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# ✅ Import Blueprints
from .routes.login import login_bp
from .routes.user import users_bp
from .routes.analytics import analytics_bp
from .routes.patients import patients_bp
from .routes.locations import locations_bp
from .customer import customer_bp
from .routes.logout import logout_bp
from .routes.Appointment import Appointment_bp
from .routes.homepage import homepage_bp
from .routes.exports import bp_exports, bp_export_compat
from .routes.export_csv import bp_export_csv
from .routes.forgot_password import forgot_bp
from .database import SECRET_KEY
from Backend.app.routes.customer_homepage import Customer_bp  # must exist and export Customer_bp

# ✅ NEW: uploads routes (works with Uploader.jsx)
from .routes.upload import uploads_bp

jwt = JWTManager()


def create_app():
    app = Flask(
        __name__,
        static_folder=r"C:\Users\Shyam\Downloads\GiaNew_themed\GiaNew\GIA Homecare\src\Frontend\dist",
        static_url_path=""
    )

    app.config["SECRET_KEY"] = SECRET_KEY

    # ✅ JWT & CORS setup
    jwt.init_app(app)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173"
                ]
            }
        },
        supports_credentials=False,
        expose_headers=["Content-Disposition"]
    )

    # ✅ Register blueprints (core routes)
    app.register_blueprint(login_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")
    app.register_blueprint(homepage_bp, url_prefix="/api")
    app.register_blueprint(patients_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api/home/analytics")
    app.register_blueprint(locations_bp, url_prefix="/api")
    app.register_blueprint(logout_bp, url_prefix="/api")
    app.register_blueprint(Appointment_bp, url_prefix="/api")
    app.register_blueprint(forgot_bp, url_prefix="/api")

    # Customer-related blueprints
    app.register_blueprint(customer_bp, url_prefix="/api")   # from .customer
    app.register_blueprint(Customer_bp, url_prefix="/api")   # from routes.customer_homepage

    # ✅ Uploads endpoints (Save/Edit/Delete used by Uploader.jsx)
    app.register_blueprint(uploads_bp, url_prefix="/api")

    # ✅ Export endpoints
    # bp_exports → provides /api/exports/... for PDF exports
    app.register_blueprint(bp_exports, url_prefix="/api/exports")

    # bp_export_csv → provides /api/exports/forms/csv for CSV export
    app.register_blueprint(bp_export_csv, url_prefix="/api/exports/forms")

    # bp_export_compat → legacy routes (/api/export/...) for backward compatibility
    app.register_blueprint(bp_export_compat, url_prefix="/api/export")

    # ✅ Serve static forms if needed
    forms_path = os.path.join(os.path.dirname(__file__), "static", "forms")

    @app.route("/static/forms/<path:filename>")
    def serve_forms(filename):
        return send_from_directory(forms_path, filename)

    # ✅ Serve React frontend build
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        target = os.path.join(app.static_folder, path)
        if path != "" and os.path.exists(target):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    # ✅ Route map for debugging (shows all active routes in console)
    print("\n=== ROUTE MAP ===")
    for rule in app.url_map.iter_rules():
        methods = ",".join(sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS")))
        print(f"{methods:10s} -> {rule.rule}")
    print("=== END MAP ===\n")

    return app
