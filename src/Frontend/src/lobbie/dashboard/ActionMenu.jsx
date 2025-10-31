import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { sendSmsToPatient } from "../../api/PatientApi";
import {
  FaUserEdit,
  FaFileAlt,
  FaTrashAlt,
  FaLink,
  FaQrcode,
  FaExternalLinkAlt,
  FaPrint,
  FaPaperPlane,
  FaEye,
  FaMapMarkerAlt,
  FaBan,
} from "react-icons/fa";
import "./ActionMenu.css";

/**
 * ActionMenu
 * - Renders action button inline.
 * - Dropdown is rendered via portal to document.body and positioned using btn bounding rect.
 * - Supports drop-up when not enough space below.
 * - Clicks inside dropdown won't close it (outside click handler closes).
 */
const ActionMenu = ({ patientId, patientName, onAssignForm }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  // Position dropdown and detect drop-up based on available space
  const computeDropdownPosition = () => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const dropdownEstimatedHeight = 320; // estimate — CSS is flexible
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // default: show below
    let top = rect.bottom + window.scrollY + 8; // small gap
    let transformOrigin = "top left";

    if (spaceBelow < dropdownEstimatedHeight && spaceAbove > spaceBelow) {
      // show above (drop-up)
      top = rect.top + window.scrollY - Math.min(dropdownEstimatedHeight, spaceAbove) - 8;
      transformOrigin = "bottom left";
    }

    // left align to the button left, but keep within viewport
    let left = rect.left + window.scrollX;
    const maxWidth = 340;
    // ensure dropdown won't overflow to the right
    const maxLeft = window.scrollX + window.innerWidth - maxWidth - 8;
    if (left > maxLeft) left = Math.max(window.scrollX + 8, maxLeft);

    const minWidth = Math.max(rect.width, 160);

    setDropdownStyle({
      position: "absolute",
      top: `${Math.max(8, Math.round(top))}px`,
      left: `${Math.round(left)}px`,
      minWidth: `${minWidth}px`,
      maxWidth: `${maxWidth}px`,
      zIndex: 9999,
      transformOrigin,
    });
  };

  // Close on outside click (works with portal)
  useEffect(() => {
    function handleDocumentClick(event) {
      const insideMenu = menuRef.current && menuRef.current.contains(event.target);
      const insideBtn = btnRef.current && btnRef.current.contains(event.target);
      if (!insideMenu && !insideBtn) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentClick, { capture: true });
    return () => document.removeEventListener("mousedown", handleDocumentClick, { capture: true });
  }, []);

  // Reposition when opening or on resize/scroll
  useEffect(() => {
    if (isOpen) {
      computeDropdownPosition();
    }
    function handleWindowChange() {
      if (isOpen) computeDropdownPosition();
    }
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true); // capture scrolls in ancestors
    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Build dropdown element to portal
  const dropdownNode = isOpen ? (
    <div
      className="action-dropdown-portal"
      ref={menuRef}
      style={dropdownStyle || {}}
      role="menu"
      aria-label={`${patientName || "Patient"} actions`}
    >
      <div className="dropdown-header">{patientName || "Patient"}</div>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          // TODO: implement update practitioner flow
          alert("Update Practitioner(s) - not implemented yet");
        }}
      >
        <FaUserEdit className="dropdown-icon" /> Update Practitioner(s)
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          if (typeof onAssignForm === "function") onAssignForm(patientId);
        }}
      >
        <FaFileAlt className="dropdown-icon" /> Assign Forms
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("Delete/Expire Forms - not implemented yet");
        }}
      >
        <FaTrashAlt className="dropdown-icon" /> Delete/Expire Forms
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          // generate link placeholder
          alert("Generate Direct Forms Link - not implemented");
        }}
      >
        <FaLink className="dropdown-icon" /> Generate Direct Forms Link
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("Generate Forms QR Code - not implemented");
        }}
      >
        <FaQrcode className="dropdown-icon" /> Generate Forms QR Code
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("Patient Direct Forms Link - not implemented");
        }}
      >
        <FaExternalLinkAlt className="dropdown-icon" /> Patient Direct Forms Link
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("Print All Forms as PDF - not implemented");
        }}
      >
        <FaPrint className="dropdown-icon" /> Print All Forms as PDF
      </button>

      <button
        className="dropdown-item"
        onClick={async (e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("Re-Send Forms - not implemented");
        }}
      >
        <FaPaperPlane className="dropdown-icon" /> Re-Send Forms
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("View Patient - not implemented");
        }}
      >
        <FaEye className="dropdown-icon" /> View Patient
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("Change Location - not implemented");
        }}
      >
        <FaMapMarkerAlt className="dropdown-icon" /> Change Location
      </button>

      <button
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          alert("De-activate/Restore Notifications - not implemented");
        }}
      >
        <FaBan className="dropdown-icon" /> De-activate/Restore Notifications
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className="action-menu-inline">
        <button
          className={`action-btn ${isOpen ? "action-btn-open" : ""}`}
          ref={btnRef}
          onClick={toggleMenu}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          Action ▾
        </button>
      </div>

      {createPortal(dropdownNode, document.body)}
    </>
  );
};

export default ActionMenu;
