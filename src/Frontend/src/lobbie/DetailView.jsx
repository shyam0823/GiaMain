import React, { useEffect, useMemo, useState } from "react";
import { fetchLobbyDashboard } from "../api/lobbieDashboardApi";
import "./DetailView.css";

function DetailView({ startDate, endDate }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [expanded, setExpanded] = useState({}); // {patientId: boolean}

  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString();
  };

  // normalize any possible API shape
  const normalizeRow = (r = {}, patientName, patientId) => ({
    patientId: patientId ?? r.patientId ?? r.patient_id ?? null,
    patient: patientName ?? r.patient ?? r.patientName ?? r.patient_name ?? "Unknown",
    formId: r.formId ?? r.form_id ?? r.id ?? null,
    form: r.form ?? r.formName ?? r.form_name ?? r.title ?? null,
    status: r.status ?? r.form_status ?? r.patient_status ?? r.patientStatus ?? "—",
    dueDate: r.dueDate ?? r.due_date ?? null,
    emailSent: r.emailSent ?? r.email_sent ?? null,
    smsSent: r.smsSent ?? r.sms_sent ?? null,
    created: r.created ?? r.form_created ?? r.created_at ?? null,
    location: r.location ?? "—",
    // nested table fields
    completion: r.completion ?? r.completionRate ?? r.percent ?? null,
    patientStatus:
      r.patientStatus ?? r.patient_status ?? (Number(r.completion) === 100 ? "Complete" : "Incomplete"),
  });

  // fetch & group by patient
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchLobbyDashboard({ startDate, endDate, _t: Date.now() });

        const grouped = {};
        (data || []).forEach((p) => {
          const name = p.patient ?? p.patientName ?? "Unknown";
          const id = String(p.patientId ?? p.patient_id ?? name);

          if (!grouped[id]) grouped[id] = { patientId: id, name, forms: [] };

          if (Array.isArray(p.forms) && p.forms.length) {
            grouped[id].forms.push(...p.forms.map((f) => normalizeRow(f, name, id)));
          } else {
            grouped[id].forms.push(normalizeRow(p, name, id));
          }
        });

        const list = Object.values(grouped);
        if (!cancel) setPatients(list);
      } catch (e) {
        console.error(e);
        if (!cancel) setError("Failed to load patient details.");
      } finally {
        if (!cancel) {
          setLoading(false);
        }
      }
    })();
    return () => { cancel = true; };
  }, [startDate, endDate]);

  // selection & expand
  const allSelected = useMemo(
    () => patients.length > 0 && selectedPatients.length === patients.length,
    [patients.length, selectedPatients.length]
  );

  const toggleSelect = (id) => {
    setSelectedPatients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedPatients(allSelected ? [] : patients.map((p) => p.patientId));
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div className="detail-view forms-like wide">
        <h2>Patient Forms</h2>
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="detail-view forms-like wide">
        <h2>Patient Forms</h2>
        {error}
      </div>
    );
  }

  return (
    <div className="detail-view forms-like wide">
      <h2>
        Patient Forms{" "}
        <span style={{ fontWeight: 400, fontSize: "0.95rem", color: "#64748b" }}>
          ({patients.length} patients)
        </span>
      </h2>

      {/* Top (patients) table */}
      <table className="patients-table">
        {/* Fix headers/body widths */}
        <colgroup>
          <col style={{ width: "32px" }} />   {/* checkbox column (tight) */}
          <col style={{ width: "28%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>

        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all patients"
              />
            </th>
            <th>Patient Name</th>
            <th>Forms</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Email Sent</th>
            <th>SMS Sent</th>
            <th>Created</th>
            <th>Location</th>
          </tr>
        </thead>

        <tbody>
          {patients.map((p) => {
            const first = p.forms?.[0] || {};
            const open = !!expanded[p.patientId];

            return (
              <React.Fragment key={p.patientId}>
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(p.patientId)}
                      onChange={() => toggleSelect(p.patientId)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>

                  {/* Patient name cell with aligned caret */}
                  <td onClick={() => toggleExpand(p.patientId)}>
                    <div className="patient-cell">
                      <span className={`caret ${open ? "open" : ""}`} aria-hidden="true" />
                      <span className="patient-name">{p.name}</span>
                    </div>
                  </td>

                  <td>{p.forms.length}</td>
                  <td>{first.status}</td>
                  <td>{fmtDate(first.dueDate)}</td>
                  <td>{fmtDate(first.emailSent)}</td>
                  <td>{first.smsSent ?? "—"}</td>
                  <td>{fmtDate(first.created)}</td>
                  <td>{first.location ?? "—"}</td>
                </tr>

                {/* Nested sub-table */}
                {open && (
                  <tr className="subtable-row">
                    <td></td>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <div className="subtable-wrapper">
                        <table className="forms-subtable">
                          <thead>
                            <tr>
                              <th style={{ width: "45%" }}>Template</th>
                              <th style={{ width: "15%" }}>Completion</th>
                              <th style={{ width: "20%" }}>Patient Status</th>
                              <th style={{ width: "20%" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.forms.map((f, i) => {
                              const completion =
                                f.completion != null
                                  ? `${Math.round(Number(f.completion) * 100) / 100}%`
                                  : f.completionRate != null
                                  ? `${f.completionRate}%`
                                  : "0%";

                              const pStatus =
                                f.patientStatus ||
                                (Number(f.completion) === 100 ? "Complete" : "Incomplete");

                              return (
                                <tr key={`${p.patientId}-${f.formId ?? i}`}>
                                  <td>{f.form || `Form ${i + 1}`}</td>
                                  <td>{completion}</td>
                                  <td className={pStatus === "Complete" ? "status-complete" : "status-incomplete"}>
                                    {pStatus}
                                  </td>
                                  <td>
                                    <div className="subtable-actions">
                                      <button className="pill-btn pill-outline" onClick={() => window.print()}>
                                        Print/PDF
                                      </button>
                                      <button
                                        className="pill-btn pill-solid"
                                        onClick={() => alert(`Open ${f.form || "Form"}`)}
                                      >
                                        View/Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}

          {patients.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                No patient records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DetailView;
