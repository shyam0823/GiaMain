from flask import Blueprint, request, jsonify
import jwt
from ..database import get_cursor, SECRET_KEY  # relative import from app/
# If SECRET_KEY lives elsewhere, adjust import accordingly.

# Exported name must match your import in __init__.py
Customer_bp = Blueprint("Customer_bp", __name__)

def _get_role_lower(decoded: dict) -> str:
    """Extract role from common keys and normalize to lowercase."""
    role = (
        decoded.get("role_group")
        or decoded.get("RoleGroup")
        or decoded.get("role")
        or decoded.get("Role")
        or ""
    )
    return str(role).strip().lower()

@Customer_bp.route("/customer/home", methods=["GET"])
def customer_home():
    """Simple auth-protected endpoint for the customer portal home."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Authorization header missing or malformed"}), 401

    token = auth_header.replace("Bearer ", "").strip()

    conn = None
    cursor = None
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        role = _get_role_lower(decoded)

        # Allow 'user'/'customer'/'patient' to access the customer portal
        if role not in {"user", "customer", "patient"}:
            return jsonify({"error": "Unauthorized", "detected_role": role}), 403

        # (Optional) touch DB to verify user/customer exists
        conn, cursor = get_cursor()
        # You can add lightweight checks here if needed.

        return jsonify({"message": "Welcome to the customer homepage"}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        print("customer_home error:", e)
        return jsonify({"error": "Internal server error"}), 500
    finally:
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except Exception:
            pass
