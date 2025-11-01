import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = SECRET_KEY

    # ---- CORS ----
    origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
    CORS(
        app,
        resources={r"/api/*": {"origins": origins or ["*"]}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Disposition", "Content-Type"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    JWTManager(app)

    # ---- Import + Register Blueprints ----
    def safe_register(import_path, name, url_prefix=None):
        try:
            module = __import__(import_path, fromlist=[name])
            bp = getattr(module, name)
            app.register_blueprint(bp, url_prefix=url_prefix)
            print(f"[OK] Registered {name} from {import_path}")
        except Exception as e:
            print(f"[WARN] Skipped {name} ({import_path}): {e}")

    safe_register("app.routes.login", "login_bp", "/api")
    safe_register("app.routes.user", "users_bp", "/api")
    safe_register("app.routes.analytics", "analytics_bp", "/api/home/analytics")
    safe_register("app.routes.patients", "patients_bp", "/api")
    safe_register("app.routes.locations", "locations_bp", "/api")
    safe_register("app.routes.logout", "logout_bp", "/api")
    safe_register("app.routes.Appointment", "Appointment_bp", "/api")
    safe_register("app.routes.homepage", "homepage_bp", "/api")
    safe_register("app.routes.exports", "bp_exports", "/api/exports")
    safe_register("app.routes.export_csv", "bp_export_csv", "/api/exports/forms")
    safe_register("app.routes.exports", "bp_export_compat", "/api/export")
    safe_register("app.routes.forgot_password", "forgot_bp", "/api")
    safe_register("app.routes.upload", "uploads_bp", "/api")
    safe_register("app.routes.customer_homepage", "Customer_bp", "/api")
    safe_register("app.customer", "customer_bp", "/api")

    # ---- Serve static forms ----
    forms_path = os.path.join(os.path.dirname(__file__), "static", "forms")

    @app.route("/static/forms/<path:filename>")
    def serve_forms(filename):
        return send_from_directory(forms_path, filename)

    # ---- Health & Root routes (so / doesn’t 404) ----
    @app.get("/api/health")
    def health():
        return {"status": "ok"}, 200

    @app.get("/")
    def index():
        return {
            "service": "gia-flask-api",
            "message": "Backend is up. API lives under /api/*",
            "health": "/api/health",
        }, 200

    # ---- Debug Route Map ----
    try:
        print("\n=== ROUTE MAP ===")
        for rule in app.url_map.iter_rules():
            methods = ",".join(sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS")))
            print(f"{methods:10s} -> {rule.rule}")
        print("=== END MAP ===\n")
    except Exception as e:
        print(f"[WARN] Could not print route map: {e}")

    return app
