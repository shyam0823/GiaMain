// Frontend/src/lobbie/pages/MedicalHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./MedicalHistory.css";

const API_BASE = "http://127.0.0.1:5000";

/* ----------------------------- Small UI bits ------------------------------ */
const StatusPill = ({ status = "pending" }) => {
  const s = String(status || "").toLowerCase();
  return <span className={`mh-pill mh-${s}`}>{s.replace(/^\w/, c => c.toUpperCase())}</span>;
};

const Section = ({ title, right, children }) => (
  <section className="mh-card">
    <div className="mh-card-head">
      <h3>{title}</h3>
      <div>{right}</div>
    </div>
    <div>{children}</div>
  </section>
);

const Empty = ({ text }) => (
  <div className="mh-empty">
    <p>{text}</p>
  </div>
);

/* ------------------------- helpers to get current user -------------------- */
const getStoredJson = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
};

const getCurrentUser = () => {
  // prefer "user" (your login payload), fallback to "patientData"
  const u = getStoredJson("user") || getStoredJson("patientData") || {};
  return {
    id:
      u.id ??
      u.user_id ??
      u.patient_id ??
      null,
    email: u.email || "",
    first_name: u.first_name || u.firstName || "",
    last_name: u.last_name || u.lastName || "",
    name:
      u.full_name ||
      u.name ||
      [u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(" "),
  };
};

/* ------------------------------- Component -------------------------------- */
export default function MedicalHistory() {
  const current = getCurrentUser();

  // Resolve patientId and email robustly from localStorage
  const [patientId] = useState(() => {
    const fromDirect =
      localStorage.getItem("patientId") ||
      localStorage.getItem("customerId");
    if (fromDirect) return fromDirect;

    if (current?.id) return String(current.id);
    const pd = getStoredJson("patientData");
    return pd?.id || pd?.patient_id || "";
  });

  const [email] = useState(() => {
    const e =
      current?.email ||
      (getStoredJson("patientData")?.email ?? "");
    return e || "";
  });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [updates, setUpdates] = useState([]);

  // Welcome name (read-only)
  const displayName =
    (current?.name && String(current.name).trim()) ||
    [current?.first_name, current?.last_name].filter(Boolean).join(" ").trim() ||
    (patientId ? `Patient #${patientId}` : "Patient");

  // -------------------------- mappers for your APIs -------------------------
  const mapAppointments = (raw) => {
    // Try to adapt different shapes to: {id,date,doctor,department,status,location}
    if (!raw) return [];
    // If backend returned { appointments: [...] }
    const list = Array.isArray(raw?.appointments) ? raw.appointments : Array.isArray(raw) ? raw : [];

    return list.map((a, i) => {
      // guess fields by common names
      const date =
        a.date ||
        a.when ||
        a.start_time ||
        a.start ||
        a.datetime ||
        a.appointment_time ||
        a.created_at ||
        a.updated_at ||
        a.scheduled_for;

      const doctor =
        a.doctor ||
        a.provider ||
        a.physician ||
        a.doctor_name ||
        a.provider_name ||
        "";

      const department =
        a.department ||
        a.speciality ||
        a.specialty ||
        a.unit ||
        "";

      const status =
        (a.status || a.state || a.appointment_status || "booked").toString().toLowerCase();

      const location =
        a.location ||
        a.room ||
        a.clinic ||
        a.site ||
        "";

      return {
        id: a.id ?? a.appointment_id ?? `appt-${i}`,
        date,
        doctor,
        department,
        status,
        location,
      };
    });
  };

  const mapUpdatesFromForms = (raw) => {
    // We’ll use your /api/home/patient_forms/:id feed as “medical updates”.
    // Target shape: {id,type,date,summary}
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.forms) ? raw.forms : [];

    return list.map((f, i) => {
      // Common fields seen in your app: title, dueDate, status, location
      const type = f.type || f.category || f.form || f.title || "Form Update";
      const date =
        f.date ||
        f.dueDate ||
        f.created_at ||
        f.updated_at ||
        f.assigned_at ||
        f.completed_at ||
        null;

      const summaryPieces = [
        f.title || f.form || "",
        f.status ? `Status: ${f.status}` : "",
        f.location ? `Location: ${f.location}` : "",
        f.description || f.summary || ""
      ].filter(Boolean);

      return {
        id: f.id ?? f.formId ?? `upd-${i}`,
        type,
        date,
        summary: summaryPieces.join(" — ").trim() || "Update available.",
      };
    });
  };

  // ------------------------------ data loader -------------------------------
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");

      if (!patientId && !email) {
        setErr("No patient identity found. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        // Try your actual endpoints seen in logs:
        // 1) Appointments by email (primary)
        // 2) Fallback: a notional patient appointments endpoint (if you add it later)
        const apptPromises = [];
        if (email) {
          apptPromises.push(
            axios.get(`${API_BASE}/api/appointment`, {
              params: { email, all: 1 },
              signal: controller.signal,
            })
          );
        }
        if (patientId) {
          // optional fallback if you later expose it
          apptPromises.push(
            axios
              .get(`${API_BASE}/api/patient/${patientId}/appointments`, {
                signal: controller.signal,
              })
              .catch(() => null)
          );
        }

        // Medical updates from forms feed:
        const updatesPromise = patientId
          ? axios.get(`${API_BASE}/api/home/patient_forms/${patientId}`, {
              signal: controller.signal,
            })
          : Promise.resolve(null);

        const [apA, apB, up] = await Promise.allSettled([...apptPromises, updatesPromise]);

        // Appointments resolve: pick the first fulfilled with data
        let apptData = null;
        for (const r of [apA, apB]) {
          if (r && r.status === "fulfilled" && r.value?.data) {
            apptData = r.value.data;
            break;
          }
        }

        const mappedAppointments = mapAppointments(apptData);
        const mappedUpdates =
          up?.status === "fulfilled" && up.value?.data
            ? mapUpdatesFromForms(up.value.data)
            : [];

        if (!mounted) return;
        setAppointments(mappedAppointments);
        setUpdates(mappedUpdates);

        if (!apptData && !(up?.status === "fulfilled")) {
          // nothing loaded
          setErr("No medical history found for this patient.");
        }
      } catch (e) {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        console.error("Medical history load failed:", e);
        if (!mounted) return;

        setErr(
          e?.response?.data?.message ||
            "Could not load medical history at the moment."
        );
      } finally {
        mounted && setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [patientId, email]);

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredAppointments = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return appointments
      .filter(a => {
        if (statusFilter !== "all" && String(a.status).toLowerCase() !== statusFilter) {
          return false;
        }
        if (!needle) return true;
        return (
          String(a.doctor).toLowerCase().includes(needle) ||
          String(a.department).toLowerCase().includes(needle) ||
          String(a.location).toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [appointments, q, statusFilter]);

  const sortedUpdates = useMemo(
    () => [...updates].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [updates]
  );

  // Date helper
  const fmtDate = iso =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="mh-page">
      <header className="mh-header">
        <h2>Medical History</h2>
        <p className="mh-sub">Welcome, {displayName}</p>
        <p className="mh-sub">See your appointment status and medical updates.</p>
      </header>

      {err && <div className="mh-alert">{err}</div>}

      {/* Appointments */}
      <Section
        title="Appointments"
        right={
          <div className="mh-controls">
            <input
              className="mh-input"
              type="text"
              placeholder="Search doctor, department, location…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <select
              className="mh-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="mh-skeleton-list">
            <div className="mh-skel" />
            <div className="mh-skel" />
            <div className="mh-skel" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <Empty text="No appointments yet." />
        ) : (
          <ul className="mh-list">
            {filteredAppointments.map(a => (
              <li className="mh-row" key={a.id}>
                <div className="mh-row-main">
                  <div className="mh-row-title">
                    <span className="mh-when">{fmtDate(a.date)}</span>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="mh-row-sub">
                    <strong>{a.doctor || "—"}</strong>
                    <span className="mh-dot">•</span>
                    <span>{a.department || "—"}</span>
                    {a.location ? (
                      <>
                        <span className="mh-dot">•</span>
                        <span className="mh-dim">{a.location}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="mh-row-actions">
                  <button className="mh-btn ghost" onClick={() => {}}>
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Medical Updates */}
      <Section title="Medical Updates">
        {loading ? (
          <div className="mh-skeleton-list">
            <div className="mh-skel" />
            <div className="mh-skel" />
          </div>
        ) : sortedUpdates.length === 0 ? (
          <Empty text="No medical updates yet." />
        ) : (
          <ol className="mh-timeline">
            {sortedUpdates.map(u => (
              <li key={u.id} className="mh-tl-item">
                <div className="mh-tl-dot" />
                <div className="mh-tl-content">
                  <div className="mh-tl-head">
                    <span className="mh-tl-type">{u.type}</span>
                    <span className="mh-tl-date">{fmtDate(u.date)}</span>
                  </div>
                  <p className="mh-tl-text">{u.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
