import React, { useEffect, useRef, useState } from "react";
import "./Topbar.css";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { useExport } from "../context/ExportContext";
import IconAvatar from "../assets/avatars/IconAvatar.svg";


function Topbar() {
  const navigate = useNavigate();
  const { setSearchQuery } = useSearch();
  const { readyList, clearDownloads } = useExport();

  const [localQuery, setLocalQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [optimisticCleared, setOptimisticCleared] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const downloadRef = useRef(null);
  const profileRef = useRef(null);

  const visibleList = optimisticCleared ? [] : (readyList || []);
  const visibleCount = visibleList.length;
  const hasAny = visibleCount > 0;

  useEffect(() => {
    if ((readyList?.length || 0) > 0) setOptimisticCleared(false);
  }, [readyList]);

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setLocalQuery(v);
    setSearchQuery(v.trim());
  };

  const handleGoClick = () => setSearchQuery(localQuery.trim());
  const handleKeyDown = (e) => e.key === "Enter" && setSearchQuery(localQuery.trim());

  const openPdf = (file) => {
    if (!file?.url) return;
    window.open(file.url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadClick = () => {
    setProfileOpen(false);
    if (visibleCount === 1) return openPdf(visibleList[0]);
    if (visibleCount > 1) return setIsDropdownOpen((p) => !p);
    alert("No files ready yet.");
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        (downloadRef.current && !downloadRef.current.contains(e.target)) &&
        (profileRef.current && !profileRef.current.contains(e.target))
      ) {
        setIsDropdownOpen(false);
        setProfileOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
        setSupportOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const handleClearAll = async (e) => {
    e?.stopPropagation?.();
    setOptimisticCleared(true);
    try {
      if (typeof clearDownloads === "function") await clearDownloads();
    } catch (err) {
      console.error("clearDownloads failed:", err);
      setOptimisticCleared(false);
    }
    setIsDropdownOpen(true);
  };

  const submitSupportMessage = async (text) => {
    await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        path: window.location.pathname,
        ts: new Date().toISOString(),
      }),
    });
  };

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  })();
  const email = user?.email || "user@example.com";
  const displayName = user?.fullName || user?.name || email.split("@")[0] || "User";
  const avatarUrl = IconAvatar;

  const signOut = () => {
    ["token","access_token","refresh_token","user","currentUser","profile","userData"]
      .forEach((k) => localStorage.removeItem(k));
    setProfileOpen(false);
    navigate("/login");
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQX-tviCnKExYEC23Ytc1BQZ_oNJxilc9V10Q&s"
            alt="Lobbie Logo"
            className="logo-img"
          />
        </span>

        <input
          className="topbar-search"
          placeholder="Search for a patient by name or email..."
          value={localQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          aria-label="Search patients"
        />

        <button className="searc-go-btn" onClick={handleGoClick} aria-label="Run search">
          Go
        </button>
      </div>

      <div className="topbar-right">
        <div ref={downloadRef} className={`download-wrapper ${isDropdownOpen ? "open" : ""}`}>
          <button
            className={`topbar-file-download ${hasAny ? "is-ready" : ""}`}
            onClick={handleDownloadClick}
            title={hasAny ? "Click to download" : "No file ready yet"}
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            aria-controls="download-menu"
          >
            <span>File download</span>
            <span className="arrow" aria-hidden="true">⬇️</span>
            {hasAny && (
              <span className="badge" aria-label={`${visibleCount} files ready`}>{visibleCount}</span>
            )}
          </button>

          <div id="download-menu" role="menu" className="download-menu" aria-hidden={!isDropdownOpen}>
            <div className="menu-header">File download ⬇</div>

            <div className="menu-list">
              {visibleList.length > 0 ? (
                visibleList.map((file, idx) => (
                  <div
                    role="menuitem"
                    tabIndex={0}
                    key={`${file?.name || "file"}-${idx}`}
                    className="download-item"
                    onClick={() => { openPdf(file); setIsDropdownOpen(false); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        openPdf(file);
                        setIsDropdownOpen(false);
                      }
                    }}
                  >
                    <span className="doc-icon" aria-hidden="true">📄</span>
                    <span className="name">{file?.name || "Form export"}</span>
                    <span className="meta">{file?.size || ""}</span>
                  </div>
                ))
              ) : (
                <div className="download-item" aria-disabled="true">
                  <span className="doc-icon" aria-hidden="true">📄</span>
                  <span className="name">No files available</span>
                </div>
              )}
            </div>

            <div className="menu-footer">
              <button className="menu-clear" onClick={handleClearAll}>Clear All</button>
            </div>
          </div>
        </div>

        <button
          className="topbar-help"
          onClick={() => { setSupportOpen(true); setProfileOpen(false); }}
        >
          Support
        </button>

        <button className="topbar-branch">GIA HR</button>

        <div className={`profile-wrapper ${profileOpen ? "open" : ""}`} ref={profileRef}>
          <button
  type="button"
  className="avatar-btn --reset no-pill"
  onClick={() => { setProfileOpen((p) => !p); setIsDropdownOpen(false); }}
  aria-haspopup="menu"
  aria-expanded={profileOpen}
  aria-controls="profile-menu"
  title={displayName}
>
  <img src={avatarUrl} alt={displayName} className="avatar-img" />
</button>


          <div id="profile-menu" role="menu" className="profile-menu chrome-card" aria-hidden={!profileOpen}>
            <div className="chrome-header">
              <div className="chrome-cover" />
              <div className="chrome-avatar">
                <img src={avatarUrl} alt={displayName} />
              </div>
              <div className="chrome-ident">
                <div className="name">{displayName}</div>
                <div className="email">{email}</div>
              </div>
            </div>

            <div className="chrome-actions">
              <button
                className="chrome-item"
                role="menuitem"
                onClick={() => { setProfileOpen(false); navigate("/profile"); }}
              >
                <span className="icon">👤</span>
                <span>View profile</span>
              </button>

              <button className="chrome-item danger" role="menuitem" onClick={signOut}>
                <span className="icon">↪</span>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {supportOpen && (
        <SupportOverlay
          onClose={() => setSupportOpen(false)}
          onSubmit={async (msg) => {
            await submitSupportMessage(msg);
            setSupportOpen(false);
            alert("Thanks! We’ll get back to you soon.");
          }}
        />
      )}
    </div>
  );
}

