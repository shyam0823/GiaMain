import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import "./SendForms.css";

function SendForms() {
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState("patient");
  const [recipients, setRecipients] = useState([
    {
      name: "",
      email: "",
      phone: "",
      patientId: null,
      location: "GIA HR",
      dueDate: "",
      visibility: "All",
    },
  ]);
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedForms, setSelectedForms] = useState([]);
  const [sent, setSent] = useState(false);
  const [sentTime, setSentTime] = useState(null);
  const [qrTokens, setQrTokens] = useState({});
  const [loading, setLoading] = useState(false);
  const [deliveryLog, setDeliveryLog] = useState([]); //track email/SMS sent timestamps

  // Fetch forms when on step 3
  useEffect(() => {
    if (step === 3) {
      fetch("http://127.0.0.1:5000/api/home/forms")
        .then((res) => res.json())
        .then(setForms)
        .catch((err) => console.error("Error fetching forms", err));
    }
  }, [step]);

  // Search patients
  const searchPatients = async (value) => {
    if (value.length < 2) {
      setPatientSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/home/patients/search?q=${value}`
      );
      const data = await res.json();
      setPatientSuggestions(data);
    } catch (err) {
      console.error("Error fetching patients", err);
    }
  };

  // Recipient field change
  const handleRecipientChange = (index, field, value) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
    if (field === "name") searchPatients(value);
  };

  // Select patient from suggestions
  const selectPatient = (index, patient) => {
    const updated = [...recipients];
    updated[index].name = patient.name;
    updated[index].email = patient.email;
    updated[index].phone = patient.phone;
    updated[index].patientId = patient.patient_id;
    setRecipients(updated);
    setPatientSuggestions([]);
  };

  // Add/remove recipients
  const addRecipient = () => {
    setRecipients([
      ...recipients,
      {
        name: "",
        email: "",
        phone: "",
        patientId: null,
        location: "GIA HR",
        dueDate: "",
        visibility: "All",
      },
    ]);
  };
  const removeRecipient = (index) => {
    const updated = [...recipients];
    updated.splice(index, 1);
    setRecipients(updated);
  };

  // Toggle form selection
  const toggleFormSelection = (formId) => {
    setSelectedForms((prev) =>
      prev.includes(formId)
        ? prev.filter((id) => id !== formId)
        : [...prev, formId]
    );
  };

  // Confirm & Send
  const handleConfirmSend = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const selectedFormObjs = forms.filter((f) =>
        selectedForms.includes(f.id)
      );

      let resp;
      let result = {};
      if (delivery === "patient" || delivery === "office" || delivery === "sms") {
        //  All deliveries handled by backend /send_forms
        resp = await fetch("http://127.0.0.1:5000/api/home/send_forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients, forms: selectedFormObjs, delivery }),
        });
        if (!resp.ok) throw new Error("Failed to send forms");
        result = await resp.json();
        if (result.qr_tokens) setQrTokens(result.qr_tokens);
      }

      // Save logs with real timestamps from backend
      if (result.recipients) {
        setDeliveryLog(
          result.recipients.map((r) => ({
            name: r.name,
            method: delivery,
            emailSent: r.emailSent,
            smsSent: r.smsSent,
          }))
        );
      }

      setSent(true);
      setSentTime(new Date().toLocaleString());
      setStep(5);
    } catch (err) {
      console.error("Error sending forms:", err);
      alert(`Error sending forms: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 5));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="sendforms-root">
      <h1>Send Forms</h1>

      {/* STEP 1: Delivery */}
      {step === 1 && (
        <div className="sendforms-step">
          <h2 className="sendforms-step-title">Delivery</h2>
          <p>Select how forms should be delivered to the patient(s).</p>
          <div className="sendforms-options">
            <label
              className={`sendforms-radio ${
                delivery === "patient" ? "checked" : ""
              }`}
            >
              <input
                type="radio"
                name="delivery"
                checked={delivery === "patient"}
                onChange={() => setDelivery("patient")}
              />
              <span className="custom-radio"></span>
              Send to Patients <span className="sendforms-option-sub">(Email)</span>
            </label>
            <label
              className={`sendforms-radio ${
                delivery === "sms" ? "checked" : ""
              }`}
            >
              <input
                type="radio"
                name="delivery"
                checked={delivery === "sms"}
                onChange={() => setDelivery("sms")}
              />
              <span className="custom-radio"></span>
              Send via SMS{" "}
              <span className="sendforms-option-sub">(Text Message)</span>
            </label>
            <label
              className={`sendforms-radio ${
                delivery === "office" ? "checked" : ""
              }`}
            >
              <input
                type="radio"
                name="delivery"
                checked={delivery === "office"}
                onChange={() => setDelivery("office")}
              />
              <span className="custom-radio"></span>
              Patient in-office{" "}
              <span className="sendforms-option-sub">(QR Code)</span>
            </label>
          </div>
          <button className="sendforms-next-btn" onClick={handleNext}>
            Next Step
          </button>
        </div>
      )}

      {/* STEP 2: Recipients */}
      {step === 2 && (
        <div className="sendforms-step">
          <h2 className="sendforms-step-title">Recipients</h2>
          {recipients.map((r, index) => (
            <div key={index} className="recipient-row">
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Find or create a new patient"
                  value={r.name}
                  onChange={(e) =>
                    handleRecipientChange(index, "name", e.target.value)
                  }
                />
                {patientSuggestions.length > 0 && (
                  <ul className="suggestion-list">
                    {patientSuggestions.map((p) => (
                      <li
                        key={p.patient_id}
                        onClick={() => selectPatient(index, p)}
                      >
                        <strong>{p.name}</strong> ({p.email}) {p.phone} DOB:{" "}
                        {p.dob}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <select
                value={r.location}
                onChange={(e) =>
                  handleRecipientChange(index, "location", e.target.value)
                }
              >
                <option value="GIA HR">GIA HR</option>
                <option value="Clinic A">Clinic A</option>
              </select>
              <input
                type="date"
                value={r.dueDate}
                onChange={(e) =>
                  handleRecipientChange(index, "dueDate", e.target.value)
                }
              />
              <select
                value={r.visibility}
                onChange={(e) =>
                  handleRecipientChange(index, "visibility", e.target.value)
                }
              >
                <option value="All">All</option>
                <option value="Private">Private</option>
              </select>
              <button className="remove-btn" onClick={() => removeRecipient(index)}>
                ✕
              </button>
            </div>
          ))}
          <button className="add-btn" onClick={addRecipient}>
            + Add recipient
          </button>
          <div className="form-actions">
            <button className="cancel-btn" onClick={handleBack}>
              Back
            </button>
            <button className="sendforms-next-btn" onClick={handleNext}>
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Forms */}
      {step === 3 && (
        <div className="sendforms-step">
          <h2 className="sendforms-step-title">Select Forms</h2>
          <div className="forms-grid">
            {forms.map((form) => (
              <label key={form.id} className="form-card">
                <input
                  type="checkbox"
                  checked={selectedForms.includes(form.id)}
                  onChange={() => toggleFormSelection(form.id)}
                />
                {form.title}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="cancel-btn" onClick={handleBack}>
              Back
            </button>
            <button className="sendforms-next-btn" onClick={handleNext}>
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirm */}
      {step === 4 && (
        <div className="sendforms-step">
          <h2 className="sendforms-step-title">Confirm & Send</h2>
          <ul>
            <li>
              <b>Delivery:</b> {delivery}
            </li>
            <li>
              <b>Recipients:</b>{" "}
              {recipients
                .map((r) => `${r.name} (${r.email || r.phone || "N/A"})`)
                .join(", ")}
            </li>
            <li>
              <b>Forms:</b>
              <ul>
                {forms
                  .filter((f) => selectedForms.includes(f.id))
                  .map((f) => (
                    <li key={f.id}>{f.title}</li>
                  ))}
              </ul>
            </li>
          </ul>
          <div className="form-actions">
            <button className="cancel-btn" onClick={handleBack}>
              Back
            </button>
            <button
              className="sendforms-submit-btn"
              onClick={handleConfirmSend}
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm & Send"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Sent */}
      {step === 5 && sent && (
        <div className="sendforms-step">
          <h2 className="sendforms-step-title">Forms Sent</h2>
          <p>
            {recipients.length} recipients were each sent{" "}
            {selectedForms.length} forms.
          </p>
          {sentTime && <p className="sent-time">📧 Sent on: {sentTime}</p>}

          {/* QR Codes for office delivery */}
          {delivery === "office" &&
            recipients.map((r) => {
              const qrUrl = qrTokens[r.patientId];
              return (
                <div key={r.patientId} className="qr-card">
                  <h4>{r.name}</h4>
                  <p>Scan to access all {selectedForms.length} forms</p>
                  {qrUrl && (
                    <div className="qr-code-wrapper">
                      <QRCode value={qrUrl} size={150} />
                    </div>
                  )}
                  {qrUrl && <p className="qr-url">{qrUrl}</p>}
                </div>
              );
            })}

          {/* Delivery log (email/sms sent timestamps) */}
          {deliveryLog.length > 0 && (
            <div className="delivery-log">
              <h3>Delivery Log</h3>
              <ul>
                {deliveryLog.map((log, idx) => (
                  <li key={idx}>
                    {log.name} → {log.method.toUpperCase()}{" "}
                    {log.emailSent && `📧 Email Sent: ${log.emailSent}`}{" "}
                    {log.smsSent && `📱 SMS Sent: ${log.smsSent}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <table className="sent-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Form</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) =>
                forms
                  .filter((f) => selectedForms.includes(f.id))
                  .map((f) => (
                    <tr key={`${r.name}-${f.id}`}>
                      <td>{r.name}</td>
                      <td>{f.title}</td>
                      <td>
                        {delivery === "patient"
                          ? `Email Sent ${deliveryLog.find((log) => log.name === r.name)?.emailSent || ""}`
                          : delivery === "sms"
                          ? `SMS Sent ${deliveryLog.find((log) => log.name === r.name)?.smsSent || ""}`
                          : "QR Generated"}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          <button
            className="cancel-btn"
            onClick={() => {
              setStep(1);
              setSent(false);
              setQrTokens({});
              setSelectedForms([]);
              setDeliveryLog([]);
            }}
          >
            Send More Forms
          </button>
        </div>
      )}
    </div>
  );
}

export default SendForms;
