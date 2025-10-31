import React, { useState, useEffect } from "react";
import "./PostponeModal.css";

const PostponeModal = ({ show, onClose, onSubmit, currentDate, currentTime }) => {
  const [date, setDate] = useState(currentDate || "");
  const [time, setTime] = useState(currentTime || "");
  const [reason, setReason] = useState("");

  useEffect(() => {
    setDate(currentDate || "");
    setTime(currentTime || "");
  }, [currentDate, currentTime]);

  if (!show) return null;

  const handleSave = () => {
    if (!date || !time) {
      alert("Please choose both date and time.");
      return;
    }
    onSubmit({
      appointmentDate: date,     // "YYYY-MM-DD"
      appointmentTime: time,     // "HH:MM"
      reason,
    });
  };

  return (
    <div className="pm-overlay" role="dialog" aria-modal="true" aria-label="Reschedule appointment">
      <div className="pm-modals">
        <h3 className="pm-title">Reschedule Appointment</h3>

        <label className="pm-label">New Date</label>
        <input
          className="pm-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label className="pm-label">New Time</label>
        <input
          className="pm-input"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <label className="pm-label">Reason (optional)</label>
        <textarea
          className="pm-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Add a note for why you're postponing"
        />

        <div className="pm-actions">
          <button className="pm-btn pm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="pm-btn pm-btn--primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default PostponeModal;
