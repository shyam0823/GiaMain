import React, { useState } from "react";
import "./Automation.css";
import { FaTrash } from "react-icons/fa";

const Automation = () => {
  const [automations, setAutomations] = useState([
    { id: 1, interval: 1, type: "Forms", via: "Email and SMS/Text Message" }
  ]);

  const addAutomation = () => {
    const newAutomation = {
      id: Date.now(),
      interval: 1,
      type: "Forms",
      via: "Email"
    };
    setAutomations([...automations, newAutomation]);
  };

  const updateAutomation = (id, field, value) => {
    setAutomations(
      automations.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      )
    );
  };

  const deleteAutomation = (id) => {
    setAutomations(automations.filter((a) => a.id !== id));
  };

  return (
    <div className="automation-container">
      <div className="automation-header">
        <h2>Automation</h2>
        <button className="add-btn" onClick={addAutomation}>
          Add Automation
        </button>
      </div>
      <p className="description">
        Set up automatic reminders for patients to complete their forms.
      </p>

      {automations.map((auto) => (
        <div className="automation-row" key={auto.id}>
          <span>Every</span>
          <input
            type="number"
            value={auto.interval}
            onChange={(e) =>
              updateAutomation(auto.id, "interval", e.target.value)
            }
          />
          <span>days until the</span>
          <select
            value={auto.type}
            onChange={(e) =>
              updateAutomation(auto.id, "type", e.target.value)
            }
          >
            <option>Forms</option>
            <option>Appointments</option>
            <option>Payments</option>
          </select>
          <span>are completed via</span>
          <select
            value={auto.via}
            onChange={(e) =>
              updateAutomation(auto.id, "via", e.target.value)
            }
          >
            <option>Email</option>
            <option>SMS/Text Message</option>
            <option>Email and SMS/Text Message</option>
          </select>
          <button
            className="delete-btn"
            onClick={() => deleteAutomation(auto.id)}
          >
            <FaTrash />
          </button>
        </div>
      ))}

      <div className="save-container">
        <button className="save-btn">Save Automations</button>
      </div>
    </div>
  );
};

export default Automation;
