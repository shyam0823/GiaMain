import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const getDisplayName = (user, claims) => {
  const fromUser =
    user?.full_name ||
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    [user?.FirstName, user?.LastName].filter(Boolean).join(" ") ||
    user?.username;

  const fromClaims = claims?.name || claims?.full_name;

  return (fromUser || fromClaims || "").trim();
};

// date helpers (IST friendly formatting)
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDateTime = (d) =>
  d?.toLocaleString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) || "";

const daysLeft = (d) => {
  if (!d) return null;
  const ms = d.setHours(23, 59, 59, 999) - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
/* ----------------------------------------- */

export default function CustomerPage() {
  const navigate = useNavigate();
  const token = getToken();
  const claims = useMemo(() => parseJwt(token), [token]);
  const user = useMemo(getUser, []);

  const patientId =
    user?.patient_id ??
    user?.customer_id ??
    user?.CustomerID ??
    claims?.patient_id ??
    user?.id ??
    user?.Id ??
    91; // fallback dev ID

  const [displayName, setDisplayName] = useState("");
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(true);

  const [nextAppt, setNextAppt] = useState(null);
  const [apptLoading, setApptLoading] = useState(true);

  // Compute / fetch patient name
  useEffect(() => {
    const derived = getDisplayName(user, claims);
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
            p.last_name ||
            p.LastName ||
            p.name?.split(" ").slice(1).join(" ") ||
            "";
          const full =
            p.full_name ||
            p.name ||
            `${first} ${last}`.trim() ||
            `Patient #${patientId}`;
          setDisplayName(full);
          const u = getUser();
          const updatedUser = {
            ...u,
            first_name: first,
            last_name: last,
            full_name: full,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        })
        .catch((err) => console.error("Failed to fetch patient:", err));
    }
  }, [user, claims, patientId]);

  /* ---------------- Assigned forms (for dashboard summary) ---------------- */
  useEffect(() => {
    const source = axios.CancelToken.source();
    setFormsLoading(true);

    axios
      .get(`/api/home/patient_forms/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cancelToken: source.token,
      })
      .then((res) => setForms(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Load patient forms failed:", err);
        setForms([]);
      })
      .finally(() => setFormsLoading(false));

    return () => source.cancel();
  }, [patientId, token]);

  // forms KPIs + next due
  const formsAssigned = forms.length;
  const formsCompleted = forms.filter((r) => {
    const raw =
      r.completion ??
      r.completion_percentage ??
      r.progress ??
      r.progress_pct ??
      0;
    return num(raw, 0) >= 100;
  }).length;

  const upcomingDue = (() => {
    const mapped = forms
      .map((r) => {
        const id = r.form_id ?? r.formId;
        const name = r.form_name ?? r.form ?? "Untitled Form";
        const completionRaw =
          r.completion ??
          r.completion_percentage ??
          r.progress ??
          r.progress_pct ??
          0;
        const completion = Math.max(0, Math.min(100, num(completionRaw)));
        const due =
          toDate(r.due_date || r.dueDate || r.DueDate || r.deadline || r.Deadline) ||
          null;
        return { id, name, completion, due };
      })
      .filter((x) => x.id && x.completion < 100 && x.due);

    if (!mapped.length) return null;
    mapped.sort((a, b) => a.due - b.due);
    return mapped[0];
  })();

  /* ---------------- Next appointment (booked) ---------------- */
  useEffect(() => {
    const source = axios.CancelToken.source();
    setApptLoading(true);

    // Prefer email; fall back to name if email missing
    const email =
      user?.email || user?.Email || user?.username || "";
    const name =
      (!email &&
        (user?.full_name ||
          [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
          user?.name)) ||
      "";
    const phone = (!email && !name && (user?.phone || user?.Phone)) || "";

    axios
      .get(`/api/appointment`, {
        headers: { Authorization: `Bearer ${token}` },
        cancelToken: source.token,
        params: {
          email: email || undefined,
          name: name || undefined,
          phone: phone || undefined,
          upcoming: 1,
        },
      })
      .then(({ data }) => {
        const arr = Array.isArray(data) ? data : [];
        if (!arr.length) {
          setNextAppt(null);
          return;
        }

        // normalize fields → keep BOTH doctorName and specialty
        const next =
          arr
            .map((a) => {
              const dt = new Date(
                `${a.date}T${(a.time || "00:00:00").slice(0, 8)}`
              );
              return {
                id: a.id,
                dt: isNaN(dt.getTime()) ? null : dt,
                status: a.status || "Booked",
                doctorName: a.doctorName || a.DoctorName || "", // person name if present
                specialty: a.specialty || a.Specialist || a.doctor || "", // specialization/department
                location: a.location || "",
                reason: a.reason || "",
              };
            })
            .filter((x) => x.dt && x.dt.getTime() >= Date.now())
            .sort((a, b) => a.dt - b.dt)[0] || null;

        setNextAppt(next);
      })
      .catch((err) => {
        console.error("Failed to fetch appointments:", err);
        setNextAppt(null);
      })
      .finally(() => setApptLoading(false));

    return () => source.cancel();
  }, [token, user]);

  return (
    <div className="customer-container">
      <main className="customer-main">
        <h2>
          Welcome{displayName ? `, ${displayName}` : `, Patient #${patientId}`}
        </h2>

        {/* ===== Dashboard tiles ===== */}
        <div className="forms-section">
          {/* Next Appointment */}
          {!apptLoading && nextAppt && (
            <div className="form-card">
              <div className="row">
                <strong>Next Appointment</strong>
                <span className="opacity-70">{nextAppt.status}</span>
              </div>

              <div className="patient-meta">
                {fmtDateTime(nextAppt.dt)}
                {nextAppt.specialty ? ` • ${nextAppt.specialty}` : ""}
                {nextAppt.doctorName ? ` • Dr. ${nextAppt.doctorName}` : ""}
              </div>

              <div className="row">
                {/* <Link className="btn" to="/customer/appointment">
                 View / Manage
                </Link>*/}
                <button
                  className="btn outline"
                  onClick={() => navigate("/customer/appointment")}
                >
                  Book Another
                </button>
              </div>
            </div>
          )}

          {/* If no upcoming appointment, show CTA */}
          {!apptLoading && !nextAppt && (
            <div className="form-card">
              <div className="row">
                <strong>No Upcoming Appointment</strong>
                <span className="opacity-70">Book your next visit</span>
              </div>
              <div className="row">
                <button
                  className="btn"
                  onClick={() => navigate("/customer/appointment")}
                >
                  Book Appointment
                </button>
              </div>
            </div>
          )}

          {/* Assigned Forms summary + next due */}
          <div className="form-card">
            <div className="row">
              <strong>Assigned Forms</strong>
              {!formsLoading && (
                <span className="opacity-70">
                  {formsCompleted}/{formsAssigned} completed
                </span>
              )}
              {formsLoading && <span className="opacity-70">Loading…</span>}
            </div>

            {!formsLoading && upcomingDue && (
              <div className="patient-meta">
                Next due: <b>{upcomingDue.name}</b>
                {" — "}
                <span>
                  {fmtDateTime(upcomingDue.due)}{" "}
                  {(() => {
                    const d = daysLeft(new Date(upcomingDue.due));
                    return Number.isFinite(d)
                      ? `(${d} day${d === 1 ? "" : "s"} left)`
                      : "";
                  })()}
                </span>
              </div>
            )}

            {!formsLoading && !upcomingDue && formsAssigned > 0 && (
              <div className="patient-meta">All set! No pending due dates.</div>
            )}

            {!formsLoading && formsAssigned === 0 && (
              <div className="patient-meta">No forms assigned yet.</div>
            )}

            <div className="row">
              <button
                className="btn"
                onClick={() => navigate("/customer/forms")}
              >
                Open Assigned Forms
              </button>
             {/* <a
                className="btn outline"
                href="/forms-list"
                target="_blank"
                rel="noreferrer"
              >
                View All (Read-Only)
              </a>*/}
            </div>
          </div>
        </div>
        {/* ===== end tiles ===== */}
      </main>
    </div>
  );
}
