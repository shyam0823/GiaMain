import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./PatientFormsList.css";

function PatientFormsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [forms, setForms] = useState([]);
  const [patientName, setPatientName] = useState("");
  const patientId = searchParams.get("patient");

  const normalizeCompletion = (val) => {
    if (typeof val !== "number") return 0;
    return val > 1 ? val : val * 100; // support 0–1 or 0–100
  };

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:5000/home/patient_forms/${patientId}`
        );
        const data = await res.json();

        setForms(data || []);
        if (data.length > 0) {
          setPatientName(`Patient ${patientId}`);
        }
      } catch (err) {
        console.error("Error fetching forms:", err);
      }
    };

    if (patientId) fetchForms();
  }, [patientId]);

  const handleOpenForm = (formId, allFormIds) => {
    navigate(
      `/form-editor/${formId}?patient=${patientId}&forms=${allFormIds.join(",")}`
    );
  };

  if (!patientId) return <p>Invalid patient link</p>;

  return (
    <div className="patient-forms-list">
      <h2>Assigned Forms for {patientName}</h2>
      {forms.length === 0 ? (
        <p>No forms assigned.</p>
      ) : (
        <table className="patient-forms-table">
          <thead>
            <tr>
              <th>Form</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Completion</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => {
              const pct = normalizeCompletion(form.completion);

              return (
                <tr key={form.form_id}>
                  <td>{form.form_name}</td>
                  <td
                    style={{
                      color:
                        form.status === "Completed"
                          ? "green"
                          : form.status === "Active"
                          ? "#1a73e8"
                          : "gray",
                    }}
                  >
                    {form.status || "Not Started"}
                  </td>
                  <td>{form.dueDate || "—"}</td>
                  <td style={{ width: "150px" }}>
                    <div
                      style={{
                        background: "#eee",
                        borderRadius: "6px",
                        height: "8px",
                        width: "100%",
                        marginBottom: "4px",
                      }}
                    >
                      <div
                        style={{
                          background: "#1a73e8",
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: "6px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    {pct}%
                  </td>
                  <td>
                    <button
                      className="view-edit-btn"
                      onClick={() =>
                        handleOpenForm(
                          form.form_id,
                          forms.map((f) => f.form_id)
                        )
                      }
                    >
                      View/Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PatientFormsList;
