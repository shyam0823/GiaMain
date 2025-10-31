import React, { useState } from "react";
import "./PrintViewModal.css";

export default function PrintViewModal({ open, onClose, onChoose }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!open) return null;

  return (
    <div className="pv-backdrop" onClick={onClose}>
      <div
        className="pv-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pv-title"
      >
        {/* Top-right “?” info icon */}
        <div
          className="pv-info-icon"
          role="button"
          tabIndex={0}
          aria-label="Details about print styles"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          onClick={() => setShowTooltip((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowTooltip((v) => !v);
            }
          }}
        >
          ?
          {showTooltip && (
            <div className="pv-tooltip" role="tooltip">
              <div className="pv-tooltip-title">Details</div>
              <div className="pv-tooltip-text">
                Printing as a Staff Member includes form fields not meant for patients to see.
              </div>
            </div>
          )}
        </div>

        <h3 id="pv-title" className="pv-title">Select print style</h3>
        <div className="pv-brand"></div>
        <div className="pv-section">Regular Layout</div>

        <div className="pv-actions">
          <button className="pv-btn" onClick={() => onChoose("staff")}>
            Staff member view
          </button>
          <button className="pv-btn" onClick={() => onChoose("patient")}>
            Patient view
          </button>
        </div>

        <div className="pv-footer">
          <button className="pv-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
