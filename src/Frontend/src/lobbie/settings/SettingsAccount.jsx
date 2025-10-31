import React, { useState } from "react";
import "./SettingsAccount.css";
import axios from "axios";

function SettingsAccount() {
  const [formData, setFormData] = useState({
    name: "GIA Home Care Services",
    min_age: 24,
    verify_dob: false,
    patient_label: "Patient",
    practitioner_label: "Practitioner",
    appointment_label: "Appointment",
    clinical_label: "Staff Only",
    show_timestamps: true,
  });

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/account/update", formData);
      if (res.status === 200) {
        alert("Account updated successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update account!");
    }
  };

  return (
    <div className="account-settings-container">
      <div className="section-heading">Account</div>

      {/* Name */}
      <div className="account-form-row">
        <div className="field-group">
          <label>Name</label>
          <input
            className="account-input"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Min Age + Verify DOB */}
      <div className="account-form-row">
        <div className="field-group">
          <label>Minimum Age Required in Years</label>
          <input
            className="account-input"
            type="number"
            name="min_age"
            value={formData.min_age}
            onChange={handleChange}
          />
        </div>
        <div className="field-group field-group-inline">
          <input
            type="checkbox"
            id="verify-dob"
            name="verify_dob"
            checked={formData.verify_dob}
            onChange={handleChange}
          />
          <label htmlFor="verify-dob">
            Verify patient date of birth to access forms
          </label>
        </div>
      </div>

      <button className="save-btn" onClick={handleSave}>✓ Save Settings</button>

      {/* Customization */}
      <div className="subsection-heading">Customization</div>
      <div className="customization-grid">
        <div className="field-group">
          <label>Identify "Patients" instead as:</label>
          <input
            className="account-input"
            name="patient_label"
            value={formData.patient_label}
            onChange={handleChange}
          />
        </div>
        <div className="field-group">
          <label>Identify "Practitioners" instead as:</label>
          <input
            className="account-input"
            name="practitioner_label"
            value={formData.practitioner_label}
            onChange={handleChange}
          />
        </div>
        <div className="field-group">
          <label>Identify "Appointments" instead as:</label>
          <input
            className="account-input"
            name="appointment_label"
            value={formData.appointment_label}
            onChange={handleChange}
          />
        </div>
        <div className="field-group">
          <label>Identify "Clinical Note" forms instead as:</label>
          <input
            className="account-input"
            name="clinical_label"
            value={formData.clinical_label}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="account-toggle-row">
        <input
          type="checkbox"
          id="show-timestamps"
          name="show_timestamps"
          checked={formData.show_timestamps}
          onChange={handleChange}
        />
        <label htmlFor="show-timestamps" className="toggle-label">
          Show timestamps on form signatures and initials?
        </label>
      </div>

      {/* Lobbie Connect */}
      <div className="subsection-heading" style={{ marginTop: 30 }}>Lobbie Connect</div>
      <table className="lobbie-connect-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Slack</td>
            <td>Receive notifications from Lobbie in a Slack Channel.</td>
            <td>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/76/Slack_Icon.png"
                alt="Slack"
                style={{ width: 28, height: 28 }}
              />
            </td>
          </tr>
          <tr>
            <td>Dropbox</td>
            <td>Upload PDFs of completed forms to a Lobbie folder in Dropbox.</td>
            <td>
              <img
                src="https://www.logo.wine/a/logo/Dropbox_(service)/Dropbox_(service)-Icon-Logo.wine.svg"
                alt="Dropbox"
                style={{ width: 28, height: 28 }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default SettingsAccount;
