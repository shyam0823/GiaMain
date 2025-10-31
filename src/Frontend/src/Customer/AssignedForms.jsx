import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { fetchPatientById } from "../api/PatientApi";
import "./CustomerPage.css";

/* ---------------- helpers ---------------- */
const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("access_token") || "";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const parseJwt = (tok) => {
  if (!tok || tok.split(".").length < 2) return {};
  try {
    const base64 = tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
};

const normalizeRole = (r) => {
  const v = String(r || "").toLowerCase();
  if (v === "admin") return "admin";
  if (["user", "customer", "patient"].includes(v)) return "user";
  return "user";
};

const roleIsCustomer = (r) => normalizeRole(r) === "user";
const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const getDisplayName = (user, claims, rows) => {
  const fromRows =
    rows?.find?.((r) => r?.patient_name)?.patient_name ||
    rows?.find?.((r) => r?.PatientName)?.PatientName;

  const fromUser =
    user?.full_name ||
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    [user?.FirstName, user?.LastName].filter(Boolean).join(" ") ||
    user?.username;

  const fromClaims = claims?.name || claims?.full_name;

  return (fromRows || fromUser || fromClaims || "").trim();
};
/* ----------------------------------------- */

export default function AssignedForms() {
  const token = getToken();
  const claims = useMemo(() => parseJwt(token), [token]);
  const user = useMemo(getUser, []);

  const role = normalizeRole(
    user?.role_group ??
      user?.RoleGroup ??
      user?.role ??
      user?.Role ??
      claims?.role_group ??
      claims?.role
  );

  const patientId =
    user?.patient_id ??
    user?.customer_id ??
    user?.CustomerID ??
    claims?.patient_id ??
    user?.id ??
    user?.Id ??
    91; // fallback dev ID

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  // Load assigned forms
  useEffect(() => {
    if (!roleIsCustomer(role)) {
      setRows([]);
      setLoading(false);
      return;
    }

    const source = axios.CancelToken.source();
    setLoading(true);

    axios
      .get(`/api/home/patient_forms/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cancelToken: source.token,
      })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Load patient forms failed:", err))
      .finally(() => setLoading(false));

    return () => source.cancel();
  }, [patientId, role, token]);

  // Compute name dynamically
  useEffect(() => {
    const derived = getDisplayName(user, claims, rows);
    if (derived) {
      setDisplayName(derived);
      return;
    }

    if (!derived && patientId) {
      fetchPatientById(patientId)
        .then((p) => {
          const first =
            p.first_name || p.FirstName || p.name?.split(" ")[0] || "";
          const last =
            p.last_name || p.LastName || p.name?.split(" ").slice(1).join(" ") || "";
          const full =
            p.full_name ||
            p.name ||
            `${first} ${last}`.trim() ||
            `Patient #${patientId}`;
          setDisplayName(full);
          const u = getUser();
          const updatedUser = { ...u, first_name: first, last_name: last, full_name: full };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        })
        .catch((err) => console.error("Failed to fetch patient:", err));
    }
  }, [rows, user, claims, patientId]);

  const allFormIds = rows.map((r) => r.form_id || r.formId);

  return (
    <div className="customer-container">
      <main className="customer-main">
        <h2>
          Assigned Forms{displayName ? ` — ${displayName}` : ` — Patient #${patientId}`}
        </h2>

        <div className="forms-section">
          {loading && <p>Loading...</p>}
          {!loading && rows.length === 0 && <p>No forms assigned yet.</p>}

          {!loading &&
            rows.map((r) => {
              const formId = r.form_id ?? r.formId;
              const name = r.form_name ?? r.form ?? "Untitled Form";

              const completionRaw =
                r.completion ??
                r.completion_percentage ??
                r.progress ??
                r.progress_pct ??
                0;

              const completionVal = Math.max(0, Math.min(100, num(completionRaw)));
              const completion = completionVal.toFixed(2);

              const status =
                r.status || (completionVal >= 100 ? "Completed" : "Active");

              const patientName =
                r.patient_name ||
                r.PatientName ||
                displayName ||
                `Patient #${patientId}`;

              return (
                <div key={formId} className="form-card">
                  <div className="row">
                    <strong>{name}</strong>
                    <span>
                      {completion}% • {status}
                    </span>
                  </div>

                  <div className="patient-meta">Patient: {patientName}</div>

                  <div className="row">
                    <Link
                      className="btn"
                      to={`/form-editor/${formId}?patient=${patientId}&forms=${allFormIds.join(
                        ","
                      )}&from=customer`}
                    >
                      Fill / Edit
                    </Link>

                    <a
                      className="btn outline"
                      href={`/print/forms/${formId}?customerId=${patientId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview / Print
                    </a>
                  </div>
                </div>
              );
            })}
        </div>
      </main>
    </div>
  );
}
