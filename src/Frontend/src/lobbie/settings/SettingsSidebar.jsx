import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SettingsSidebar.css";


// Correct relative path: settings → (.. up to lobbie) → components/ThemeDropdown
import ThemeDropdown from "../components/ThemeDropdown";

const settingsLinks = [
  { label: "Account", route: "/dash/settings/account" },
  { label: "Appointment Types", route: "/dash/settings/appointment-types" },
  { label: "Automation", route: "/dash/settings/automation" },
  { label: "Billing", route: "/dash/settings/billing" },
  { label: "Branding and Identity", route: "/dash/settings/branding" },
  { label: "Forms", route: "/dash/settings/forms" },
  { label: "Integrations API", route: "/dash/settings/integrations" },
  { label: "Locations", route: "/dash/settings/locations" },
  { label: "Notifications", route: "/dash/settings/notifications" },
  { label: "Users", route: "/dash/settings/users" },
  { label: "Upload", route: "/dash/settings/uploader"}
];

export default function SettingsSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="settings-sidebar"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Menu */}
      <div style={{ flex: 1 }}>
        {settingsLinks.map(({ label, route }) => (
          <div
            key={route}
            className={`settings-nav-item${
              location.pathname === route ? " active" : ""
            }`}
            onClick={() => navigate(route)}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Theme pinned to bottom */}
      <div
        style={{
          borderTop: "1px solid var(--border)", // use themed border token
          paddingTop: 10,
          marginTop: 12,
        }}
      >
        <ThemeDropdown />
      </div>
    </div>
  );
}
