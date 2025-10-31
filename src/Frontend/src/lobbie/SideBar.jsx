import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";
import LoginLogoutIcon from "../pages/LoginLogoutIcon";
 
// Dropdown content map for sidebar icons
const dropdownContent = {
  "/dash/forms": (
    <div className="sidebar-dropdown-card">
      <div className="sidebar-dropdown-header">Lobbie Settings</div>
      <div className="sidebar-dropdown-body">
        Settings for your Lobbie account.<br />
        <br />
        Add or modify other staff members or locations, manage forms, add branding to your Lobbie account and more.
      </div>
    </div>
  ),
  "/dash/settings": (
    <div className="sidebar-dropdown-card">
      <div className="sidebar-dropdown-header">Your Profile</div>
      <div className="sidebar-dropdown-body">
        Change details about your personal profile.<br />
        <br />
        Add personal integrations such as Google or Microsoft/Outlook Calendar integrations.
      </div>
    </div>
  ),
  // Example for other icons (provide your own text)
  "/dash/dashboard": (
    <div className="sidebar-dropdown-card">
      <div className="sidebar-dropdown-header">Analytics</div>
      <div className="sidebar-dropdown-body">
        View analytics and reports about your forms and activities here.
      </div>
    </div>
  ),
  "/feedback": (
    <div className="sidebar-dropdown-card">
      <div className="sidebar-dropdown-header">Feedback</div>
      <div className="sidebar-dropdown-body">
        Submit feedback or view feedback collected from users.
      </div>
    </div>
  ),
  "/dash/appointments": (
    <div className="sidebar-dropdown-card">
      <div className="sidebar-dropdown-header">Appointments</div>
      <div className="sidebar-dropdown-body">
        Manage your appointments and scheduling here.
      </div>
    </div>
  ),
  "/dash/signature": (
    <div className="sidebar-dropdown-card">
      <div className="sidebar-dropdown-header">Patient</div>
      <div className="sidebar-dropdown-body">
        Manage patient forms and personal details here.
      </div>
    </div>
  ),
};
 
const sidebarLinks = [
  { icon: "🏥", route: "/dash", label: "Home" },
  { icon: "📊", route: "/dash/dashboard", label: "Analytics" },
  { icon: "😊", route: "/feedback", label: "Feedback" },
  { icon: "📋", route: "/dash/forms", label: "Forms" },
  { icon: "⚙️", route: "/dash/settings", label: "Settings" },
  { icon: "📅", route: "/dash/appointments", label: "Appointments" },
  { icon: "👤", route: "/dash/signature", label: "Patient" },
];
 
function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownActive, setDropdownActive] = useState(null);
 
  const isActive = (route) => location.pathname.startsWith(route);
 
  return (
    <div className="sidebar">
      {/* Home Icon */}
      <div
        className={`sidebar-logo nav-item${isActive(sidebarLinks[0].route) ? " active" : ""}`}
        onClick={() => navigate(sidebarLinks[0].route)}
        style={{ cursor: "pointer" }}
        title={sidebarLinks[0].label}
      >
        <span className="logo-icon">{sidebarLinks[0].icon}</span>
      </div>
 
      {/* Navigation Icons with dropdowns */}
      <nav className="sidebar-nav">
        {sidebarLinks.slice(1).map(({ icon, route, label }, idx) => (
          <div
            key={route}
            className={`nav-item${isActive(route) ? " active" : ""}`}
            onClick={() => navigate(route)}
            title={label}
            style={{ cursor: "pointer", position: "relative" }}
            onMouseEnter={() => setDropdownActive(route)}
            onMouseLeave={() => setDropdownActive(null)}
          >
            <span className="nav-icon">{icon}</span>
            {dropdownActive === route && (
              <div className="sidebar-dropdown">
                {dropdownContent[route]}
              </div>
            )}
          </div>
        ))}
      </nav>
 
      {/* Login/Logout 
      <div className="login-logout">
        <LoginLogoutIcon />
      </div>*/}
    </div>
  );
}
 
export default Sidebar;
 
 