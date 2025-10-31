import React from "react";
import "./FormsTable.css";
import ActionMenu from "../dashboard/ActionMenu";
import { ProgressBar } from "../components/ProgressBar";

const FormsTable = ({
  filteredData,
  selectedPatients,
  expandedPatients,
  toggleExpand,
  togglePatientSelection,
  navigate,
  setSelectedPatient,
  setAssignModalOpen,
  formatDate,          // optional – if provided, we’ll use it
  onOpenPrint,
}) => {
  // --- U.S. date formatter (MM/DD/YYYY) ---
  const formatDateUS = (value) => {
    if (!value) return "—";
    // Accept Date, ISO string, timestamp (ms), or something parseable
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isFinite(value)) {
      // if a numeric timestamp in seconds, convert to ms
      const maybeSec = new Date(value * 1000);
      if (!isNaN(maybeSec)) return mmddyyyy(maybeSec);
    }
    if (isNaN(d)) return "—";
    return mmddyyyy(d);
  };

  const mmddyyyy = (d) => {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Prefer external formatter if provided; otherwise use U.S. formatter.
  const fmt = typeof formatDate === "function" ? formatDate : formatDateUS;

  return (
    <div className="table-container">
      <table className="forms-table">
        <thead>
          <tr>
            <th className="checkbox-col">
              <input type="checkbox" />
            </th>
            <th>Patient Name</th>
            <th>Forms</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Email Sent</th>
            <th>SMS Sent</th>
            <th>Created</th>
            <th>Location</th>
            <th>Print/PDF</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((patient) => (
            <React.Fragment key={String(patient.patientId) || patient.patient}>
              <tr>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedPatients.includes(patient.patientId)}
                    onChange={() => togglePatientSelection(patient.patientId)}
                  />
                </td>

                <td
                  style={{ cursor: "pointer", fontWeight: "bold" }}
                  onClick={() => toggleExpand(patient.patientId)}
                >
                  {expandedPatients.includes(patient.patientId) ? "▾" : "▸"}{" "}
                  {patient.patient}
                </td>

                <td>{patient.forms.length}</td>
                <td>{patient.forms[0]?.status || "—"}</td>

                {/* All dates use U.S. MM/DD/YYYY */}
                <td>{fmt(patient.forms[0]?.dueDate)}</td>
                <td>{fmt(patient.forms[0]?.emailSent)}</td>
                <td>{fmt(patient.forms[0]?.smsSent)}</td>
                <td>{fmt(patient.forms[0]?.created)}</td>

                <td>{patient.forms[0]?.location || "—"}</td>

                {/* Flat text-style print button */}
                <td>
                  <button
                    className="print-text-btn"
                    onClick={() =>
                      onOpenPrint({
                        patientId: patient.patientId,
                        patientName: patient.patient,
                      })
                    }
                  >
                    <i className="printer-icon"></i>
                    Print / PDF
                  </button>
                </td>

                <td>
                  <ActionMenu
                    patientId={patient.patientId}
                    patientName={patient.patient}
                    onAssignForm={(pid) => {
                      setSelectedPatient({
                        id: pid || patient.patientId,
                        name: patient.patient,
                      });
                      setAssignModalOpen(true);
                    }}
                  />
                </td>
              </tr>

              {expandedPatients.includes(patient.patientId) && (
                <tr className="nested-table-row">
                  <td></td>
                  {/* colSpan reflects extra Print/PDF column */}
                  <td colSpan="10" style={{ paddingLeft: "40px" }}>
                    <table className="nested-forms-table">
                      <thead>
                        <tr>
                          <th>Template</th>
                          <th>Completion</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patient.forms.map((form, idx) => (
                          <tr key={`${patient.patientId}-form-${idx}`}>
                            <td>{form.form || "No Form Assigned"}</td>
                            <td className="progress-cell">
                              <ProgressBar
                                percentage={
                                  typeof form.completion === "number"
                                    ? form.completion
                                    : 0
                                }
                                size="md"
                                showPercentage
                              />
                            </td>
                            <td>
                              {form.completion >= 100
                                ? "Completed"
                                : "Incomplete"}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  className="print-text-btn"
                                  onClick={() =>
                                    onOpenPrint({
                                      patientId: patient.patientId,
                                      patientName: patient.patient,
                                    })
                                  }
                                >
                                  <i className="printer-icon"></i>
                                  Print/PDF
                                </button>

                                <button
                                  className="table-action-btn"
                                  onClick={() =>
                                    navigate(
                                      `/forms/${form.formId}/edit?patient=${patient.patientId}`,
                                      { state: { fromDashboard: true } }
                                    )
                                  }
                                >
                                  View/Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}

          {filteredData.length === 0 && (
            <tr>
              <td colSpan="11">No patients found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FormsTable;
