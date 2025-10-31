import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";
import { loadSavedTheme } from "../theme";     // load admin theme variables
import "./lobbie-root.css";                    // small helper styles

function Layout() {
  const [searchText, setSearchText] = useState("");

  // Apply saved ADMIN theme whenever this layout mounts
  useEffect(() => {
    loadSavedTheme();
  }, []);

  return (
    // Scope all admin pages under this class so global.css uses correct vars
    <div className="lobbie-root" style={{ display: "flex", height: "100vh", flexDirection: "row" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar updates search text */}
        <Topbar onSearch={setSearchText} />
        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Pass searchText into all nested routes */}
          <Outlet context={{ searchText }} />
        </div>
      </div>
    </div>
  );
}

export default Layout;
