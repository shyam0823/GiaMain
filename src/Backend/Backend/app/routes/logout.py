from flask import Blueprint, request, jsonify
from app.services.login_service import blacklist_token

logout_bp = Blueprint("logout", __name__)

@logout_bp.route("/logout", methods=["POST"])
def logout():
    data = request.json
    token = data.get("token")  # client should send the token

    if not token:
        return jsonify({"status": "fail", "message": "Token is required"}), 400

    error = blacklist_token(token)  # function to save token in blacklist
    if error:
        return jsonify({"status": "fail", "message": error}), 400

    return jsonify({"status": "success", "message": "Logged out successfully"}), 200
