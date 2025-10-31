import React, { useEffect } from "react";
import "./CancelModal.css";

const CancelModal = ({ show, onClose, onConfirm, patientName }) => {
  if (!show) return null;

  // Close on Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stop = (e) => e.stopPropagation();

  return (
    <div className="cancel-overlay" onClick={onClose}>
      <div
        className="cancel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        onClick={stop}
      >
        <div className="cancel-header" id="cancel-modal-title">
          Cancel Appointment
        </div>

        <div className="cancel-body">
          <p className="cancel-text">
            Are you sure you want to cancel{" "}
            <strong>{patientName || "this appointment"}</strong>?
          </p>
          <p className="cancel-subtext">
            This action cannot be undone and the appointment will be permanently
            removed.
          </p>
        </div>

        <div className="cancel-actions">
          <button className="cancel-btn cancel-no" onClick={onClose}>
            No, keep it
          </button>
          <button className="cancel-btn cancel-yes" onClick={onConfirm}>
            Yes, cancel it
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelModal;
