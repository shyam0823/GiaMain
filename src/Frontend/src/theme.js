// ADMIN THEMES (scoped to .settings-layout, but can also apply globally)
const ADMIN_LS_KEY = "adminTheme";

/**
 * Theme token factory
 * Produces a flat map of CSS variables for easy application to any element.
 */
const p = ({
  bg = "#ffffff",
  panel = "#ffffff",
  text = "#1b3c53",
  textMuted = "#5f7a8a",
  border = "#e6eef7",
  primary = "#3a7bd5",
  primarySoft = "#e7f0ff",
  primaryStrong = "#1f6bd2",
  primaryContrast = "#ffffff",
  accent = "#e6eef7",
  ring = "rgba(58,123,213,.25)",
  gradient = "linear-gradient(180deg, #ffffff 0%, #f8faff 100%)",
  shadow = "0 8px 24px rgba(15,23,42,.08)",
  brandA, // optional: if not provided, derive from primary/strong
  brandB, // optional: if not provided, derive from primary
}) => {
  const a = brandA || primaryStrong;
  const b = brandB || primary;
  return {
    "--bg": bg,
    "--panel": panel,
    "--surface": panel,
    "--text": text,
    "--muted": textMuted,
    "--border": border,
    "--accent": accent,
    "--focus-ring": ring,
    "--ring": ring, // alias some CSS uses
    "--shadow": shadow,
    "--gradient": gradient,

    // main brand tokens used across the app
    "--primary": primary,
    "--primary-soft": primarySoft,
    "--primary-strong": primaryStrong,
    "--primary-contrast": primaryContrast,

    // brand pair (for gradients/pills)
    "--brand-a": a,
    "--brand-b": b,
  };
};

