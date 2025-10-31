// SidebarOnlyLayout.jsx
import React from 'react';
import Sidebar from './lobbie/Sidebar';
import { Outlet } from 'react-router-dom';

function SidebarOnlyLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, background: "#f7f7f7" }}>
        <Outlet />
      </div>
    </div>
  );
}

export default SidebarOnlyLayout;
