import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "./FormPrintView.css";

/**
 * FormPrintView.jsx
 * -----------------
 * Printable read-only layout for a patient's assigned form.
 * URL: /print/forms/:formId?customerId=<id>
 */

export default function FormPrintView() {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customerId");
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    document.title = "Print Preview - GIA Home Care";
    const load = async () => {
      try {
        // Use your existing backend that returns title/status/due/completion & patientName
        const res = await fetch(`/api/home/forms/${formId}?patientId=${customerId || ""}`);
        if (!res.ok) return;
        const data = await res.json();
        setFormData({
          patientName: data.patientName,
          formTitle: data.title,
          status: data.status || "Active",
          dueDate: data.dueDate,
          completion: data.completion,
          description: undefined, // (optional) put anything printed below
        });
      } catch (e) {
        console.error("Print view fetch failed:", e);
      }
    };
    if (formId) load();
  }, [formId, customerId]);

  const handlePrint = () => window.print();

  return (
    <div className="print-view-container">
      <div className="print-view-header no-print">
        <div>
          <h2 className="print-view-title">🧾 GIA Home Care</h2>
          <p className="print-view-subtitle">Form Print Preview</p>
        </div>
        <button className="print-btn" onClick={handlePrint}>
          🖨️ Print / Download PDF
        </button>
      </div>

      <div className="print-view-content">
        <h3 className="section-title">Patient Information</h3>
        {formData ? (
          <>
            <p><strong>Patient Name:</strong> {formData.patientName || "-"}</p>
            <p><strong>Form Title:</strong> {formData.formTitle || "-"}</p>
            <p><strong>Status:</strong> {formData.status || "-"}</p>
            <p><strong>Due Date:</strong> {formData.dueDate || "-"}</p>
            <p><strong>Completion:</strong> {Number(formData.completion || 0).toFixed(2)}%</p>
          </>
        ) : (
          <>
            <p><strong>Patient Name:</strong> —</p>
            <p><strong>Form Title:</strong> —</p>
            <p><strong>Status:</strong> —</p>
            <p><strong>Due Date:</strong> —</p>
            <p><strong>Completion:</strong> —</p>
          </>
        )}

        <hr className="divider" />

        <h3 className="section-title">Form Details</h3>
        <p className="form-desc">
          {formData?.description ||
            "This is a print preview layout for the assigned patient form. The actual form fields and data will appear here dynamically based on backend responses."}
        </p>
      </div>

      <footer className="print-footer no-print">
        <p>© {new Date().getFullYear()} GIA Home Care — Confidential</p>
      </footer>
    </div>
  );
}
