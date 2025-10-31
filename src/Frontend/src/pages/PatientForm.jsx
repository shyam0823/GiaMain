import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function PatientForm() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [statusMsg, setStatusMsg] = useState("");

  // Fetch form details from backend
  useEffect(() => {
    fetch(`http://127.0.0.1:5000/home/forms/${formId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setForm(data);
        } else {
          setStatusMsg("Form not found");
        }
      })
      .catch((err) => {
        console.error("Error loading form:", err);
        setStatusMsg("Error loading form");
      });
  }, [formId]);

  //  Handle input change
  const handleChange = (fieldId, value) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  //  Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("Submitting...");

    try {
      const res = await fetch(`http://127.0.0.1:5000/home/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Submitted",
          fields: Object.keys(responses).map((fid) => ({
            field_id: fid,
            response_value: responses[fid],
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(" Form submitted successfully!");
      } else {
        setStatusMsg("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Submit error:", err);
      setStatusMsg("❌ Error submitting form");
    }
  };

  if (!form) return <p>{statusMsg || "Loading form..."}</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>
      <h1>{form.title}</h1>
      <p>Status: {form.status}</p>

      <form onSubmit={handleSubmit}>
        {form.fields?.map((field) => (
          <div key={field.field_id} style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>
              {field.field_label}{" "}
              {field.is_required ? <span style={{ color: "red" }}>*</span> : ""}
            </label>
            <input
              type={field.field_type === "text" ? "text" : "text"}
              required={field.is_required}
              value={responses[field.field_id] || ""}
              onChange={(e) => handleChange(field.field_id, e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>
        ))}
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Submit
        </button>
      </form>

      {statusMsg && <p style={{ marginTop: "15px" }}>{statusMsg}</p>}
    </div>
  );
}

export default PatientForm;
