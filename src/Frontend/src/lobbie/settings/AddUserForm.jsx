import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AddUserForm.css";
import { createUser } from "../../api/AddUserFormApi"; // API call

function AddUserForm() {
  const navigate = useNavigate();

  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    mobile_phone: "",
    role_group: "",
    default_location: "", // must be ID
    location_ids: [], // optional extra locations
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  // Fetch locations for dropdown
  useEffect(() => {
    fetch("http://localhost:5000/api/locations")
      .then((res) => res.json())
      .then((data) => setLocations(data))
      .catch((err) => console.error("Error fetching locations:", err));
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        mobile_phone: formData.mobile_phone,
        role_group: formData.role_group,
        default_location: formData.default_location,
        location_ids: formData.location_ids,
        is_active: formData.is_active,
      };

      const data = await createUser(payload);
      alert(" User saved successfully!");
      console.log("Saved user:", data);

      navigate("/dash/settings/users");
    } catch (err) {
      console.error("Save error:", err);
      let errorMsg = "Unknown error";
      if (err.response) {
        errorMsg = err.response.data?.error || JSON.stringify(err.response.data);
      } else if (err.request) {
        errorMsg = "No response from server";
      } else {
        errorMsg = err.message;
      }
      alert("❌ Failed to save user: " + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-user-container">
      <h2>Add New User</h2>

      <form onSubmit={handleSave} className="add-user-form">
        {/* First Name */}
        <label>First Name *</label>
        <input
          type="text"
          name="first_name"
          required
          value={formData.first_name}
          onChange={handleChange}
        />

        {/* Last Name */}
        <label>Last Name *</label>
        <input
          type="text"
          name="last_name"
          required
          value={formData.last_name}
          onChange={handleChange}
        />

        {/* Email */}
        <label>Email *</label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
        />

        {/* Mobile Phone */}
        <label>Mobile Phone</label>
        <input
          type="text"
          name="mobile_phone"
          value={formData.mobile_phone}
          onChange={handleChange}
        />

        {/* Role Group */}
        <label>Role Group *</label>
        <select
          name="role_group"
          value={formData.role_group}
          onChange={handleChange}
          required
        >
          <option value="">-- Select Role --</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="IOP">IOP</option>
        </select>

        {/* Default Location */}
        <label>Default Location *</label>
        <select
          name="default_location"
          value={formData.default_location}
          onChange={handleChange}
          required
        >
          <option value="">-- Select Location --</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>

        {/* Additional Locations */}
        <label>Assign Additional Locations</label>
        <select
          name="location_ids"
          multiple
          value={formData.location_ids}
          onChange={(e) =>
            setFormData({
              ...formData,
              location_ids: Array.from(e.target.selectedOptions, (opt) => opt.value),
            })
          }
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>

        {/* Password */}
        <div className="password-field">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        {/* Active Checkbox */}
        <label>
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
          />
          Active?
        </label>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate("/dash/settings/users")}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="save-btn">
            {saving ? "Saving..." : "Save User"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddUserForm;
