// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// global styles (keep these)
import "./global.css";
import "./index.css";
import "./theme/typography-and-inputs.css";

import { loadSavedTheme } from "./theme"; // from src/theme.js

loadSavedTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
