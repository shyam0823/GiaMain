from flask import Blueprint, request, jsonify
import datetime, random, smtplib, ssl
from email.message import EmailMessage
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import get_cursor

# --------------------------------------------
# Blueprint Definition
# --------------------------------------------
forgot_bp = Blueprint("forgot_password", __name__)

# --------------------------------------------
# Configuration
# --------------------------------------------
OTP_LIFETIME_SECS = 60  # OTP expires in 60 seconds

SENDER_EMAIL = "vakashyamsundar8@gmail.com"
SENDER_PASSWORD = "jisstsmpagkraqdr"  # Gmail App Password (no spaces)
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT_SSL = 465


# --------------------------------------------
# Helpers
# --------------------------------------------
def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _otp() -> str:
    """Generate a random 6-digit OTP."""
    return "".join(str(random.randint(0, 9)) for _ in range(6))


def _send_email_otp(to_email: str, code: str, portal_label: str):
    """Send OTP via Gmail SMTP."""
    subject = f"{portal_label} Password Reset OTP"
    body = (
        f"Your {portal_label} OTP is: {code}\n"
        f"This code expires in {OTP_LIFETIME_SECS} seconds.\n"
        "If you didn't request this, you can ignore this email."
    )
    msg = EmailMessage()
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT_SSL, context=ctx) as s:
        s.login(SENDER_EMAIL, SENDER_PASSWORD)
        s.send_message(msg)


def _find_user_id(cur, email_lower: str):
    cur.execute("SELECT id FROM users WHERE LOWER(email)=LOWER(?)", (email_lower,))
    r = cur.fetchone()
    return int(r[0]) if r else None


def _find_patient_id(cur, email_lower: str):
    cur.execute("SELECT id FROM patients WHERE LOWER(email)=LOWER(?)", (email_lower,))
    r = cur.fetchone()
    return int(r[0]) if r else None


def _latest_reset(cur, email_lower: str, for_users: bool):
    """Fetch last OTP row."""
    if for_users:
        cur.execute("""
            SELECT TOP 1 id, otp_hash, expires_at, used
            FROM password_resets
            WHERE LOWER(email)=LOWER(?) AND user_id IS NOT NULL
            ORDER BY id DESC
        """, (email_lower,))
    else:
        cur.execute("""
            SELECT TOP 1 id, otp_hash, expires_at, used
            FROM password_resets
            WHERE LOWER(email)=LOWER(?) AND patient_id IS NOT NULL
            ORDER BY id DESC
        """, (email_lower,))
    return cur.fetchone()


def _insert_reset(conn, cur, email_lower: str, fk_id: int, for_users: bool):
    code = _otp()
    exp_dt = _now() + datetime.timedelta(seconds=OTP_LIFETIME_SECS)
    otp_hash = generate_password_hash(code)

    if for_users:
        cur.execute("""
            INSERT INTO password_resets (email, user_id, otp_hash, expires_at, used)
            VALUES (?, ?, ?, ?, 0)
        """, (email_lower, fk_id, otp_hash, exp_dt))
    else:
        cur.execute("""
            INSERT INTO password_resets (email, patient_id, otp_hash, expires_at, used)
            VALUES (?, ?, ?, ?, 0)
        """, (email_lower, fk_id, otp_hash, exp_dt))

    conn.commit()
    return code, exp_dt


def _cooldown_json(email_lower: str, exp_dt: datetime.datetime, message: str):
    """JSON response during cooldown."""
    return jsonify({
        "status": "success",
        "message": message,
        "email": email_lower,
        "expires_in": max(0, int((exp_dt - _now()).total_seconds())),
        "server_expiry_epoch": int(exp_dt.timestamp())
    }), 200


# --------------------------------------------
# Routes (users-only, patients-only, and auto)
# --------------------------------------------

@forgot_bp.route("/forgot-password", methods=["POST"])
def send_otp_users():
    """Send OTP to Admin/User."""
    data = request.get_json(silent=True) or {}
    email_lower = (data.get("email") or "").strip().lower()
    if not email_lower:
        return jsonify({"status": "fail", "message": "Email is required"}), 400

    conn, cur = get_cursor()
    try:
        user_id = _find_user_id(cur, email_lower)
        if not user_id:
            # don't leak account existence
            fake_exp = _now() + datetime.timedelta(seconds=OTP_LIFETIME_SECS)
            return _cooldown_json(email_lower, fake_exp, "If the email exists, an OTP has been sent.")

        last = _latest_reset(cur, email_lower, for_users=True)
        if last:
            _, _, last_exp, last_used = last
            if not last_used and _now() < last_exp:
                return _cooldown_json(email_lower, last_exp, "OTP already sent. Please wait.")

        code, exp_dt = _insert_reset(conn, cur, email_lower, user_id, True)
        _send_email_otp(email_lower, code, "GIA Admin/User")

        return jsonify({
            "status": "success",
            "message": "OTP sent to your email.",
            "email": email_lower,
            "expires_in": OTP_LIFETIME_SECS,
            "server_expiry_epoch": int(exp_dt.timestamp())
        }), 200
    except Exception as e:
        return jsonify({"status": "fail", "message": str(e)}), 500
    finally:
        conn.close()


