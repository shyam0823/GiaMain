import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import CustomerSidebar from "./CustomerSideBar";
import CustomerTopbar from "./CustomerTopBar";
import "./CustomerPage.css";
import { loadSavedCustomerTheme } from "./theme"; // apply customer theme

const CustomerLayout = () => {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedCustomerTheme();
  }, []);

  // --- handle logout ---
  const handleLogout = () => {
    // optional: clear local/session storage
    localStorage.removeItem("customerToken");
    sessionStorage.clear();

    // redirect to homepage
    navigate("/");
  };

  const sidebarLinks = [
    { label: "Dashboard", path: "/customer" },
    { label: "Book Appointment", path: "/customer/appointment" },
    { label: "Assigned Forms", path: "/customer/forms" },
    { label: "Medical History", path: "/customer/medical-history" },
    { label: "Settings", path: "/customer/settings" },
    // Logout will be handled manually (not via router path)
    { label: "Logout", path: "#logout", onClick: handleLogout },
  ];

  return (
    <div className="customer-container">
      <CustomerSidebar links={sidebarLinks} />
      <div className="customer-content">
        <CustomerTopbar onSearch={setSearchText} />
        <main className="customer-main">
          <Outlet context={{ searchText }} />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