export default Topbar;

function SupportOverlay({ onClose, onSubmit }) {
  const [msg, setMsg] = useState("");
  const textRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => textRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = msg.trim();
    if (!trimmed) return;
    try {
      await onSubmit?.(trimmed);
      setMsg("");
    } catch (err) {
      console.error(err);
      alert("Couldn’t send the message. Please try again.");
    }
  };

  const styles = {
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(17,24,39,0.45)",
      backdropFilter: "blur(8px) saturate(1.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3000,
      animation: "fadeIn 0.2s ease",
    },
    modal: {
      position: "relative",
      width: "560px",
      maxWidth: "92vw",
      background: "#ffffff",
      borderRadius: 16,
      padding: "32px 40px 28px",
      border: "none",
      boxShadow: "0 8px 30px rgba(0,0,0,0.10)",
      animation: "scaleIn 0.25s ease",
    },
    h2: {
      margin: 0,
      marginBottom: 18,
      textAlign: "center",
      fontSize: 24,
      fontWeight: 800,
      color: "#0095ff",
    },
    body: { marginTop: 4, color: "#334155", fontSize: 14, lineHeight: 1.55 },
    lead: { fontWeight: 600, color: "#111827" },
    form: { marginTop: 14, display: "grid", gap: 10 },
    label: { fontWeight: 600, color: "#111827" },
    textarea: {
      width: "100%",
      minHeight: 150,
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 14,
      color: "#1f2937",
      outline: "none",
      resize: "vertical",
      transition: "border .2s, box-shadow .2s",
    },
    actions: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 18,
    },
    btnSecondary: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 14,
      cursor: "pointer",
      border: "1px solid #e5e7eb",
      background: "#f3f4f6",
      color: "#111827",
    },
    btnPrimary: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 14,
      cursor: "pointer",
      border: "none",
      background: "linear-gradient(90deg, #0095ff, #2f80ed)",
      color: "#ffffff",
    },
    link: { color: "#2f80ed", textDecoration: "none" },
  };

  return (
    <div style={styles.backdrop} onMouseDown={handleBackdropClick} aria-hidden={false}>
      <style>
        {`
          @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes scaleIn { from { transform:scale(.96); opacity:.92 } to { transform:scale(1); opacity:1 } }
          .btnPrimary:hover { opacity:.95; transform: translateY(-1px); }
        `}
      </style>

      <div
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="support-title" style={styles.h2}></h2>
        <div style={styles.body}>
          <p style={styles.lead}>Have an issue or a suggestion?</p>
          <p>
            Contact us through the form below or email us directly — we’ll get back to you
            between the hours of <strong>8 AM and 5 PM EST</strong>.
          </p>
          <p>
            You can always email GIA directly at{" "}
            <a href="mailto:support@giahomecare.com" style={styles.link}>support@giahomecare.com</a>
          </p>

          <form onSubmit={submit} style={styles.form}>
            <label htmlFor="support-message" style={styles.label}>Send us a message:</label>
            <textarea
              id="support-message"
              ref={textRef}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Type your message here..."
              style={styles.textarea}
            />
            <div style={styles.actions}>
              <button type="button" style={styles.btnSecondary} onClick={onClose}>Cancel</button>
              <button type="submit" style={styles.btnPrimary} className="btnPrimary">Send Message</button>
            </div>
          </form>
        </div>
      </div>z
    </div>
  );
}
