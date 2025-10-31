import React, { useState } from "react";

/** Convert JS Date → YYYY-MM-DD (local calendar) */
const toYMD = (d) => {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const AppointmentForm = ({ onSubmit, onClose, selectedDate }) => {
  const [formData, setFormData] = useState({
    patientName: "",
    patientEmail: "",
    phoneNumber: "",
    appointmentDate: selectedDate ? toYMD(selectedDate) : "",
    appointmentTime: "",
    specialist: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    let {
      patientName,
      patientEmail,
      phoneNumber,
      appointmentDate,
      appointmentTime,
      specialist,
    } = formData;

    if (
      !patientName.trim() ||
      !patientEmail.trim() ||
      !phoneNumber.trim() ||
      !appointmentDate ||
      !appointmentTime ||
      !specialist.trim()
    ) {
      alert("Please fill in all required fields");
      return;
    }

    // Normalize time to HH:MM:SS
    let normalizedTime = appointmentTime.trim();
    if (/^\d{2}:\d{2}$/.test(normalizedTime)) {
      normalizedTime = `${normalizedTime}:00`;
    }

    // Use the raw YYYY-MM-DD string from the date input (no Date/UTC).
    const localDateStr = appointmentDate.trim();

    onSubmit({
      patientName: patientName.trim(),
      patientEmail: patientEmail.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      appointmentDate: localDateStr, // exact date user selected
      appointmentTime: normalizedTime,
      specialist: specialist.trim(),
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="form-overlay">
      <div className="appointment-form">
        <div className="form-header">
          <h3>New Appointment</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Patient Name *</label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Patient Email *</label>
              <input
                type="email"
                name="patientEmail"
                value={formData.patientEmail}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Specialist *</label>
              <input
                type="text"
                name="specialist"
                value={formData.specialist}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="appointmentDate"
                value={formData.appointmentDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Time *</label>
              <input
                type="time"
                name="appointmentTime"
                value={formData.appointmentTime}
                onChange={handleChange}
                step={60}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;
