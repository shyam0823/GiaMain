from flask import Blueprint, request, jsonify
from Backend.app.database import get_cursor
from datetime import datetime
from werkzeug.security import generate_password_hash

users_bp = Blueprint("users", __name__)

# --------------------------
# Get all users
# --------------------------
@users_bp.route("/users", methods=["GET"])
def list_users():
    conn, cursor = get_cursor()
    try:
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        columns = [column[0] for column in cursor.description]

        data = []
        for row in users:
            user = dict(zip(columns, row))

            # Get all assigned locations
            cursor.execute(
                """
                SELECT l.name
                FROM user_locations ul
                JOIN locations l ON ul.location_id = l.id
                WHERE ul.user_id = ?
                """,
                (user["id"],),
            )
            locations = [loc[0] for loc in cursor.fetchall()]

            data.append({
                "id": user["id"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "email": user["email"],
                "mobile_phone": user["mobile_phone"],
                "role_group": user["role_group"],
                "default_location": user["default_location"],
                "locations": locations,
                "last_login": (
                    user["last_login"].strftime("%Y-%m-%d %I:%M%p")
                    if user.get("last_login") else None
                ),
                "is_active": bool(user["is_active"]),
            })

        return jsonify(data)
    finally:
        cursor.close()
        conn.close()


# --------------------------
# Create a new user
# --------------------------
@users_bp.route("/users", methods=["POST"])
def create_user():
    conn, cursor = get_cursor()
    try:
        data = request.json or {}

        # Validate required fields
        required_fields = ["first_name", "last_name", "email", "mobile_phone", "role_group"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing field: {field}"}), 400

        # Hash password (default "changeme" if not provided)
        raw_password = data.get("password", "changeme")
        password_hash = generate_password_hash(raw_password)

        # Insert into users table
        cursor.execute(
            """
            INSERT INTO users (first_name, last_name, mobile_phone, email, role_group,
                               default_location, is_active, created_on, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["first_name"],
                data["last_name"],
                data["mobile_phone"],
                data["email"],
                data["role_group"],
                str(data.get("default_location")) if data.get("default_location") else None,
                int(data.get("is_active", 1)),
                datetime.utcnow(),
                password_hash,
            ),
        )
        conn.commit()

        # Get new user ID
        cursor.execute("SELECT CAST(SCOPE_IDENTITY() as int)")
        user_id = cursor.fetchone()[0]

        # Insert user locations if provided
        location_ids = data.get("location_ids", [])
        for loc_id in location_ids:
            cursor.execute(
                "INSERT INTO user_locations (user_id, location_id) VALUES (?, ?)",
                (user_id, loc_id),
            )
        conn.commit()

        return jsonify({"message": "User created successfully", "user_id": user_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --------------------------
# Get single user (for settings preload)
# --------------------------
@users_bp.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    conn, cursor = get_cursor()
    try:
        cursor.execute(
            "SELECT id, first_name, last_name, email, mobile_phone, role_group, default_location, is_active, last_login "
            "FROM users WHERE id = ?",
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404

        columns = [col[0] for col in cursor.description]
        user = dict(zip(columns, row))
        # Shape like your frontend expects
        return jsonify(user), 200
    finally:
        cursor.close()
        conn.close()


# --------------------------
# Update user profile OR password
# --------------------------
@users_bp.route("/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    conn, cursor = get_cursor()
    data = request.json or {}

    try:
        # ---- Branch 1: password-only update ----
        if "password" in data and (data.get("password") or "").strip():
            raw = data["password"].strip()
            if len(raw) < 8:
                return jsonify({"error": "Password must be at least 8 characters."}), 400

            password_hash = generate_password_hash(raw)
            cursor.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (password_hash, user_id),
            )
            conn.commit()
            return jsonify({"message": "Password updated successfully"}), 200

        # ---- Branch 2: profile update ----
        first_name = (data.get("first_name") or "").strip()
        last_name  = (data.get("last_name")  or "").strip()
        email      = (data.get("email")      or "").strip()
        phone      = (data.get("mobile_phone") or data.get("phone") or "").strip()

        if not first_name or not email:
            return jsonify({"error": "first_name and email are required"}), 400

        # users table
        cursor.execute(
            """
            UPDATE users
               SET first_name = ?, last_name = ?, email = ?, mobile_phone = ?
             WHERE id = ?
            """,
            (first_name, last_name, email, phone, user_id),
        )

        # keep patients table in sync if there is a match
        cursor.execute(
            """
            UPDATE patients
               SET first_name = ?, last_name = ?, email = ?, phone = ?
             WHERE email = ? OR phone = ?
            """,
            (first_name, last_name, email, phone, email, phone),
        )

        conn.commit()
        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()
