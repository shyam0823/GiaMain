// CUSTOMER THEMES (scoped to .customer-container)
const CUSTOMER_LS_KEY = "customerTheme";

/**
 * p(): builds a normalized palette + all UI tokens.
 * Keep page white; let accents, buttons, and sidebar highlights follow the theme.
 */
const p = ({
  // base palette
  bg = "#ffffff",
  panel = "#ffffff",
  text = "#0f172a",
  textMuted = "#64748b",
  border = "#e5e7eb",

  // brand/primary
  primary = "#3a7bd5",
  primarySoft = "#e7f0ff",
  primaryStrong = "#1f6bd2",
  primaryContrast = "#ffffff",

  // accents/effects
  accent = "#d2e6ff",
  ring = "rgba(58,123,213,.25)",
  shadow = "0 8px 24px rgba(15,23,42,.08)",
  brandA,
  brandB,

  // optional gradient (header backgrounds etc.)
  gradient = "linear-gradient(180deg, #ffffff 0%, #f8faff 100%)",
}) => {
  const a = brandA || primary;
  const b = brandB || primaryStrong;

  // Sidebar tokens (light shell with theme-tinted active pill)
  const sideBg = "#ffffff";
  const sideText = text;
  const sideMuted = textMuted;
  const sideBorder = border;
  const sideActiveBg = primarySoft;
  const sideActiveText = text;
  const sideActiveBorder = primaryStrong;

  return {
    // Base
    "--bg": bg,
    "--panel": panel,
    "--surface": panel,
    "--text": text,
    "--text-muted": textMuted,
    "--border": border,
    "--accent": accent,
    "--focus-ring": ring,
    "--shadow": shadow,
    "--gradient": gradient,

    // Brand
    "--primary": primary,
    "--primary-soft": primarySoft,
    "--primary-strong": primaryStrong,
    "--primary-contrast": primaryContrast,

    // Gradient endpoints / brand pair
    "--brand-a": a,
    "--brand-b": b,

    // Sidebar
    "--side-bg": sideBg,
    "--side-text": sideText,
    "--side-muted": sideMuted,
    "--side-border": sideBorder,
    "--side-active-bg": sideActiveBg,
    "--side-active-text": sideActiveText,
    "--side-active-border": sideActiveBorder,
  };
};

export const CUSTOMER_THEMES = {
  //Crimson Ember
  crimsonEmber: p({
    bg: "#ffffff",
    panel: "#ffffff",
    text: "#3b060a",
    textMuted: "#8a0000",
    border: "#f4d1c1",
    primary: "#c83f12",
    primarySoft: "#fff0e6",
    primaryStrong: "#ff8f00",
    primaryContrast: "#ffffff",
    accent: "#fff6d6",
    ring: "rgba(200,63,18,.25)",
    brandA: "#c83f12",
    brandB: "#ff8f00",
    gradient: "linear-gradient(180deg, #ffffff 0%, #fff7f1 100%)",
  }),

  //Slate Rose
  slateRose: p({
    bg: "#ffffff",
    panel: "#ffffff",
    text: "#37353e",
    textMuted: "#44444e",
    border: "#e6eaeb",
    primary: "#715a5a",
    primarySoft: "#f3eeee",
    primaryStrong: "#544343",
    primaryContrast: "#ffffff",
    accent: "#f6f3f3",
    ring: "rgba(113,90,90,.25)",
    brandA: "#715a5a",
    brandB: "#544343",
    gradient: "linear-gradient(180deg, #ffffff 0%, #f7f7fa 100%)",
  }),

  //Noir Spice (light)
  noirSpice: p({
    bg: "#ffffff",
    panel: "#ffffff",
    text: "#1e1e1e",
    textMuted: "#555555",
    border: "#e5e7eb",
    primary: "#9b3922",
    primarySoft: "#fff2ee",
    primaryStrong: "#f2613f",
    primaryContrast: "#ffffff",
    accent: "#ffe6df",
    ring: "rgba(242,97,63,.25)",
    brandA: "#9b3922",
    brandB: "#f2613f",
    gradient: "linear-gradient(180deg, #ffffff 0%, #fff7f5 100%)",
  }),

  //Teal Indigo
  tealIndigo: p({
    bg: "#ffffff",
    panel: "#ffffff",
    text: "#0a1530",
    textMuted: "#365d73",
    border: "#daecea",
    primary: "#0f828c",
    primarySoft: "#e2f3f3",
    primaryStrong: "#065084",
    primaryContrast: "#ffffff",
    accent: "#e9f5f4",
    ring: "rgba(15,130,140,.23)",
    brandA: "#0f828c",
    brandB: "#065084",
    gradient: "linear-gradient(180deg, #ffffff 0%, #f6fcfc 100%)",
  }),
};

function getCustomerRoot(rootEl) {
  return (
    rootEl ||
    document.querySelector(".customer-container") ||
    document.querySelector(".fb-like-settings") ||
    null
  );
}

export function applyCustomerTheme(themeKey, rootEl) {
  const theme = CUSTOMER_THEMES[themeKey];
  const el = getCustomerRoot(rootEl);
  if (!theme || !el) return;
  Object.entries(theme).forEach(([k, v]) => el.style.setProperty(k, v));
  el.dataset.theme = themeKey; // help CSS refresh
  try { localStorage.setItem(CUSTOMER_LS_KEY, themeKey); } catch {}
}

export function loadSavedCustomerTheme(rootEl) {
  const el = getCustomerRoot(rootEl);
  if (!el) return;
  const saved = localStorage.getItem(CUSTOMER_LS_KEY) || "tealIndigo";
  applyCustomerTheme(saved, el);
}
