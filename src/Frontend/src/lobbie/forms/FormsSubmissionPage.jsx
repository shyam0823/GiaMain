import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

function PatientForm() {
  const { formId } = useParams();       // /forms/:formId
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient"); // from ?patient=123

  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Fetch form details
  useEffect(() => {
    fetch(`http://127.0.0.1:5000/api/home/forms/${formId}`)
      .then(res => res.json())
      .then(setForm)
      .catch(err => console.error("Error loading form", err));
  }, [formId]);

  const handleChange = (fieldId, value) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    try {
      const resp = await fetch(`http://127.0.0.1:5000/api/home/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          status: "Submitted",
          fields: Object.entries(responses).map(([field_id, response_value]) => ({
            field_id,
            response_value
          }))
        })
      });

      if (!resp.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch (err) {
      alert("Error submitting form: " + err.message);
    }
  };

  if (!form) return <p>Loading form...</p>;
  if (submitted) return <h2> Thank you! Your form has been submitted.</h2>;

  return (
    <div>
      <h1>{form.title}</h1>
      <p>Patient: {form.patientName}</p>
      <form>
        {form.fields.map((f) => (
          <div key={f.field_id} style={{ marginBottom: "12px" }}>
            <label>
              {f.field_label} {f.is_required ? "*" : ""}:
            </label>
            {f.field_type === "text" && (
              <input
                type="text"
                value={responses[f.field_id] || ""}
                onChange={(e) => handleChange(f.field_id, e.target.value)}
              />
            )}
            {f.field_type === "date" && (
              <input
                type="date"
                value={responses[f.field_id] || ""}
                onChange={(e) => handleChange(f.field_id, e.target.value)}
              />
            )}
            {f.field_type === "textarea" && (
              <textarea
                value={responses[f.field_id] || ""}
                onChange={(e) => handleChange(f.field_id, e.target.value)}
              />
            )}
          </div>
        ))}
      </form>
      <button onClick={handleSubmit}>Submit Form</button>
    </div>
  );
}

export default PatientForm;
