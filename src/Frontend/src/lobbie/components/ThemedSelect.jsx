// src/components/ThemedSelect.jsx
import React from "react";
import Select from "react-select";

/**
 * Themed react-select wrapper
 * - Styles are fully scoped with classNamePrefix="ts" (won’t affect tabs)
 * - Opaque menu, themed by CSS variables
 * - Opens reliably (portal to <body> by default, fixed positioning)
 * - Toggle portal with `usePortal={false}` if you want it inline
 */
export default function ThemedSelect({
  size = "md",
  menuPlacement = "auto",
  usePortal = true,
  styles: stylesOverride,
  theme: themeOverride,
  ...rest
}) {
  const controlHeight = size === "sm" ? 36 : 44;
  const radius = 10;

  const baseStyles = {
    /* --- Control (input) --- */
    control: (base, state) => ({
      ...base,
      minHeight: controlHeight,
      height: controlHeight,
      borderRadius: radius,
      background: "var(--surface)",
      border: `1px solid ${
        state.isFocused ? "var(--primary-strong)" : "var(--border)"
      }`,
      boxShadow: "none",
      ":hover": { borderColor: "var(--primary-strong)" },
      cursor: "pointer",
    }),
    valueContainer: (b) => ({ ...b, paddingInline: 10 }),
    indicatorsContainer: (b) => ({ ...b, paddingRight: 6 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (b, s) => ({
      ...b,
      color: s.isFocused ? "var(--primary)" : "var(--muted)",
      ":hover": { color: "var(--primary)" },
    }),

    /* --- OPAQUE menu (no translucency) --- */
    menuPortal: (b) => ({
      ...b,
      zIndex: 9999, // ensure above table/footer/tabs
    }),
    menu: (b) => ({
      ...b,
      zIndex: 9999,
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderRadius: radius,
      boxShadow: "0 10px 30px rgba(0,0,0,.12)",
      overflow: "hidden",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
      opacity: 1,
      backgroundClip: "padding-box",
      isolation: "isolate",
    }),
    menuList: (b) => ({
      ...b,
      background: "var(--panel)",
      maxHeight: 240,
      overflowY: "auto",
      paddingBlock: 6,
    }),
    option: (b, s) => ({
      ...b,
      cursor: "pointer",
      background: s.isSelected
        ? "var(--primary)"
        : s.isFocused
        ? "var(--primary-soft)"
        : "transparent",
      color: s.isSelected ? "var(--primary-contrast)" : "var(--text)",
    }),

    singleValue: (b) => ({ ...b, color: "var(--text)" }),
    placeholder: (b) => ({ ...b, color: "var(--muted)" }),
  };

  const styles = { ...baseStyles, ...(stylesOverride || {}) };

  const baseTheme = (t) => ({
    ...t,
    borderRadius: radius,
    spacing: { ...t.spacing, controlHeight, baseUnit: 4, menuGutter: 6 },
    colors: {
      ...t.colors,
      primary: "var(--primary)",
      primary25: "var(--primary-soft)",
      primary50: "var(--primary-soft)",
      neutral0: "var(--panel)",   // menu background
      neutral20: "var(--border)", // control border
      neutral30: "var(--primary-strong)",
      neutral80: "var(--text)",
    },
  });

  const theme = (incoming) =>
    typeof themeOverride === "function"
      ? themeOverride(baseTheme(incoming))
      : baseTheme(incoming);

  return (
    <div className="themed-select" style={{ width: "100%", overflow: "visible" }}>
      <Select
        {...rest}
        isSearchable={false}
        classNamePrefix="ts"               // SCOPED: won’t affect tabs or other selects
        styles={styles}
        theme={theme}
        menuPlacement={menuPlacement}      // "auto" | "top" | "bottom"
        menuPosition={usePortal ? "fixed" : "absolute"}
        menuPortalTarget={usePortal ? document.body : undefined}
        menuShouldScrollIntoView={false}
        closeMenuOnScroll={false}
      />
    </div>
  );
}