@forgot_bp.route("/forgot-password/patient", methods=["POST"])
def send_otp_patients():
    """Send OTP to Patient."""
    data = request.get_json(silent=True) or {}
    email_lower = (data.get("email") or "").strip().lower()
    if not email_lower:
        return jsonify({"status": "fail", "message": "Email is required"}), 400

    conn, cur = get_cursor()
    try:
        patient_id = _find_patient_id(cur, email_lower)
        if not patient_id:
            fake_exp = _now() + datetime.timedelta(seconds=OTP_LIFETIME_SECS)
            return _cooldown_json(email_lower, fake_exp, "If the email exists, an OTP has been sent.")

        last = _latest_reset(cur, email_lower, for_users=False)
        if last:
            _, _, last_exp, last_used = last
            if not last_used and _now() < last_exp:
                return _cooldown_json(email_lower, last_exp, "OTP already sent. Please wait.")

        code, exp_dt = _insert_reset(conn, cur, email_lower, patient_id, False)
        _send_email_otp(email_lower, code, "Patient Portal")

        return jsonify({
            "status": "success",
            "message": "OTP sent to your email.",
            "email": email_lower,
            "expires_in": OTP_LIFETIME_SECS,
            "server_expiry_epoch": int(exp_dt.timestamp())
        }), 200
    except Exception as e:
        return jsonify({"status": "fail", "message": str(e)}), 500
    finally:
        conn.close()


@forgot_bp.route("/forgot-password/auto", methods=["POST"])
def send_otp_auto():
    """
    AUTO endpoint: find email in users first, then patients.
    Sends OTP accordingly. Prevents front-end routing mistakes.
    """
    data = request.get_json(silent=True) or {}
    email_lower = (data.get("email") or "").strip().lower()
    if not email_lower:
        return jsonify({"status": "fail", "message": "Email is required"}), 400

    conn, cur = get_cursor()
    try:
        user_id = _find_user_id(cur, email_lower)
        patient_id = None
        target_for_users = False

        if user_id:
            target_for_users = True
        else:
            patient_id = _find_patient_id(cur, email_lower)
            if not patient_id:
                fake_exp = _now() + datetime.timedelta(seconds=OTP_LIFETIME_SECS)
                return _cooldown_json(email_lower, fake_exp, "If the email exists, an OTP has been sent.")

        last = _latest_reset(cur, email_lower, for_users=target_for_users)
        if last:
            _, _, last_exp, last_used = last
            if not last_used and _now() < last_exp:
                return _cooldown_json(email_lower, last_exp, "OTP already sent. Please wait.")

        if target_for_users:
            code, exp_dt = _insert_reset(conn, cur, email_lower, user_id, True)
            _send_email_otp(email_lower, code, "GIA Admin/User")
        else:
            code, exp_dt = _insert_reset(conn, cur, email_lower, patient_id, False)
            _send_email_otp(email_lower, code, "Patient Portal")

        return jsonify({
            "status": "success",
            "message": "OTP sent to your email.",
            "email": email_lower,
            "expires_in": OTP_LIFETIME_SECS,
            "server_expiry_epoch": int(exp_dt.timestamp())
        }), 200
    except Exception as e:
        return jsonify({"status": "fail", "message": str(e)}), 500
    finally:
        conn.close()


@forgot_bp.route("/forgot-password/verify", methods=["POST"])
def verify_and_reset():
    """Verify OTP and reset password."""
    data = request.get_json(silent=True) or {}
    email_lower = (data.get("email") or "").strip().lower()
    otp_plain = (data.get("otp") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not email_lower or not otp_plain or not new_password:
        return jsonify({"status": "fail", "message": "Email, OTP, and new_password are required"}), 400

    conn, cur = get_cursor()
    try:
        cur.execute("""
            SELECT TOP 1 id, otp_hash, expires_at, used, user_id, patient_id
            FROM password_resets
            WHERE LOWER(email)=LOWER(?) AND used=0
            ORDER BY id DESC
        """, (email_lower,))
        row = cur.fetchone()

        if not row:
            return jsonify({"status": "fail", "message": "OTP not found or already used"}), 400

        pr_id, otp_hash, expires_at, used, user_id, patient_id = row
        if _now() > expires_at:
            return jsonify({"status": "fail", "message": "OTP expired"}), 400
        if not check_password_hash(otp_hash, otp_plain):
            return jsonify({"status": "fail", "message": "Incorrect OTP"}), 400

        pw_hash = generate_password_hash(new_password)
        if user_id:
            cur.execute("UPDATE users SET password_hash=? WHERE id=?", (pw_hash, user_id))
        elif patient_id:
            cur.execute("UPDATE patients SET password_hash=? WHERE id=?", (pw_hash, patient_id))
        else:
            return jsonify({"status": "fail", "message": "Invalid target"}), 400

        cur.execute("UPDATE password_resets SET used=1 WHERE id=?", (pr_id,))
        conn.commit()
        return jsonify({"status": "success", "message": "Password updated. Please login again."}), 200
    except Exception as e:
        return jsonify({"status": "fail", "message": str(e)}), 500
    finally:
        conn.close()
