import React, { useEffect, useState } from "react";
import "./CustomerTopBar.css";
import iconAvatar from "../assets/avatars/IconAvatar.svg"; // use the neutral avatar

const API_BASE = "http://localhost:5000/api";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const initialsFromName = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "PT";

const CustomerTopBar = ({ searchText, onSearch }) => {
  const [user, setUser] = useState(getUser());

  const name =
    user.full_name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.name ||
    "Patient";

  const initials = initialsFromName(name);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/patients/${user.id}`);
        if (!res.ok) return;
        const p = await res.json();
        if (!cancelled && p) {
          const next = { ...user, ...p };
          localStorage.setItem("user", JSON.stringify(next));
          setUser(next);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <header className="customer-topbar">
      <div className="topbar-left">
        <h2>Patient Portal</h2>
      </div>

      <div className="topbar-center">
        <input
          type="text"
          placeholder="Search forms, appointments..."
          value={searchText}
          onChange={(e) => onSearch(e.target.value)}
        />
        <button className="btn-primary">Search</button>
      </div>

      <div className="topbar-right">
        <div className="profile-box" title={name}>
          <div className="avatar-wrap">
            <img
              src={iconAvatar} // replaced avatar here
              alt="Patient avatar"
              className="avatar-image"
            />
          </div>
          <span className="profile-name">{name}</span>
        </div>
      </div>
    </header>
  );
};

export default CustomerTopBar;
