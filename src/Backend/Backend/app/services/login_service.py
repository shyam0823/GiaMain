import datetime
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from Backend.app.database import get_cursor, SECRET_KEY

# ----------------------------
# Helpers
# ----------------------------
def _normalize_role(role_val: str) -> str:
    """
    Normalize any role-ish value to "Admin" or "User".
    Treats 'customer'/'patient' as 'User'.
    """
    r = (role_val or "").strip().lower()
    if r == "admin":
        return "Admin"
    if r in {"user", "customer", "patient"}:
        return "User"
    return "User"


def _jwt_exp(days=1) -> int:
    return int((datetime.datetime.utcnow() + datetime.timedelta(days=days)).timestamp())


# ----------------------------
# LOGIN  (now supports users OR patients)
# ----------------------------
def login_user(email, password):
    """
    Try dbo.users first (Admin/User portal).
    If not found there, try dbo.patients (Patient portal).
    For patients we return role_group='User' and redirect to /customer.
    """
    conn, cursor = get_cursor()
    try:
        # --- 1) Try USERS table ---
        cursor.execute(
            "SELECT id, password_hash, role_group FROM users WHERE email = ?",
            (email,),
        )
        row = cursor.fetchone()

        if row:
            user_id, stored_password_hash, role_from_db = row

            if not stored_password_hash or not check_password_hash(stored_password_hash, password):
                return None, "Incorrect password", 401

            # Try to resolve matching patient id by user email (optional)
            cursor.execute("SELECT id FROM patients WHERE email = ?", (email,))
            p = cursor.fetchone()
            patient_id = int(p[0]) if p else None

            # Update last login timestamp
            now = datetime.datetime.utcnow()
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user_id))
            conn.commit()

            role_group = _normalize_role(role_from_db)
            exp_ts = _jwt_exp(days=1)
            token = jwt.encode(
                {
                    "sub": user_id,
                    "email": email,
                    "role_group": role_group,
                    "patient_id": patient_id,
                    "exp": exp_ts,
                },
                SECRET_KEY,
                algorithm="HS256",
            )
            redirect_url = "/dash" if role_group == "Admin" else "/customer"

            return {
                "status": "success",
                "message": "Login successful",
                "email": email,
                "role_group": role_group,
                "token": token,
                "access_token": token,
                "expiry": datetime.datetime.utcfromtimestamp(exp_ts).isoformat() + "Z",
                "redirect_url": redirect_url,
                "user": {
                    "id": user_id,              # USER id
                    "email": email,
                    "role_group": role_group,
                    "patient_id": patient_id,
                },
            }, None, 200

        # --- 2) Fallback: try PATIENTS table ---
        cursor.execute(
            "SELECT id, password_hash FROM patients WHERE email = ?",
            (email,),
        )
        prow = cursor.fetchone()
        if not prow:
            # Not in users, not in patients
            return None, "User does not exist", 404

        patient_id, p_hash = prow
        if not p_hash or not check_password_hash(p_hash, password):
            return None, "Incorrect password", 401

        # For patients, treat as a 'User' and send them to /customer
        role_group = "User"
        exp_ts = _jwt_exp(days=1)
        token = jwt.encode(
            {
                "sub": patient_id,     # use patient id as subject
                "email": email,
                "role_group": role_group,
                "patient_id": patient_id,
                "exp": exp_ts,
            },
            SECRET_KEY,
            algorithm="HS256",
        )

        return {
            "status": "success",
            "message": "Login successful",
            "email": email,
            "role_group": role_group,
            "token": token,
            "access_token": token,
            "expiry": datetime.datetime.utcfromtimestamp(exp_ts).isoformat() + "Z",
            "redirect_url": "/customer",
            "user": {
                "id": patient_id,         #ensure FE has an id (use patient id)
                "email": email,
                "role_group": role_group,
                "patient_id": patient_id,
            },
        }, None, 200

    finally:
        cursor.close()
        conn.close()


# ----------------------------
# REGISTER (unchanged)
# ----------------------------
def register_user(
    email,
    password,
    first_name,
    last_name,
    mobile_phone,
    default_location="",
    admin_code="",
    role_group=None,  # allow FE to explicitly send Admin/User
):
    """
    Create a user with role_group 'Admin' or 'User'.
    - If role_group provided by FE, honor it (normalized).
    - Else, allow admin via admin_code or specific email.
    - Else, default to 'User'.
    """
    conn, cursor = get_cursor()
    try:
        # Unique email check
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            return None, "User already exists", 400

        # Decide role
        if role_group is not None:
            role_norm = _normalize_role(role_group)
        else:
            if admin_code == "Admin123" or email.lower() == "admin@example.com":
                role_norm = "Admin"
            else:
                role_norm = "User"

        created_on = datetime.datetime.utcnow()
        is_active = 1
        password_hash = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users (
                first_name, last_name, mobile_phone, email, role_group,
                default_location, last_login, is_active, created_on, password_hash
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                first_name,
                last_name,
                mobile_phone,
                email,
                role_norm,
                default_location,
                None,
                is_active,
                created_on,
                password_hash,
            ),
        )
        conn.commit()

    finally:
        cursor.close()
        conn.close()

    return {
        "status": "success",
        "message": "User registered successfully",
        "user": {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role_group": role_norm,
            "mobile_phone": mobile_phone,
        },
    }, None, 201


# ----------------------------
# TOKEN BLACKLISTING (unchanged)
# ----------------------------
blacklisted_tokens = set()

def blacklist_token(token):
    try:
        blacklisted_tokens.add(token)
        return None
    except Exception as e:
        return str(e)

def is_token_blacklisted(token):
    return token in blacklisted_tokens
