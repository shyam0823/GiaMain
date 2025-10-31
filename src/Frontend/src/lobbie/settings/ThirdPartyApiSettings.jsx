import React from 'react';
import './ThirdPartyApiSettings.css';

function ThirdPartyApiSettings() {
  return (
    <section className="panel">
      <div className="thirdparty-header">
        <h2>Third Party API</h2>
        <button className="thirdparty-btn">Add Third Party API</button>
      </div>
      <div className="thirdparty-empty">
        You have no Third Party APIs active. Click "Add Third Party API" to begin.
      </div>
    </section>
  );
}

export default ThirdPartyApiSettings;
