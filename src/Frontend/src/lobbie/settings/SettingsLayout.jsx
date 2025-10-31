import React, { useEffect } from 'react';
import SettingsSidebar from './SettingsSidebar';
import { Outlet } from 'react-router-dom';
import './SettingsLayout.css';


// load the saved ADMIN theme and apply it to .settings-layout
import { loadSavedTheme } from '../../theme';

function SettingsLayout() {
  useEffect(() => {
    // applies variables only to the .settings-layout container (scoped in theme.js)
    loadSavedTheme();
  }, []);

  return (
    <div className="settings-layout">
      <SettingsSidebar/>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  );
}

export default SettingsLayout;
