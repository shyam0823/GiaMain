import React, { useState } from "react";
import "./AssignFormsModal.css";

const AssignFormsModal = ({ patient, forms, onClose, onAssign }) => {
  const [selectedForms, setSelectedForms] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Normalize patient fields
  const patientId = patient?.id || patient?.patientId;
  const patientName = patient?.name || patient?.patient || "Patient";

  // Toggle selection
  const toggleForm = (formId) => {
    setSelectedForms((prev) =>
      prev.includes(formId)
        ? prev.filter((id) => id !== formId)
        : [...prev, formId]
    );
  };

  // Handle Assign button
  const handleAssign = async () => {
    if (!patientId) {
      alert("⚠️ No patient selected.");
      return;
    }
    if (selectedForms.length === 0) {
      alert("Please select at least one form!");
      return;
    }

    try {
      setIsAssigning(true);
      await onAssign(patientId, selectedForms); //  Await async assign
      onClose(); // Close only on success
    } catch (err) {
      console.error("Assign failed:", err);
      alert("❌ Failed to assign forms. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="assign-overlay">
      <div className="assign-modal">
        {/* Header */}
        <div className="modal-header">
          <h2>Form Assignment</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Info Box */}
        <div className="info-box">
          Select the forms you wish to assign to{" "}
          <strong>{patientName}</strong>.
          <br />
          <small style={{ color: "#666" }}>
            Any forms that are un-assigned will be hidden but may be un-hidden
            as long as the form template has not been modified.
          </small>
        </div>

        {/* Form List */}
        <div className="form-select">
          {forms && forms.length > 0 ? (
            forms.map((form) => (
              <label key={form.id} className="form-checkbox">
                <input
                  type="checkbox"
                  checked={selectedForms.includes(form.id)}
                  onChange={() => toggleForm(form.id)}
                />
                {form.title || "Untitled Form"}
              </label>
            ))
          ) : (
            <p style={{ color: "#888" }}>No forms available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose} disabled={isAssigning}>
            Cancel
          </button>
          <button
            className="assign-btn"
            onClick={handleAssign}
            disabled={isAssigning}
          >
            {isAssigning ? "Assigning..." : "Assign Forms"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignFormsModal;
