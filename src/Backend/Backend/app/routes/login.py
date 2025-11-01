from flask import Blueprint, request, jsonify
import jwt

from app.services.login_service import login_user, register_user
from ..database import SECRET_KEY, get_cursor

login_bp = Blueprint("login", __name__)

# -------------------------
# Helpers
# -------------------------
ROLE_KEYS   = ("role_group", "RoleGroup", "role", "Role")
ID_KEYS     = ("id", "user_id", "ID", "UserId", "userid")
FNAME_KEYS  = ("first_name", "FirstName", "firstName")
LNAME_KEYS  = ("last_name", "LastName", "lastName")
#accept all reasonable variants for mobile number
PHONE_KEYS = (
    "mobile_number", "mobileNumber",  # <-- frontend uses this
    "mobile_phone", "mobilePhone",
    "phone", "Phone",
    "mobile", "Mobile",
    "number", "Number",
)


def _pick_any(d: dict, keys: tuple[str, ...], default: str | None = ""):
    for k in keys:
        if d.get(k) is not None:
            return d.get(k)
    return default


def _detect_role_from_result(result: dict) -> str:
    """
    Try to determine role in this order:
    1) Explicit role fields in result/user
    2) JWT claims (if token available)
    3) redirect_url hint
    4) default 'User'
    """
    role = ""
    user = (result or {}).get("user") or {}
    for k in ROLE_KEYS:
        if user.get(k):
            role = str(user.get(k)).strip()
            break
        if result.get(k):
            role = str(result.get(k)).strip()
            break
    if role:
        return role

    token = result.get("token") or result.get("access_token")
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            for k in ROLE_KEYS:
                if payload.get(k):
                    return str(payload.get(k)).strip()
        except Exception:
            pass

    redirect_url = str(result.get("redirect_url") or "")
    low = redirect_url.lower()
    if "customer" in low:
        return "User"
    if "admin" in low or "dash" in low:
        return "Admin"
    return "User"


def _normalize_token(result: dict) -> str:
    return result.get("token") or result.get("access_token") or ""


def _extract_user_core(result: dict, token: str) -> dict:
    """
    Build the user object with id/first/last/email/phone
    from (a) result.user or top-level result
    then (b) JWT payload as fallback.
    """
    user = (result or {}).get("user") or {}

    # Prefer values from result / result.user
    user_id = _pick_any(user, ID_KEYS) or _pick_any(result, ID_KEYS)
    email = user.get("email") or result.get("email") or ""
    first_name = _pick_any(user, FNAME_KEYS) or _pick_any(result, FNAME_KEYS)
    last_name = _pick_any(user, LNAME_KEYS) or _pick_any(result, LNAME_KEYS)
    mobile_phone = _pick_any(user, PHONE_KEYS) or _pick_any(result, PHONE_KEYS)

    # Fallback to JWT if anything crucial missing
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = user_id or _pick_any(payload, ID_KEYS)
            email = email or payload.get("email") or ""
            first_name = first_name or _pick_any(payload, FNAME_KEYS)
            last_name = last_name or _pick_any(payload, LNAME_KEYS)
            mobile_phone = mobile_phone or _pick_any(payload, PHONE_KEYS)
        except Exception:
            pass

    return {
        "id": user_id,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "email": email or "",
        "mobile_phone": mobile_phone or "",
    }


def _normalized_login_payload(result: dict) -> dict:
    """
    Consistent payload for the frontend:
      {
        status, message, token, access_token, email, redirect_url,
        user: { id, first_name, last_name, email, mobile_phone, role_group }
      }
    """
    token = _normalize_token(result)
    role  = _detect_role_from_result(result)
    role_norm = "Admin" if str(role).strip().lower() == "admin" else "User"

    core = _extract_user_core(result, token)
    email = core.get("email", "")

    payload = {
        "status": "success",
        "message": result.get("message") or "Login successful",
        "token": token,
        "access_token": token,
        "email": email,
        "redirect_url": result.get("redirect_url"),
        "user": {
            **core,  # id, first_name, last_name, email, mobile_phone
            "role_group": role_norm,
        },
    }
    return payload


# -------------------------
# Login Endpoint
# -------------------------
@login_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"status": "fail", "message": "Email and password are required"}), 400

    result, error, status = login_user(email, password)
    if error:
        return jsonify({"status": "fail", "message": error}), status

    normalized = _normalized_login_payload(result or {})
    # final guard: ensure user.id is present
    if not normalized.get("user", {}).get("id"):
        normalized["message"] = (normalized.get("message") or "Login successful") + " (no id in token/result)"
    return jsonify(normalized), status


# -------------------------
# Register Endpoint (robust)
# -------------------------
@login_bp.route("/register", methods=["POST"])
def register():
    # Be tolerant to missing/incorrect headers
    data = request.get_json(silent=True) or {}

    # pull core fields with your existing key sets
    email         = (data.get("email") or "").strip()
    password      = (data.get("password") or "").strip()
    first_name    = (_pick_any(data, FNAME_KEYS) or "").strip()
    last_name     = (_pick_any(data, LNAME_KEYS) or "").strip()
    mobile_phone  = (_pick_any(data, PHONE_KEYS) or "").strip()

    # optional fields
    default_location = (data.get("default_location") or data.get("location") or "").strip()
    admin_code       = (data.get("admin_code") or "").strip()
    role_group_raw   = (data.get("role_group") or data.get("role") or "User").strip()
    role_group       = "Admin" if role_group_raw.lower() == "admin" else "User"

    # validate and report exactly what's missing
    missing = []
    if not email:        missing.append("email")
    if not password:     missing.append("password")
    if not first_name:   missing.append("first_name")
    if not last_name:    missing.append("last_name")
    if not mobile_phone: missing.append("mobile_phone")

    if missing:
        return jsonify({
            "status": "fail",
            "message": f"Missing required field(s): {', '.join(missing)}"
        }), 400

    # very light email/password sanity checks (optional)
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"status":"fail","message":"Invalid email format"}), 400
    if len(password) < 6:
        return jsonify({"status":"fail","message":"Password must be at least 6 characters"}), 400

    # hand off to service
    result, error, status = register_user(
        email,
        password,
        first_name,
        last_name,
        mobile_phone,
        default_location,
        admin_code,
        role_group,
    )

    if error:
        # forward service-layer status (e.g., 409 for duplicate email)
        return jsonify({"status": "fail", "message": error}), status

    # success: align with your login normalization shape if desired
    return jsonify({
        "status": "success",
        "message": result.get("message") or "Registration successful",
        "user": {
            "id":        _pick_any(result.get("user") or result, ID_KEYS) or "",
            "first_name": first_name,
            "last_name":  last_name,
            "email":       email,
            "mobile_phone": mobile_phone,
            "role_group":   role_group,
        }
    }), status
