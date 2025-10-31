import React, { useState } from "react";
import "./FormDetailPage.css";

// Dummy data for forms in the sidebar
const formsList = [
  "Background and Reference Check Authorization Form",
  "Employee Application Checklist",
  "Job Description Acknowledgment",
  "Form I-9",
  "Adult TB Risk Assessment and Screening",
  "SORI Request Authorization Form",
  "CORI Acknowledgement Form",
  "Patient Emergency and Contact Information",
  "Employee Application"
];

export default function FormDetailPage() {
  const [selectedFormIdx, setSelectedFormIdx] = useState(0);

  return (
    <div className="form-detail-main">
      {/* Sidebar */}
      <aside className="form-sidebar">
        <div className="sidebar-header">
          <img src="/logo192.png" alt="Logo" className="sidebar-logo" />
          <span className="org-name">HOMECARE SERVICES <br/><span className="org-slogan">Excellent Care just for You</span></span>
        </div>
        <nav className="sidebar-nav">
          {formsList.map((item, idx) => (
            <div
              key={item}
              className={`sidebar-item ${selectedFormIdx === idx ? "active" : ""}`}
              onClick={() => setSelectedFormIdx(idx)}
              title={item}
            >
              {item.length > 28 ? item.slice(0,28) + "..." : item}
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <section className="form-content">
        <div className="form-head">
          <div>
            <h2 className="main-title">{formsList[selectedFormIdx]}</h2>
            <div className="sub-info">
              <span>Briian Mojica</span> &nbsp; | &nbsp;
              <span>
                Completed On: <b>Sep 5, 2025</b>
              </span>
            </div>
          </div>
          <div className="completion-status">
            100%
            <span className="progress-bars">
              {Array.from({ length: 6 }).map((_,i)=>
                <span key={i} className="bar"></span>
              )}
            </span>
          </div>
        </div>

        <div className="internal-comments">
          <button className="accordion-btn">▾ Internal Form Comments/Notes</button>
        </div>

        {/* Form section demo */}
        <div className="form-section">
          <h3 className="form-title">Background and Reference Check Authorization Form</h3>
          <p>
            As part of the pre-employment process at GIA Home Care Services LLC, I understand that the company will seek and obtain background and reference check reports. These investigative reports may include, but are not limited to:
          </p>
          <ul>
            <li>OIG/GSA Sanction List Checks</li>
            <li>References from at least two (2) former employers</li>
            <li>Social Security Number Verification or E-Verify for eligibility to work in the United States.</li>
            <li>Criminal Background Check</li>
          </ul>
          <p>
            I understand that these records are used to determine eligibility and qualification for contracting with GIA... (rest of statement).
          </p>
        </div>

        {/* Signature & Details section */}
        <div className="signature-details">
          <div className="sig-box">
            <b>Signature <span className="sig-green">✔</span></b>
            <div className="sig-name">Brian Mohika, RN</div>
          </div>
          <div className="date-input">
            <label>Date <span className="asterisk">*</span></label>
            <input type="text" value="09/05/2025" readOnly />
          </div>
        </div>

        {/* Fields */}
        <div className="fields-row">
          <div className="field-group">
            <label>First Name <span className="sig-green">✔</span></label>
            <input type="text" value="Brian" readOnly />
          </div>
          <div className="field-group">
            <label>Last Name <span className="sig-green">✔</span></label>
            <input type="text" value="Mohika" readOnly />
          </div>
          <div className="field-group">
            <label>MI</label>
            <input type="text" value="O" readOnly />
          </div>
        </div>

        <div className="field-group long">
          <label>All other names used:</label>
          <input type="text" value="" readOnly />
        </div>
        <div className="field-group long">
          <label>Current Address</label>
          <input type="text" value="6 Elaine Marie Dr, Haverhill, MA 01830" readOnly />
        </div>

        <div className="fields-row">
          <div className="field-group">
            <label>Length of Residency</label>
            <input type="text" value="" readOnly />
          </div>
          <div className="field-group long">
            <label>If less than 5 years, list previous:</label>
            <input type="text" value="" readOnly />
          </div>
        </div>
        <div className="fields-row">
          <div className="field-group">
            <label>Phone</label>
            <input type="text" value="" readOnly />
          </div>
          <div className="field-group">
            <label>Driver's License/State Id Number</label>
            <input type="text" value="S39362671" readOnly />
          </div>
          <div className="field-group">
            <label>State</label>
            <input type="text" value="MA" readOnly />
          </div>
        </div>
        <div className="fields-row">
          <div className="field-group">
            <label>Professional License #</label>
            <input type="text" value="RN2309532" readOnly />
          </div>
          <div className="field-group">
            <label>Type</label>
            <input type="text" value="Nursing" readOnly />
          </div>
          <div className="field-group">
            <label>State of Issue</label>
            <input type="text" value="MA" readOnly />
          </div>
        </div>

        <div className="form-footer">
          <button className="btn-complete">Complete &nbsp; <span>→</span></button>
        </div>
      </section>
    </div>
  );
}
