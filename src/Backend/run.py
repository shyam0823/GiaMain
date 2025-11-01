# src/Backend/run.py
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # CORS: read allowed origins from env
    origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS","").split(",") if o.strip()]
    CORS(
        app,
        resources={r"/api/*": {"origins": origins or ["*"]}},
        supports_credentials=False,
        allow_headers=["Content-Type","Authorization"],
        expose_headers=["Content-Disposition","Content-Type"],
        methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"]
    )

    jwt.init_app(app)

    # TODO: import & register your blueprints here
    # from Backend.app.routes.login import login_bp
    # app.register_blueprint(login_bp, url_prefix="/api")
    return app

app = create_app()
app.run(host="0.0.0.0", port=5000)