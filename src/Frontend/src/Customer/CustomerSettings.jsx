// Customer/CustomerSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CustomerSettings.css";

/* =========================
   API + Auth helpers
   ========================= */
const API_BASE = "http://127.0.0.1:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access_token") ||
  "";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

const getUserIdFromJWT = () => {
  const t = getToken();
  if (!t || t.split(".").length !== 3) return null;
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload?.sub || payload?.id || payload?.user_id || null;
  } catch { return null; }
};

/* simple inline icons */
const Icon = {
  Shield: () => (<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l7 3v6c0 5-3.5 9-7 11-3.5-2-7-6-7-11V5l7-3z" fill="currentColor"/></svg>),
  User: () => (<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a5 5 0 110 10 5 5 0 010-10zm0 12c4.418 0 8 2.239 8 5v3H4v-3c0-2.761 3.582-5 8-5z"/></svg>),
  Building: () => (<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 22V3a1 1 0 011-1h10l7 7v13H3zm12-12h6l-6-6v6z"/></svg>),
  Search: () => (<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.5 21.5 20 15.5 14zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>),
};

/* ---------------------------
   Standalone child components
   --------------------------- */

function ProfilePanel({ loadingProfile, profile, setProfile, onProfileChange, saveProfile, savingProfile }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2><Icon.User /> Personal details</h2>
        {loadingProfile && <span className="muted">Loading…</span>}
      </div>
      <form className="form" onSubmit={saveProfile}>
        <div className="form-row">
          <label htmlFor="full_name">Full Name</label>
          <input
            id="full_name"
            value={profile.full_name}
            onChange={onProfileChange("full_name")}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={profile.email}
            onChange={onProfileChange("email")}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="form-row">
          <label htmlFor="phone">Mobile</label>
          <input
            id="phone"
            inputMode="numeric"
            value={profile.phone}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setProfile((prev) => ({ ...prev, phone: v }));
            }}
            placeholder="9876543210"
            autoComplete="tel"
          />
        </div>
        <div className="actions">
          <button className="btn-primary" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function SecurityPanel({ pwd, onPwdChange, savePassword, savingPwd }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2><Icon.Shield /> Password & security</h2>
      </div>
      <form className="form" onSubmit={savePassword}>
        <div className="form-row">
          <label htmlFor="cur">Current password</label>
          <input
            id="cur"
            type="password"
            autoComplete="current-password"
            value={pwd.current}
            onChange={onPwdChange("current")}
            placeholder="••••••••"
          />
        </div>
        <div className="form-row">
          <label htmlFor="new">New password</label>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            value={pwd.next}
            onChange={onPwdChange("next")}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="form-row">
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={pwd.confirm}
            onChange={onPwdChange("confirm")}
            placeholder="Re-enter new password"
          />
        </div>
        <div className="actions">
          <button className="btn-secondary" disabled={savingPwd}>
            {savingPwd ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function OrgPanel({ org, loadingOrg }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2><Icon.Building /> GIA Homecare / Hospital info</h2>
        {loadingOrg && <span className="muted">Loading…</span>}
      </div>
      <div className="org-grid">
        <div>
          <div className="meta"><span>Organisation</span><strong>{org.org_name}</strong></div>
          <div className="meta"><span>Helpline</span><strong>{org.helpline || "—"}</strong></div>
          <div className="meta"><span>Email</span><strong>{org.email || "—"}</strong></div>
        </div>
        <div>
          <div className="meta"><span>Address</span><strong>{org.address || "—"}</strong></div>
          <div className="meta"><span>Visiting hours</span><strong>{org.visiting_hours || "—"}</strong></div>
          <div className="meta"><span>Website</span><strong>{org.website || "—"}</strong></div>
        </div>
      </div>
      <p className="muted tip">If something looks incorrect, contact support or your care coordinator.</p>
    </section>
  );
}

function MostVisited({ setActive }) {
  return (
    <div className="mv-grid">
      {[
        { k: "profile", title: "Personal details", desc: "Name, email, mobile", icon: <Icon.User /> },
        { k: "security", title: "Password", desc: "Change your password", icon: <Icon.Shield /> },
        { k: "org", title: "GIA Homecare", desc: "Hospital contact & info", icon: <Icon.Building /> },
      ].map((c) => (
        <button key={c.k} className="mv-card" onClick={() => setActive(c.k)}>
          <div className="mv-icon">{c.icon}</div>
          <div className="mv-title">{c.title}</div>
          <div className="mv-desc">{c.desc}</div>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------
   Parent container
   --------------------------- */

export default function CustomerSettings() {
  const navigate = useNavigate();

  const cachedUser = getUser();
  const userId =
    cachedUser?.id || cachedUser?.user_id || cachedUser?.ID || getUserIdFromJWT();

  if (!userId) {
    return (
      <div className="fb-like-settings" style={{ padding: 16 }}>
        <main className="main" style={{ width: "100%" }}>
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            No user ID found. Please log in again.
          </div>
          <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </main>
      </div>
    );
  }

  const ENDPOINTS = useMemo(() => ({
    profile: `${API_BASE}/users/${userId}`,
    changePassword: `${API_BASE}/users/${userId}`,
    orgInfoGet: `${API_BASE}/org/public-info`,
  }), [userId]);

  const authHeaders = useMemo(() => {
    const token = getToken();
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, [userId]);

  const [active, setActive] = useState("security");
  const [query, setQuery] = useState("");

  const [toast, setToast] = useState({ type: "", text: "" });
  const show = (type, text) => setToast({ type, text });
  const clearToast = () => setToast({ type: "", text: "" });

  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const [org, setOrg] = useState({
    org_name: "GIA Homecare",
    helpline: "", email: "", address: "", visiting_hours: "", website: "",
  });
  const [loadingOrg, setLoadingOrg] = useState(false);

  const onProfileChange = (field) => (e) =>
    setProfile((prev) => ({ ...prev, [field]: e.target.value }));
  const onPwdChange = (field) => (e) =>
    setPwd((prev) => ({ ...prev, [field]: e.target.value }));

  useEffect(() => {
    // Pre-seed from localStorage
    if (cachedUser) {
      const preFull =
        [cachedUser.first_name, cachedUser.last_name].filter(Boolean).join(" ") ||
        cachedUser.full_name || cachedUser.name || "";
      setProfile((p) => ({
        full_name: preFull || p.full_name,
        email: cachedUser.email || p.email,
        phone: cachedUser.mobile_phone || cachedUser.phone || p.phone,
      }));
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingProfile(true);
        const userRes = await axios.get(ENDPOINTS.profile, authHeaders);
        if (cancelled) return;
        const u = userRes?.data || {};
        const full_name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || "";
        setProfile({ full_name, email: u.email || "", phone: u.mobile_phone || u.phone || "" });
        localStorage.setItem("user", JSON.stringify({ ...(cachedUser || {}), ...u }));

        setLoadingOrg(true);
        const orgRes = await axios.get(ENDPOINTS.orgInfoGet).catch(() => null);
        if (!cancelled && orgRes?.data) {
          const d = orgRes.data;
          setOrg({
            org_name: d.org_name ?? "GIA Homecare",
            helpline: d.helpline ?? "",
            email: d.email ?? "",
            address: d.address ?? "",
            visiting_hours: d.visiting_hours ?? "",
            website: d.website ?? "",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
          setLoadingOrg(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ENDPOINTS.profile, ENDPOINTS.orgInfoGet, authHeaders, userId]);

  const validateProfile = () => {
    if (!profile.full_name.trim()) return "Name is required.";
    if (!/^\S+@\S+\.\S+$/.test(profile.email || "")) return "Enter a valid email.";
    if (!/^\d{7,15}$/.test((profile.phone || "").replace(/\D/g, "")))
      return "Mobile should be 7–15 digits.";
    return "";
  };

  const validatePassword = () => {
    if (!pwd.next || pwd.next.length < 8) return "New password must be at least 8 characters.";
    if (pwd.next !== pwd.confirm) return "New password and confirm do not match.";
    return "";
  };

  const saveProfile = async (e) => {
    e?.preventDefault?.();
    clearToast();
    const err = validateProfile();
    if (err) return show("error", err);

    setSavingProfile(true);
    try {
      const [first_name, ...rest] = profile.full_name.trim().split(" ");
      const payload = {
        first_name: first_name || "",
        last_name: rest.join(" "),
        email: profile.email.trim(),
        mobile_phone: profile.phone.trim(),
      };
      await axios.put(ENDPOINTS.profile, payload, authHeaders);
      localStorage.setItem("user", JSON.stringify({ ...(getUser() || {}), ...payload, id: userId }));
      show("success", "Profile updated.");
      setTimeout(() => clearToast(), 2500);
    } catch (ex) {
      show("error", ex?.response?.data?.error || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e?.preventDefault?.();
    clearToast();
    const err = validatePassword();
    if (err) return show("error", err);

    setSavingPwd(true);
    try {
      await axios.put(ENDPOINTS.changePassword, { password: pwd.next }, authHeaders);
      setPwd({ current: "", next: "", confirm: "" });
      show("success", "Password changed.");
      setTimeout(() => clearToast(), 2500);
    } catch (ex) {
      show("error", ex?.response?.data?.error || "Failed to change password.");
    } finally {
      setSavingPwd(false);
    }
  };

  const panels = [
    { key: "profile", label: "Personal details", icon: <Icon.User /> },
    { key: "security", label: "Password and security", icon: <Icon.Shield /> },
    { key: "org", label: "GIA Homecare info", icon: <Icon.Building /> },
  ];

  return (
    <div className="fb-like-settings">
      <aside className="rail">
        <div className="rail-title">Settings & privacy</div>
        <div className="rail-search">
          <span className="search-icon"><Icon.Search /></span>
          <input
            placeholder="Search settings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="rail-group">
          <div className="rail-group-title">ACCOUNTS CENTRE</div>
          <ul className="rail-list">
            {panels
              .filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <li key={p.key}>
                  <button
                    className={`rail-link ${active === p.key ? "active" : ""}`}
                    onClick={() => setActive(p.key)}
                  >
                    <span className="icon">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </aside>

      <main className="main">
        <div className="search-wide">
          <span className="search-icon"><Icon.Search /></span>
          <input placeholder="Find the setting that you need" />
        </div>

        <h3 className="section-title">Most visited settings</h3>
        <MostVisited setActive={setActive} />

        {toast.text && (
          <div className={`alert ${toast.type === "error" ? "alert-error" : "alert-success"}`}>
            {toast.text}
          </div>
        )}

        {active === "profile" && (
          <ProfilePanel
            loadingProfile={loadingProfile}
            profile={profile}
            setProfile={setProfile}
            onProfileChange={onProfileChange}
            saveProfile={saveProfile}
            savingProfile={savingProfile}
          />
        )}

        {active === "security" && (
          <SecurityPanel
            pwd={pwd}
            onPwdChange={onPwdChange}
            savePassword={savePassword}
            savingPwd={savingPwd}
          />
        )}

        {active === "org" && <OrgPanel org={org} loadingOrg={loadingOrg} />}
      </main>
    </div>
  );
}