export const THEMES = {
  giaDefault: p({
    bg: "#ffffff",
    panel: "#ffffff",
    text: "#1b3c53",
    textMuted: "#5f7a8a",
    border: "#e6eef7",
    primary: "#3a7bd5",
    primarySoft: "#e7f0ff",
    primaryStrong: "#1f6bd2",
    primaryContrast: "#ffffff",
    accent: "#e6eef7",
  }),

  // Orange
  crimsonAurora: p({
    bg: "#fff8f3",
    panel: "#ffffff",
    text: "#201018",
    textMuted: "#7a5a64",
    border: "#f4e4e8",
    primary: "#ff7d29",
    primarySoft: "#fff0e3",
    primaryStrong: "#ff9e4f",
    primaryContrast: "#ffffff",
    accent: "#ffeea9",
    ring: "rgba(255,125,41,.25)",
    brandB: "#ffbf78",
  }),

  // Mint/Green
  neonLime: p({
    bg: "#f4fdf4",
    panel: "#ffffff",
    text: "#122015",
    textMuted: "#5b6f5f",
    border: "#e7f4df",
    primary: "#56cc00",
    primarySoft: "#ebffe1",
    primaryStrong: "#4cb100",
    primaryContrast: "#0f1a12",
    accent: "#dff8c7",
    ring: "rgba(86,204,0,.25)",
    brandB: "#84ff2e",
  }),

  // Brown/Green (Sage)
  sageHealth: p({
    bg: "#f6fbf6",
    panel: "#ffffff",
    text: "#1a2b1a",
    textMuted: "#6b806c",
    border: "#e6efe6",
    primary: "#4fb14d",
    primarySoft: "#e6f7e5",
    primaryStrong: "#6ed36a",
    primaryContrast: "#0b210b",
    accent: "#b9eab7",
    ring: "rgba(78,177,77,.25)",
  }),

    // --- Sky Blue ---
  skyBreeze: p({
    bg: "#f2f9ff",
    panel: "#ffffff",
    text: "#0f2230",
    textMuted: "#5c7184",
    border: "#e3f0ff",
    primary: "#3aa7ff",
    primarySoft: "#e7f3ff",
    primaryStrong: "#1b86f2",
    primaryContrast: "#ffffff",
    accent: "#d6ecff",
    ring: "rgba(58,167,255,.24)",
    brandB: "#79c6ff",
  }),

  // --- Baby Pink ---
  babyPink: p({
    bg: "#fff6fa",
    panel: "#ffffff",
    text: "#261420",
    textMuted: "#7b5a6a",
    border: "#f7e2ea",
    primary: "#ff6fa3",
    primarySoft: "#ffe3ef",
    primaryStrong: "#ff4f90",
    primaryContrast: "#ffffff",
    accent: "#ffd6e7",
    ring: "rgba(255,111,163,.25)",
    brandB: "#ff9fc1",
  }),

  // --- Lavender ---
  lavenderDream: p({
    bg: "#f7f5ff",
    panel: "#ffffff",
    text: "#191a2c",
    textMuted: "#6f7193",
    border: "#e7e4f9",
    primary: "#7e67f8",
    primarySoft: "#ece9ff",
    primaryStrong: "#6a53ee",
    primaryContrast: "#ffffff",
    accent: "#e3ddff",
    ring: "rgba(126,103,248,.22)",
    brandB: "#a494ff",
  }),

  softSlate: p({
  bg: "#f8fafc",
  panel: "#ffffff",
  text: "#1b1f25",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  primary: "#5c6bc0",
  primarySoft: "#eceefb",
  primaryStrong: "#3f51b5",
  primaryContrast: "#ffffff",
  accent: "#e8ecf6",
  ring: "rgba(92,107,192,0.25)",
  brandB: "#a2b2ff",
}),


  // --- Yellow ---
  sunnyYellow: p({
    bg: "#fffdf2",
    panel: "#ffffff",
    text: "#2a2108",
    textMuted: "#7a6a39",
    border: "#f2e8c7",
    primary: "#f7b500",
    primarySoft: "#fff4cc",
    primaryStrong: "#ffca28",
    primaryContrast: "#2a2108",
    accent: "#fff1a6",
    ring: "rgba(247,181,0,.28)",
    brandB: "#ffe081",
  }),

  // --- Golden Yellow ---
  goldenYellow: p({
    bg: "#fffaf0",
    panel: "#ffffff",
    text: "#211a08",
    textMuted: "#7a6a3a",
    border: "#f2e4c2",
    primary: "#d4a017",
    primarySoft: "#fff1cc",
    primaryStrong: "#f0b429",
    primaryContrast: "#211a08",
    accent: "#ffe8a3",
    ring: "rgba(212,160,23,.28)",
    brandB: "#ffd166",
  }),

  // --- Crimson Red ---
  crimsonRed: p({
    bg: "#fff5f6",
    panel: "#ffffff",
    text: "#201014",
    textMuted: "#7a5a61",
    border: "#f4d6da",
    primary: "#e64553",
    primarySoft: "#ffe5e9",
    primaryStrong: "#ff5c70",
    primaryContrast: "#ffffff",
    accent: "#ffd3da",
    ring: "rgba(230,69,83,.25)",
    brandB: "#ff8fa3",
  }),

  // Light UI (Purple)
  softUi: p({
    bg: "#faf9ff",
    panel: "#ffffff",
    text: "#1e2030",
    textMuted: "#6f7597",
    border: "#eceaf7",
    primary: "#8b40e2",
    primarySoft: "#f1e8ff",
    primaryStrong: "#b46bff",
    primaryContrast: "#ffffff",
    accent: "#e6d6ff",
    ring: "rgba(139,64,226,.22)",
  }),
};

/**
 * Resolve the primary admin container if present.
 * We also support homepage shell so the same util can theme public pages.
 */
function getAdminRoot(rootEl) {
  return (
    rootEl ||
    document.querySelector(".settings-layout") ||
    document.querySelector(".lobbie-root") ||
    document.getElementById("admin-app") ||
    document.querySelector(".homepage-container") ||
    null
  );
}

/**
 * Apply a theme by key to:
 *  - the resolved admin/homepage container (if any)
 *  - <body> (class + vars)
 *  - <html> (vars), so all descendants—including homepage—inherit the theme
 */
export function applyTheme(themeKey, rootEl) {
  const theme = THEMES[themeKey];
  if (!theme) return;

  const adminRoot = getAdminRoot(rootEl);

  // Targets we always write variables to
  const targets = new Set([
    document.documentElement, // <html>
    document.body,            // <body>
    adminRoot || undefined,   // admin/homepage container, if present
  ].filter(Boolean));

  // Tag body so any CSS scoped with body.admin-theme also applies
  document.body.classList.remove("customer-theme", "customer-container");
  document.body.classList.add("admin-theme");

  // Write variables to each target
  targets.forEach((el) => {
    Object.entries(theme).forEach(([k, v]) => el.style.setProperty(k, v));
  });

  try { localStorage.setItem(ADMIN_LS_KEY, themeKey); } catch {}
}

/**
 * Load and apply the last-saved theme.
 * If nothing saved, fall back to giaDefault.
 */
export function loadSavedTheme(rootEl) {
  const saved = localStorage.getItem(ADMIN_LS_KEY) || "giaDefault";
  applyTheme(saved, rootEl);
}
