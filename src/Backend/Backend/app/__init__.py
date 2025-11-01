import os
from flask import Flask, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Blueprints (use relative imports)
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
from .routes.upload import uploads_bp
from .routes.customer_homepage import Customer_bp  # relative, not Backend.app...

# If you still load it from your own module, keep it. Prefer env var in Render.
try:
    from .database import SECRET_KEY  # optional if you already have this defined
except Exception:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

jwt = JWTManager()


def create_app():
    app = Flask(__name__)  # API-only on Render (do NOT set static_folder to a Windows path)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", SECRET_KEY)

    # ----- CORS -----
    # Read allowed origins from env (comma-separated). Example in Render:
    # FRONTEND_ORIGINS="https://giademo.purplenowinc.com, https://your-frontend.onrender.com"
    origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]

    CORS(
        app,
        resources={r"/api/*": {"origins": origins or ["*"]}},   # keep * only during testing
        supports_credentials=False,                              # set True only if using cookies
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Disposition", "Content-Type"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    jwt.init_app(app)

    # ----- Register blueprints -----
    app.register_blueprint(login_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")
    app.register_blueprint(homepage_bp, url_prefix="/api")
    app.register_blueprint(patients_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api/home/analytics")
    app.register_blueprint(locations_bp, url_prefix="/api")
    app.register_blueprint(logout_bp, url_prefix="/api")
    app.register_blueprint(Appointment_bp, url_prefix="/api")
    app.register_blueprint(forgot_bp, url_prefix="/api")
    app.register_blueprint(customer_bp, url_prefix="/api")
    app.register_blueprint(Customer_bp, url_prefix="/api")
    app.register_blueprint(uploads_bp, url_prefix="/api")
    app.register_blueprint(bp_exports, url_prefix="/api/exports")
    app.register_blueprint(bp_export_csv, url_prefix="/api/exports/forms")
    app.register_blueprint(bp_export_compat, url_prefix="/api/export")

    # If you have static forms inside app/static/forms, serve them:
    forms_path = os.path.join(os.path.dirname(__file__), "static", "forms")

    @app.route("/static/forms/<path:filename>")
    def serve_forms(filename):
        return send_from_directory(forms_path, filename)

    # Debug: route map in logs
    print("\n=== ROUTE MAP ===")
    for rule in app.url_map.iter_rules():
        methods = ",".join(sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS")))
        print(f"{methods:10s} -> {rule.rule}")
    print("=== END MAP ===\n")

    return app
