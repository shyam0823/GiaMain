import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginLogoutIcon.css';
 
function isLoggedIn() {
  return !!localStorage.getItem('authToken');
}
 
export default function LoginLogoutIcon() {
  const navigate = useNavigate();
  const authenticated = isLoggedIn();
  const [hovered, setHovered] = useState(false);
 
  const handleClick = () => {
    if (authenticated) {
      navigate('/logout');
    } else {
      navigate('/login');
    }
  };
 
  return (
    <div
      className="icon-container"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {authenticated ? (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#636363"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ) : (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#636363"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      )}
 
      {hovered && (
        <div className="icon-dropdown">
          {authenticated ? 'Logout' : 'Login'}
        </div>
      )}
    </div>
  );
}
 
 