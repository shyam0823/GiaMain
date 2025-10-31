// src/Frontend/src/Customer/CustomerSideBar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./CustomerSideBar.css";
import CustomerThemeDropdown from "./CustomerThemeDropdown";

const labelToClass = (label = "") => {
  const key = label.trim().toLowerCase();
  if (key.includes("dashboard")) return "dashboard";
  if (key.includes("book") && key.includes("appointment")) return "book-appointment";
  if (key.includes("assigned") && key.includes("forms")) return "assigned-forms";
  if (key.includes("medical") && key.includes("history")) return "medical-history";
  if (key.includes("settings")) return "settings";
  if (key.includes("logout")) return "logout";
  return "default";
};

const CustomerSidebar = ({ links }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    // optional: clear local/session storage if needed
    localStorage.removeItem("customerToken");
    sessionStorage.clear();

    // redirect to homepage
    navigate("/");
  };

  return (
    <aside className="customer-sidebar">
      <h2>PATIENT MENU</h2>

      <ul>
        {links.map((link, idx) => {
          const iconClass = labelToClass(link.label);
          const isActive =
            location.pathname === link.path ||
            (link.path !== "/customer" &&
              location.pathname.startsWith(link.path + "/"));

          // check if this is the logout link
          const isLogout = iconClass === "logout";

          return (
            <li
              key={idx}
              className={`nav-item nav-item--${iconClass} ${isActive ? "active" : ""}`}
            >
              {isLogout ? (
                <Link to="#" onClick={handleLogout}>
                  {link.label}
                </Link>
              ) : (
                <Link to={link.path}>{link.label}</Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sidebar-sep" />

      <div
        style={{
          borderTop: "1px solid var(--side-border)",
          marginTop: 10,
          paddingTop: 10,
        }}
      >
        <CustomerThemeDropdown />
      </div>
    </aside>
  );
};

export default CustomerSidebar;
