// src/pages/ProfilePage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css"; // scoped CSS for this page only
import IconAvatar from "../assets/avatars/IconAvatar.svg"; //  correct path + URL import (Vite-friendly)

const SECTIONS = [
  { key: "overview",  label: "Overview",           icon: "👤" },
  { key: "security",  label: "Security info",      icon: "🔐" },
  { key: "devices",   label: "Devices",            icon: "💻" },
  { key: "password",  label: "Change password",    icon: "🔑" },
  { key: "orgs",      label: "Organizations",      icon: "🧳" },
  { key: "privacy",   label: "Settings & Privacy", icon: "⚙️"  },
  { key: "activity",  label: "Recent activity",    icon: "🕒" },
  { sep: true },
  { key: "apps",      label: "My Apps",            icon: "📦" },
  { key: "groups",    label: "My Groups",          icon: "👥" },
  { key: "access",    label: "My Access",          icon: "🪪" },
  { sep: true },
  { key: "feedback",  label: "Give feedback",      icon: "💬" },
];

export default function ProfilePage() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const name  = user?.fullName || user?.name || "User";
  const email = user?.email || "user@example.com";
  const [active, setActive] = useState("overview");

  return (
    <div className="gia-profile-shell">
      {/* Top bar */}
      <header className="gia-profile-topbar">
        <div className="brand">
          <span className="dotmenu">⋮⋮⋮</span>
          <span>GIA Homecare</span>
          <span aria-hidden> | </span>
          <span>My Account</span>
        </div>
        <button className="back-btn" onClick={() => navigate(-1)} title="Back">←</button>
      </header>

      {/* Layout */}
      <div className="gia-profile-layout">
        {/* Sidebar */}
        <aside className="gia-profile-sidebar">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {/* Use the SVG as an image URL */}
              <img src={IconAvatar} alt={`${name} avatar`} width={56} height={56} />
            </div>
            <div className="sidebar-name">{name}</div>
            <div className="sidebar-email">{email}</div>
          </div>

          <nav className="gia-profile-nav">
            {SECTIONS.map((item, i) =>
              item.sep ? (
                <hr className="nav-sep" key={`sep-${i}`} />
              ) : (
                <button
                  key={item.key}
                  type="button"
                  className={`nav-item ${active === item.key ? "active" : ""}`}
                  aria-current={active === item.key ? "page" : undefined}
                  onClick={() => setActive(item.key)}
                >
                  <span className="nav-icon" aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            )}
          </nav>
        </aside>

        {/* Main */}
        <main className="gia-profile-main">
          {/* Hero */}
          {active === "overview" && (
            <section className="gia-profile-card gia-profile-hero">
              <div className="hero-avatar">
                {/* Same neutral SVG in the hero */}
                <img
                  src={IconAvatar}
                  alt={`${name} avatar`}
                  width={64}
                  height={64}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "50%" }}
                />
                <button
                  type="button"
                  className="edit-pic"
                  title="Change picture"
                  onClick={() => alert("Hook your upload flow here")}
                >
                  
                </button>
              </div>

              <div className="hero-meta">
                <div className="hero-name">{name}</div>
                <div className="hero-email">{email}</div>
              </div>
            </section>
          )}

          {/* Overview tiles */}
          {active === "overview" && (
            <section className="gia-profile-grid">
              <div className="gia-profile-tile">
                <h3>Security info</h3>
                <p>Keep your verification methods and security info up to date.</p>
                <button className="linkish" onClick={() => setActive("security")}>UPDATE INFO ›</button>
              </div>

              <div className="gia-profile-tile">
                <h3>Change password</h3>
                <p>Make your password stronger, or change it if someone else knows it.</p>
                <button className="linkish" onClick={() => setActive("password")}>CHANGE PASSWORD ›</button>
              </div>

              <div className="gia-profile-tile">
                <h3>Devices</h3>
                <p>Disable a lost device and review your connected devices.</p>
                <button className="linkish" onClick={() => setActive("devices")}>MANAGE DEVICES ›</button>
              </div>

              <div className="gia-profile-tile">
                <h3>Organizations</h3>
                <p>See all the organizations that you’re a part of.</p>
                <button className="linkish" onClick={() => setActive("orgs")}>MANAGE ORGANIZATIONS ›</button>
              </div>
            </section>
          )}

          {/* Other sections (placeholders) */}
          {active === "security" && (
            <section className="gia-profile-card">
              <h2>Security info</h2>
              <div className="actions" style={{ marginTop: 12 }}>
                <button className="gia-profile-btn">Add method</button>
                <button className="gia-profile-btn" style={{ background: "#eef2f7", color: "#1a73e8" }}>Manage</button>
              </div>
            </section>
          )}

          {active === "devices" && (
            <section className="gia-profile-card">
              <h2>Devices</h2>
              <p style={{ color: "#475569" }}>Windows 11 • Edge (Active now)</p>
              <button className="gia-profile-btn" style={{ marginTop: 10 }}>Manage devices</button>
            </section>
          )}

          {active === "password" && (
            <section className="gia-profile-card">
              <h2>Change password</h2>
              <button className="gia-profile-btn" style={{ marginTop: 10 }}>Change password</button>
            </section>
          )}

          {active === "orgs" && (
            <section className="gia-profile-card">
              <h2>Organizations</h2>
              <p style={{ color: "#475569" }}>GIA Homecare — Member</p>
              <button className="gia-profile-btn" style={{ marginTop: 10 }}>Manage organizations</button>
            </section>
          )}

          {active === "privacy" && (
            <section className="gia-profile-card">
              <h2>Settings & Privacy</h2>
              <p style={{ color: "#475569" }}>Language: English (US)</p>
            </section>
          )}

          {active === "activity" && (
            <section className="gia-profile-card">
              <h2>Recent activity</h2>
              <ul style={{ marginTop: 8, color: "#475569" }}>
                <li>10:12 AM — Signed in on Windows • Edge</li>
              </ul>
            </section>
          )}

          {active === "apps" && (
            <section className="gia-profile-card">
              <h2>My Apps</h2>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="pill">Dashboard</span>
                <span className="pill">HR</span>
                <span className="pill">Payroll</span>
              </div>
            </section>
          )}

          {active === "groups" && (
            <section className="gia-profile-card">
              <h2>My Groups</h2>
              <p style={{ color: "#475569" }}>Admins (Owner), Caregivers (Member)</p>
            </section>
          )}

          {active === "access" && (
            <section className="gia-profile-card">
              <h2>My Access</h2>
              <p style={{ color: "#475569" }}>Patient Records: Read • Scheduling: Write</p>
            </section>
          )}

          {active === "feedback" && (
            <section className="gia-profile-card">
              <h2>Give feedback</h2>
              <button className="gia-profile-btn" style={{ marginTop: 10 }}>Open feedback form</button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
