import React, { useEffect, useState } from "react";
// ⛳️ Correct relative path: components → (.. up to lobbie) → (.. up to src) → theme.js
import { THEMES, applyTheme, loadSavedTheme } from "../../theme";

const ADMIN_LS_KEY = "adminTheme";

export default function ThemeDropdown() {
  const [active, setActive] = useState("giaDefault");

  useEffect(() => {
    // applies to .settings-layout only (scoped in theme.js)
    loadSavedTheme();
    const saved = (() => {
      try {
        return localStorage.getItem(ADMIN_LS_KEY) || "giaDefault";
      } catch {
        return "giaDefault";
      }
    })();
    setActive(saved);
  }, []);

  const handleChange = (e) => {
    const selected = e.target.value;
    applyTheme(selected);           // writes vars to .settings-layout and saves ADMIN_LS_KEY
    setActive(selected);
  };

  return (
    <div style={{ marginTop: "auto", padding: "12px" }}>
      <label
        htmlFor="theme-select"
        style={{
          display: "block",
          fontWeight: 600,
          fontSize: 13,
          color: "var(--text)",
          marginBottom: 6,
        }}
      >
        Theme
      </label>
      <select
        id="theme-select"
        value={active}
        onChange={handleChange}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--text)",
          fontSize: 14,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {/* update these options to match your admin THEMES keys */}
        <option value="giaDefault">GIA Default</option>
        <option value="crimsonAurora">Orange</option>
        <option value="neonLime">Mint</option>
        <option value="sageHealth">Green</option>
        <option value="softUi">Purple</option>
        <option value="skyBreeze">Sky Blue</option>
        <option value="babyPink">Baby Pink</option>
        <option value="lavenderDream">Lavender</option>
        <option value="softSlate">Navy Blue</option>
        <option value="sunnyYellow">Yellow</option>
        <option value="goldenYellow">Golden Yellow</option>
        <option value="crimsonRed">Crimson Red</option>

        {/* or if you renamed admin themes:
            <option value="amberClay">Amber Clay</option>
            <option value="goldenOlive">Golden Olive</option>
            <option value="oceanMist">Ocean Mist</option>
            <option value="softNoir">Soft Noir</option>
            <option value="sunsetGlow">Sunset Glow</option>
        */}
      </select>
    </div>
  );
}
