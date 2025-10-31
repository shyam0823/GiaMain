import React, { useState, useEffect } from "react";
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchLocation,
} from "../../api/LocationAPi";
import "./LocationSettings.css";

function LocationSettings() {
  const [activeTab, setActiveTab] = useState("active");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    timezone: "",
    schedule_start: "",
    schedule_end: "",
    address: "",
    apartment_suite: "",
    city: "",
    state: "",
    zip_code: "",
    is_active: true,
  });

  const [locations, setLocations] = useState([]);

  //  Fetch from backend on mount
  useEffect(() => {
    fetchLocations()
      .then((data) => {
        // normalize all responses
        const normalized = data.map((loc) => ({
          ...loc,
          is_active: Boolean(loc.is_active),
        }));
        setLocations(normalized);
      })
      .catch((err) => console.error("Error fetching locations:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  // Save to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let newLocation = await createLocation(form);

      // normalize response from backend
      newLocation = {
        ...newLocation,
        is_active: Boolean(newLocation.is_active),
      };

      setLocations((prev) => [newLocation, ...prev]); // add to top
      setShowForm(false);

      // reset form
      setForm({
        name: "",
        phone: "",
        timezone: "",
        schedule_start: "",
        schedule_end: "",
        address: "",
        apartment_suite: "",
        city: "",
        state: "",
        zip_code: "",
        is_active: true,
      });
    } catch (error) {
      console.error("Error creating location:", error);
      alert("Failed to save location to backend");
    }
  };

  return (
    <section className="panel">
      <div className="location-header">
        <h2>Location</h2>
        <button className="add-location-btn" onClick={() => setShowForm(true)}>
          Add Location
        </button>
      </div>

      {/* Tabs */}
      <div className="location-filters">
        <label className="radio-label">
          <input
            type="radio"
            checked={activeTab === "active"}
            onChange={() => setActiveTab("active")}
          />
          <span className="custom-radio"></span>
          Active
        </label>
        <label className="radio-label">
          <input
            type="radio"
            checked={activeTab === "inactive"}
            onChange={() => setActiveTab("inactive")}
          />
          <span className="custom-radio"></span>
          Inactive
        </label>
      </div>

      {/* Table */}
      <table className="location-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Active?</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {locations
            .filter((loc) =>
              activeTab === "active" ? loc.is_active : !loc.is_active
            )
            .map((loc) => (
              <tr key={loc.id}>
                <td>{loc.name}</td>
                <td>{loc.is_active ? <span className="tick">&#10003;</span> : ""}</td>
                <td>
                  <a href="#" className="edit-link">
                    edit location
                  </a>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* Overlay Form */}
      {showForm && (
        <div className="modal-overlay">
          <form className="location-form" onSubmit={handleSubmit}>
            <h2>Add New Location</h2>

            <div className="form-row">
              <label>Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <label>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label>Timezone</label>
              <input name="timezone" value={form.timezone} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label>Schedule Start</label>
              <input
                type="time"
                name="schedule_start"
                value={form.schedule_start}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label>Schedule End</label>
              <input
                type="time"
                name="schedule_end"
                value={form.schedule_end}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label>Apartment/Suite</label>
              <input
                name="apartment_suite"
                value={form.apartment_suite}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label>City</label>
              <input name="city" value={form.city} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label>State</label>
              <input name="state" value={form.state} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label>Zip Code</label>
              <input name="zip_code" value={form.zip_code} onChange={handleChange} />
            </div>

            <div className="form-row checkbox-row">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                Active
              </label>
            </div>

            <div className="button-row">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit">Save Location</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default LocationSettings;
