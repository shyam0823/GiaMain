import React, { useState, useEffect } from "react";
import { applyCustomerTheme, loadSavedCustomerTheme } from "./theme";

const CustomerThemeDropdown = () => {
  const [active, setActive] = useState("crimsonEmber");

  useEffect(() => {
    loadSavedCustomerTheme();
    setActive(localStorage.getItem("customerTheme") || "crimsonEmber");
  }, []);

  const onChange = (e) => {
    const val = e.target.value;
    applyCustomerTheme(val);
    setActive(val);
  };

  return (
    <div style={{ padding: 12 }}>
      <label
        htmlFor="cust-theme"
        style={{
          display: "block",
          fontWeight: 600,
          fontSize: 13,
          color: "var(--side-text)",
          marginBottom: 6,
        }}
      >
        Theme
      </label>
      <select
        id="cust-theme"
        value={active}
        onChange={onChange}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--side-border)",
          background: "var(--panel)",
          color: "var(--side-text)",
          fontSize: 14,
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="crimsonEmber">Crimson Ember</option>
        <option value="slateRose">Slate Rose</option>
        <option value="noirSpice">Noir Spice</option>
        <option value="tealIndigo">Teal Indigo</option>
      </select>
    </div>
  );
};

export default CustomerThemeDropdown;
