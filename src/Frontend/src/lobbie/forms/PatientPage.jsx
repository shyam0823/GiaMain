import { useState, useEffect } from "react";
import { useSearch } from "../../context/SearchContext";
import { fetchPatients, createPatient, deletePatient } from "../../api/PatientApi";
import "./PatientPage.css";
import { useNavigate } from "react-router-dom";

const formatDatePretty = (input) => {
  if (!input) return "—";
  const s = String(input).trim();

  // Case 1: "YYYY-MM-DD"
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const date = new Date(Number(y), Number(m) - 1, Number(d)); // local-safe
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Case 2: "MM/DD/YYYY"
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const date = new Date(Number(y), Number(m) - 1, Number(d)); // local-safe
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Case 3: ISO or other parseable formats
  const date = new Date(s);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Fallback: return as-is
  return s;
};

function PatientPage() {
  const navigate = useNavigate();
  const { searchQuery } = useSearch();
  const [patients, setPatients] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    dob: "",
  });
  const [previewForm, setPreviewForm] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // ===== Load & helpers =====
  const loadPatients = () =>
    fetchPatients()
      .then((data) => {
        const sorted = data.sort((a, b) => new Date(b.created_on) - new Date(a.created_on));
        setPatients(sorted);
      })
      .catch(console.error);

  useEffect(() => {
    loadPatients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ===== Create =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newPatient = await createPatient(form);
      setPatients((prev) => [newPatient, ...prev]);
      setShowCreateForm(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", dob: "" });
      setSuccessMessage("Patient created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error creating patient:", error);
      alert("Failed to create patient. Please try again.");
    }
  };

  // ===== Delete single =====
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this patient?")) return;
    try {
      await deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Failed to delete patient.");
    }
  };

  // ===== Search filter =====
  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  // ===== Selection (checkboxes) =====
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleIds = filteredPatients.map((p) => p.id);
  const allVisibleSelected =
    allVisibleIds.every((id) => selectedIds.has(id)) && allVisibleIds.length > 0;

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of allVisibleIds) next.delete(id);
      } else {
        for (const id of allVisibleIds) next.add(id);
      }
      return next;
    });
  };

  // ===== Merge (only selected) =====
  const normEmail = (e) => (e || "").trim().toLowerCase();
  const normPhone = (p) => (p || "").replace(/\D/g, "");
  const normName = (s) =>
    (s || "").normalize("NFKD").replace(/\s+/g, " ").trim().toLowerCase();
  const normDob = (d) => (d || "").trim();

  const dedupeKey = (p) => {
    const e = normEmail(p.email);
    if (e) return `e:${e}`;
    const ph = normPhone(p.phone);
    if (ph) return `p:${ph}`;
    return `n:${normName(p.first_name)}|${normName(p.last_name)}|${normDob(p.dob)}`;
  };

  const handleMergeSelected = async () => {
    if (isMerging) return;
    const selected = patients.filter((p) => selectedIds.has(p.id));
    if (selected.length < 2) {
      alert("Select at least two rows to merge.");
      return;
    }
    if (
      !window.confirm(
        `Merge only the ${selected.length} selected rows (keep the newest in each duplicate group)?`
      )
    )
      return;

    setIsMerging(true);
    try {
      const groups = new Map();
      for (const p of selected) {
        const key = dedupeKey(p);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
      }

      const toDelete = [];
      for (const [, list] of groups) {
        if (list.length < 2) continue;
        const sorted = [...list].sort(
          (a, b) => new Date(b.created_on) - new Date(a.created_on)
        );
        const dups = sorted.slice(1);
        for (const d of dups) toDelete.push(d.id);
      }

      if (toDelete.length === 0) {
        setSuccessMessage("No duplicates inside the selected rows.");
        setTimeout(() => setSuccessMessage(""), 2500);
        setIsMerging(false);
        return;
      }

      for (const id of toDelete) {
        try {
          await deletePatient(id);
        } catch (err) {
          console.error("Failed to delete duplicate id=", id, err);
        }
      }

      await loadPatients();
      setSelectedIds(new Set());

      setSuccessMessage(
        `Merged ${toDelete.length} duplicate${toDelete.length > 1 ? "s" : ""} from selected rows.`
      );
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Merge failed:", err);
      alert("Merging failed. See console for details.");
    } finally {
      setIsMerging(false);
    }
  };

  // ===== Navigate to Send Forms page with selected patients =====
  const handleSendFormsClick = () => {
    const selectedPatients = patients
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({
        patient_id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        email: p.email || "",
        phone: p.phone || "",
        dob: p.dob || "",
      }));

    if (selectedPatients.length === 0) {
      alert("Select at least one patient to send forms.");
      return;
    }

    navigate("/dash/send-forms", {
      state: { recipientsFromPatients: selectedPatients },
    });
  };

  // ===== Form preview (unchanged) =====
  const handlePreviewForm = async (formId) => {
    try {
      const resForm = await fetch(`http://localhost:5000/api/home/forms/${formId}`);
      const formData = await resForm.json();
      const resFields = await fetch(
        `http://localhost:5000/api/home/forms/${formId}/fields`
      );
      const fieldsData = await resFields.json();
      setPreviewForm({ ...formData, fields: fieldsData });
    } catch (err) {
      console.error("Error fetching form preview:", err);
    }
  };

  return (
    <div className="patient-page-container">
      <div className="patient-page-header">
        <span className="header-title">Patients</span>
        <a href="#" className="import-link">Import Patients</a>
      </div>

      <div className="patient-actions">
        <button className="primary-btn" onClick={() => setShowCreateForm(true)}>
          Create Patient
        </button>

        <button
          className="secondary-btn"
          onClick={handleMergeSelected}
          disabled={isMerging || selectedIds.size < 2}
          title="Merge only the selected rows (same email/phone/name+DOB)"
        >
          {isMerging ? "Merging…" : `Merge Selected (${selectedIds.size})`}
        </button>

        <button
          className="secondary-btn"
          onClick={handleSendFormsClick}
          disabled={selectedIds.size === 0}
          title="Go to Send Forms with selected patients"
        >
          Send Forms to Selected Patients
        </button>
      </div>

      {successMessage && <div className="success-toast">{successMessage}</div>}

      {showCreateForm && (
        <div className="patient-modal-overlay">
          <form className="create-patient-modal" onSubmit={handleSubmit}>
            <h2>Create new patient</h2>
            <div className="form-grid">
              <div>
                <label>First Name *</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Last Name *</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="full-width">
                <label>Date of Birth</label>
                <input
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  placeholder="MM/DD/YYYY"
                />
              </div>
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="create-btn">
                Create Patient
              </button>
            </div>
          </form>
        </div>
      )}

      <table className="patient-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                aria-label="Select all visible"
              />
            </th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>DOB</th>
            <th>Created On</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredPatients.length > 0 ? (
            filteredPatients.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                  />
                </td>
                <td>{p.first_name}</td>
                <td>{p.last_name}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>{formatDatePretty(p.dob)}</td>
                <td>{formatDatePretty(p.created_on)}</td>
                <td>
                  {p.forms?.map((f) => (
                    <button
                      key={f.formId}
                      className="action-link"
                      onClick={() => handlePreviewForm(f.formId)}
                    >
                      Preview {f.form}
                    </button>
                  ))}
                </td>
                <td>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10" style={{ textAlign: "center", padding: "15px" }}>
                No patients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {previewForm && (
        <div className="preview-modal">
          <div className="preview-content">
            <h2>{previewForm.title}</h2>
            <p>
              <strong>Status:</strong> {previewForm.status}
            </p>
            <p>
              <strong>Due Date:</strong> {previewForm.dueDate || "—"}
            </p>
            <p>
              <strong>Location:</strong> {previewForm.location}
            </p>

            <form>
              {previewForm.fields?.map((field) => (
                <div key={field.field_id} className="form-group">
                  <label>
                    {field.field_label}{" "}
                    {field.is_required ? <span style={{ color: "red" }}>*</span> : ""}
                  </label>

                  {field.field_type === "Text" && (
                    <input type="text" className="form-control" />
                  )}
                  {field.field_type === "Date" && (
                    <input type="date" className="form-control" />
                  )}
                  {field.field_type === "Check" && (
                    <input type="checkbox" className="form-check" />
                  )}
                  {field.field_type === "Signature" && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Signature"
                    />
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

export default PatientPage;
