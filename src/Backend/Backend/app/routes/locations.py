from flask import Blueprint, request, jsonify
from Backend.app.database import get_cursor

locations_bp = Blueprint('locations', __name__)

# --------------------------
# GET all locations
# --------------------------
@locations_bp.route('/locations', methods=['GET'])
def get_locations():
    conn, cursor = get_cursor()
    try:
        cursor.execute("SELECT * FROM locations")
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

        data = []
        for row in rows:
            row_dict = dict(zip(columns, row))
            data.append({
                'id': row_dict['id'],
                'name': row_dict['name'],
                'phone': row_dict.get('phone'),
                'timezone': row_dict.get('timezone'),
                'schedule_start': str(row_dict.get('schedule_start')) if row_dict.get('schedule_start') else None,
                'schedule_end': str(row_dict.get('schedule_end')) if row_dict.get('schedule_end') else None,
                'address': row_dict.get('address'),
                'apartment_suite': row_dict.get('apartment_suite'),
                'city': row_dict.get('city'),
                'state': row_dict.get('state'),
                'zip_code': row_dict.get('zip_code'),
                'is_active': bool(row_dict.get('is_active', 0)),
                'created_on': row_dict.get('created_on').strftime('%Y-%m-%d %H:%M:%S') if row_dict.get('created_on') else None
            })

        return jsonify(data)
    finally:
        cursor.close()
        conn.close()

# --------------------------
# ADD a new location
# --------------------------
@locations_bp.route('/locations', methods=['POST'])
def add_location():
    data = request.json
    conn, cursor = get_cursor()
    try:
        cursor.execute("""
            INSERT INTO locations (
                name, phone, timezone, schedule_start, schedule_end,
                address, apartment_suite, city, state, zip_code, is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['name'], data.get('phone'), data.get('timezone'),
            data.get('schedule_start'), data.get('schedule_end'),
            data.get('address'), data.get('apartment_suite', ''),
            data.get('city'), data.get('state'), data.get('zip_code'),
            int(data.get('is_active', 1))
        ))
        conn.commit()
        return jsonify({'message': 'Location added successfully'}), 201
    finally:
        cursor.close()
        conn.close()

# --------------------------
# UPDATE location
# --------------------------
@locations_bp.route('/locations/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    data = request.json
    conn, cursor = get_cursor()
    try:
        cursor.execute("""
            UPDATE locations
            SET name = ?, phone = ?, timezone = ?, schedule_start = ?, schedule_end = ?,
                address = ?, apartment_suite = ?, city = ?, state = ?, zip_code = ?, is_active = ?
            WHERE id = ?
        """, (
            data['name'], data.get('phone'), data.get('timezone'),
            data.get('schedule_start'), data.get('schedule_end'),
            data.get('address'), data.get('apartment_suite', ''),
            data.get('city'), data.get('state'), data.get('zip_code'),
            int(data.get('is_active', 1)), location_id
        ))
        conn.commit()
        return jsonify({'message': 'Location updated successfully'})
    finally:
        cursor.close()
        conn.close()

# --------------------------
# TOGGLE Active/Inactive
# --------------------------
@locations_bp.route('/locations/<int:location_id>/toggle', methods=['PATCH'])
def toggle_location_status(location_id):
    conn, cursor = get_cursor()
    try:
        cursor.execute("SELECT is_active FROM locations WHERE id = ?", (location_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Location not found'}), 404

        current_status = row[0]
        new_status = 0 if current_status else 1

        cursor.execute("UPDATE locations SET is_active = ? WHERE id = ?", (new_status, location_id))
        conn.commit()
        return jsonify({'message': f'Location status updated to {"Active" if new_status else "Inactive"}'})
    finally:
        cursor.close()
        conn.close()
