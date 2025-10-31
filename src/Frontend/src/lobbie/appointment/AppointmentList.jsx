import React, { useState, useEffect, useRef } from "react";

const AppointmentList = ({ appointments, onDelete, onUpdate, onAdd, onPostpone }) => {
  // Hooks ALWAYS run (top-level, never conditional)
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown on outside click or ESC
  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    const onEsc = (e) => e.key === "Escape" && setOpenMenuId(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const toggleMenu = (id) => setOpenMenuId((cur) => (cur === id ? null : id));

  const getStatusColor = (status) => {
    if (!status) return "#6c757d";
    const s = String(status).toLowerCase();
    if (s === "urgent") return "#dc3545";
    if (s === "confirmed") return "#28a745";
    if (s === "pending") return "#ffc107";
    if (s === "completed") return "#17a2b8";
    return "#6c757d";
  };

  const formatTime = (t) => (t ? (t.length === 8 ? t.slice(0, 5) : t) : "—");

  const isEmpty = !appointments || appointments.length === 0;

  return (
    <div className="appointment-list">
      {isEmpty ? (
        // Empty state rendered WITHOUT returning before hooks
        <div className="no-appointments">
          <p>No appointments scheduled for this date</p>
          <button className="schedule-btn" onClick={onAdd}>
            + Schedule Appointment
          </button>
        </div>
      ) : (
        appointments.map((appointment) => {
          const id = appointment.id;
          const status = appointment.Status || appointment.status;
          const phone = appointment.PhoneNumber || appointment.phoneNumber;
          const name = appointment.PatientName || appointment.patientName;

          return (
            <div key={id} className="appointment-card">
              <div className="appointment-time">
                <span className="time">
                  {formatTime(appointment.AppointmentTime || appointment.appointmentTime)}
                </span>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(status) }}
                >
                  {(status || "Pending").toUpperCase()}
                </span>
              </div>

              <div className="appointment-details">
                <div className="patient-info">
                  <h4>{name}</h4>
                  <p>{appointment.purpose || "Regular appointment"}</p>
                </div>

                <div className="contact-info">
                  <p>📞 {phone}</p>
                  <p>
                    {appointment.purpose === "Emergency"
                      ? "Severe headache - needs immediate attention"
                      : "Regular appointment"}
                  </p>
                </div>
              </div>

              <div className="appointment-actions">
                <button className="call-btn">Call Patient</button>

                <button
                  className="visit-btn"
                  style={{ backgroundColor: getStatusColor(status) }}
                  onClick={() => onUpdate(id)}
                >
                  Start Visit
                </button>
                
                {/* <button className="delete-btn" title="Delete Appointment"
                onClick={() => onDelete(appointment.id)} > ⋮ </button> */ }

                {/* 3 dots trigger */}
                <button
                  className="more-btn"
                  title="More actions"
                  onClick={() => toggleMenu(id)}
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === id}
                >
                  ⋮
                </button>

                {/* Mini overlay menu */}
                {openMenuId === id && (
                  <div ref={menuRef} className="mini-overlay" role="menu" aria-label="Appointment actions">
                    <div className="mini-overlay__arrow" />
                    <div className="mini-overlay__header">{name}</div>

                    <button
                      className="mini-overlay__item"
                      role="menuitem"
                      onClick={() => {
                        setOpenMenuId(null);
                        onPostpone && onPostpone(id);
                      }}
                    >
                      <span className="mini-overlay__icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"></circle>
                          <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                      </span>
                      <span>Postpone Appointment</span>
                    </button>

                    <button
                      className="mini-overlay__item mini-overlay__item--danger"
                      role="menuitem"
                      onClick={() => {
                        setOpenMenuId(null);
                        onDelete && onDelete(id); // Cancel = Delete
                      }}
                    >
                      <span className="mini-overlay__icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                          <path d="M8 6l1-2h6l1 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                          <path d="M18 6l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 6" stroke="currentColor" strokeWidth="2"></path>
                          <path d="M10 11l4 4M14 11l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                        </svg>
                      </span>
                      <span>Cancel Appointment</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AppointmentList;
