import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear user authentication data (e.g., tokens, user info)
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Optionally clear more storage/session here

    // Redirect to login page after logout
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center', fontSize: '1.3rem' }}>
      Logging out...
    </div>
  );
}

export default LogoutPage;
