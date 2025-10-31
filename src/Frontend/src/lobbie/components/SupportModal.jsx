import React, { useEffect, useRef, useState } from "react";

export default function SupportModal({ open, onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const textRef = useRef(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => textRef.current?.focus(), 0);
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    await onSubmit?.(trimmed);
    setMessage("");
  };

  return (
    <div className="support-backdrop" onMouseDown={handleBackdropClick} aria-hidden={false}>
      {/* Local styles for the modal (kept here for isolation) */}
      <style>{`
        .support-backdrop {
          position: fixed;
          inset: 0;
          z-index: 3000;

          /* White frosted-glass background */
          background: rgba(255,255,255,.65);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);

          background-image: linear-gradient(
            to bottom right,
            rgba(255,255,255,.7),
            rgba(255,255,255,.55)
          );

          display: flex;
          align-items: center;
          justify-content: center;
          animation: suppFadeIn .25s ease;
        }
        @keyframes suppFadeIn { from { opacity: 0 } to { opacity: 1 } }

        .support-modal {
          position: relative;
          width: 560px;
          max-width: 92vw;
          background: var(--surface, #fff);
          border-radius: 16px;
          padding: 32px 40px 28px;
          border: none;
          box-shadow: 0 16px 60px rgba(0,0,0,.12);
          animation: suppScaleIn .25s ease;
          text-align: center;
        }
        @keyframes suppScaleIn { from { transform: scale(.96); opacity: .92 } to { transform: scale(1); opacity: 1 } }

        .support-close {
          position: absolute;
          top: 12px;
          right: 14px;
          border: none;
          background: transparent;
          font-size: 26px;
          color: var(--text-muted, #7b8f9b);
          cursor: pointer;
        }
        .support-close:hover { color: var(--text, #1b3c53); }

        .support-heading {
          margin: 0 0 18px 0;
          font-size: 24px;
          font-weight: 800;
          color: var(--brand-b, #2f80ed);
        }

        .support-body { text-align: left; color: var(--text, #1b3c53); font-size: 14px; line-height: 1.55; }
        .support-body p { margin: 6px 0; }
        .support-body .lead { font-weight: 700; color: var(--text, #1b3c53); }
        .support-body a { color: var(--brand-a, #0095ff); text-decoration: none; }
        .support-body a:hover { text-decoration: underline; }

        .support-form { display: grid; gap: 10px; margin-top: 14px; }
        .support-form label { font-weight: 700; color: var(--text, #1b3c53); }
        .support-form textarea {
          width: 100%;
          min-height: 150px;
          background: var(--bg, #fff);
          border: 1px solid var(--border, #e7edf5);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          color: var(--text, #1b3c53);
          outline: none;
          resize: vertical;
          transition: border .2s, box-shadow .2s;
        }
        .support-form textarea:focus {
          border-color: var(--brand-b, #2f80ed);
          box-shadow: 0 0 0 3px var(--focus-ring, rgba(47,128,237,.18));
        }

        .support-actions { display: flex; gap: 12px; justify-content: space-between; margin-top: 12px; }
        .btn-secondary, .btn-primary {
          flex: 1;
          padding: 12px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .btn-secondary {
          border: 1px solid var(--border, #e7edf5);
          background: var(--panel, #f5f8ff);
          color: var(--text, #1b3c53);
        }
        .btn-secondary:hover { background: var(--bg, #ffffff); }

        .btn-primary {
          border: none;
          background: linear-gradient(90deg, var(--brand-a, #0095ff), var(--brand-b, #2f80ed));
          color: var(--primary-contrast, #fff);
          box-shadow: 0 6px 16px rgba(47,128,237,.25);
        }
        .btn-primary:hover { opacity: .95; transform: translateY(-1px); }

        @media (max-width: 480px) {
          .support-modal { padding: 24px 20px; width: 90%; }
          .support-heading { font-size: 20px; }
          .support-actions { flex-direction: column; }
        }
      `}</style>

      <div
        ref={dialogRef}
        className="support-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="support-close" aria-label="Close" onClick={onClose}>×</button>

        <h2 id="support-title" className="support-heading">GIA Homecare Support</h2>

        <div className="support-body">
          <p className="lead">Have an issue or a suggestion?</p>
          <p>
            Contact us through the form below or email us directly — we’ll get back to you
            between the hours of <strong>8 AM and 5 PM EST</strong>.
          </p>
          <p>
            You can always email GIA directly at{" "}
            <a href="mailto:support@giahomecare.com">support@giahomecare.com</a>
          </p>

          <form onSubmit={submit} className="support-form">
            <label htmlFor="support-message">Send us a message:</label>
            <textarea
              id="support-message"
              ref={textRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here…"
            />
            <div className="support-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Send Message</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
