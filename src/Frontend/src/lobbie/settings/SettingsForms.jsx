// SettingsForms.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom"; // added useNavigate
import "./SettingsForms.css";
 
function SettingsForms() {
  const { formId } = useParams();
  const navigate = useNavigate(); //added
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("active");
  const [templates, setTemplates] = useState([]);
  const [previewForm, setPreviewForm] = useState(null);
 
  const handleCreateTemplate = () => {
    navigate("/dash/settings/create-template"); //fixed syntax
  };
 
  //Fetch details + fields for preview (must be defined before useEffect)
  const handlePreview = async (id) => {
    try {
      const resForm = await fetch(
        `http://localhost:5000/api/home/forms/${id}?ts=${Date.now()}`,
        { cache: "no-store", headers: { "Cache-Control": "no-store" } }
      );
      const formData = await resForm.json();
 
      const resFields = await fetch(
        `http://localhost:5000/api/home/forms/${id}/fields?ts=${Date.now()}`,
        { cache: "no-store", headers: { "Cache-Control": "no-store" } }
      );
      const fieldsData = await resFields.json();
 
      console.log("Preview data:", { ...formData, fields: fieldsData });
      setPreviewForm({ ...formData, fields: fieldsData });
    } catch (err) {
      console.error("Error fetching form details:", err);
    }
  };
 
  //Reusable fetch with no-cache + cache-buster
  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/home/forms?ts=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store",
            Pragma: "no-cache",
          },
        }
      );
      const data = await res.json();
      console.log("API DATA (fresh):", data);
      setTemplates(data || []);
    } catch (err) {
      console.error("Error fetching forms:", err);
    }
  }, []);
 
  // Fetch on mount
  useEffect(() => {
    fetchForms();
  }, [fetchForms]);
 
  // Re-fetch when window/tab regains focus
  useEffect(() => {
    const onFocus = () => fetchForms();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchForms]);
 
  // Auto-preview if formId exists in URL
  useEffect(() => {
    if (formId) handlePreview(formId);
  }, [formId]);
 
  // Filter by search input
  const filteredTemplates = templates.filter((t) =>
    (t.title || "").toLowerCase().includes(filter.toLowerCase())
  );
 
  return (
    <div className="settings-forms-container">
      {/* Header */}
      <div className="settings-forms-header">
        <strong>My Form Templates</strong>
        <span>Lobbie Form Template Library</span>
      </div>
 
      {/* Title Bar */}
      <div className="settings-forms-title-bar">
        <h1 className="settings-forms-title">
          Form Templates - Count: {filteredTemplates.length}
        </h1>
 
        {/*Manual refresh to pull latest DB state */}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="create-group-btn" onClick={handleCreateTemplate}>
            Create Template Group
          </button>
          <button className="create-group-btn" onClick={fetchForms}>
            Refresh
          </button>
        </div>
      </div>
 
      {/* Filters */}
      <div className="settings-forms-controls">
        <input
          className="filter-input"
          placeholder="Filter form templates by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
 
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="status"
              checked={status === "active"}
              onChange={() => setStatus("active")}
            />
            Active
          </label>
          <label>
            <input
              type="radio"
              name="status"
              checked={status === "inactive"}
              onChange={() => setStatus("inactive")}
            />
            Inactive
          </label>
        </div>
      </div>
 
      {/* Templates Table */}
      <table className="settings-forms-table">
        <thead>
          <tr>
            <th><input type="checkbox" /></th>
            <th>Select All</th>
            <th>Version</th>
            <th>Last Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredTemplates.map((t) => (
            <tr key={t.id}>
              <td><input type="checkbox" /></td>
              <td>
                <div>
                  <span className="template-icon">☰</span>
                  <div className="template-name">{t.title}</div>
                </div>
              </td>
              <td>{t.version || "-"}</td>
              <td>{t.updated_at || "-"}</td>
              <td className="actions-cell">
                <button
                  onClick={() => handlePreview(t.id)}
                  className="ui-btn ui-btn--primary"
                >
                  Preview
                </button>
                <a href="#print" className="ui-btn ui-btn--ghost">
                  Print
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
 
      {/* Preview Modal */}
      {previewForm && (
        <div className="preview-modal">
          <div className="preview-content">
            <h2>{previewForm.title}</h2>
            <p><strong>Status:</strong> {previewForm.status}</p>
            <p><strong>Last Updated:</strong> {previewForm.updated_at}</p>
 
            <form>
              {previewForm.fields?.map((field) => (
                <div key={field.field_id} className="form-group">
                  <label>
                    {field.field_label}{" "}
                    {field.is_required ? <span style={{ color: "red" }}>*</span> : ""}
                  </label>
                  {field.field_type === "Text" && <input type="text" className="form-control" />}
                  {field.field_type === "Date" && <input type="date" className="form-control" />}
                  {field.field_type === "Check" && <input type="checkbox" className="form-check" />}
                  {field.field_type === "Signature" && (
                    <input type="text" className="form-control" placeholder="Signature" />
                  )}
                  {field.field_type === "Drop Down" && (
                    <select className="form-control">
                      <option>Select...</option>
                    </select>
                  )}
                </div>
              ))}
            </form>
 
            <button onClick={() => setPreviewForm(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
 
export default SettingsForms;
