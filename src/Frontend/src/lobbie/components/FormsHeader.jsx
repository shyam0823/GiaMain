import React from "react";
import "./FormsHeader.css";

const FormsHeader = ({ onGenerateCsv, onSendForms }) => {
  return (
    <div className="forms-header">
      <div className="forms-title">
        <h1>Forms</h1>
        <p className="location-text">America/New_York</p>
      </div>

      <div className="forms-actions">
        <button type="button" className="btn-pill" onClick={onGenerateCsv}>
          Generate CSV
        </button>
        <button type="button" className="btn-pill" onClick={onSendForms}>
          Send Forms
        </button>
      </div>
    </div>
  );
};

export default FormsHeader;
