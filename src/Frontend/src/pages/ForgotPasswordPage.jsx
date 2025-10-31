import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";

// Base URL to your Flask server (no trailing slash)
const API = "http://127.0.0.1:5000/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(
    (sessionStorage.getItem("fp_email") || "").trim().toLowerCase()
  );
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(email ? 2 : 1);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Endpoints (always use the AUTO one)
  const SEND_OTP_URL = `${API}/forgot-password/auto`;
  const VERIFY_URL   = `${API}/forgot-password/verify`;

  const countdownActive = useMemo(() => secondsLeft > 0, [secondsLeft]);

  const startCountdown = (expiryEpochSec) => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, Number(expiryEpochSec) - now);
      setSecondsLeft(diff);
      if (diff === 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    if (timerRef.current) clearInterval(timerRef.current);
    tick();
    timerRef.current = setInterval(tick, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- robust OTP sender (works for new OTP and cooldown responses) ---
  const sendOtp = async () => {
    if (!email) {
      setMsg("Please enter your email.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await axios.post(SEND_OTP_URL, { email: email.trim().toLowerCase() });

      // Robust expiry handling
      const now = Math.floor(Date.now() / 1000);
      let exp = Number(res.data?.server_expiry_epoch || 0);
      if (!exp || exp <= now) {
        const ei = Number(res.data?.expires_in || 60);
        exp = now + (isFinite(ei) ? ei : 60);
      }
      if (exp <= now) exp = now + 1; // guard for tiny clock skews

      startCountdown(exp);

      const saved = (res.data?.email || email).trim().toLowerCase();
      setEmail(saved);
      sessionStorage.setItem("fp_email", saved);
      setStep(2);
      setMsg(res.data?.message || "OTP sent.");
    } catch (err) {
      const m =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send OTP";
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  // Auto-send when landing on step 2 with an email and no active timer
  useEffect(() => {
    if (step === 2 && email && !countdownActive) {
      sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, email]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleResend = async () => {
    if (countdownActive) return; // hard block while active
    await sendOtp();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!countdownActive) {
      setMsg("OTP expired. Please resend and try again.");
      return;
    }
    if (otp.length !== 6) {
      setMsg("Enter the 6-digit OTP.");
      return;
    }
    if (!newPassword) {
      setMsg("Enter your new password.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(VERIFY_URL, {
        email: (sessionStorage.getItem("fp_email") || email).trim().toLowerCase(),
        otp: String(otp || "").trim(),
        new_password: newPassword,
      });

      setMsg(res.data?.message || "Password updated.");
      //Redirect to login after success
      setTimeout(() => {
        sessionStorage.removeItem("fp_email");
        navigate("/login", { replace: true });
      }, 900);
    } catch (err) {
      const r = err?.response;
      const m = r?.data?.message || r?.statusText || err?.message || "Network Error";
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  const resendDisabled = loading || countdownActive || !email;
  const verifyDisabled = loading || !countdownActive || otp.length !== 6 || !newPassword;

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Forgot Password</h2>
        {msg && <p style={{ marginTop: 8, textAlign: "center" }}>{msg}</p>}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label htmlFor="fp-email">Email</label>
              <input
                type="email"
                id="fp-email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                placeholder="Enter your email"
                required
              />
            </div>
            <button className="login-btn" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerify} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} readOnly required />
            </div>

            <div className="form-group">
              <label htmlFor="otp">OTP</label>
              <input
                id="otp"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="6-digit code"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newpass">New Password</label>
              <input
                type="password"
                id="newpass"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
                required
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 16px" }}>
              <span>
                {countdownActive
                  ? `OTP expires in ${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
                      secondsLeft % 60
                    ).padStart(2, "0")}`
                  : "OTP expired"}
              </span>
              <button
                type="button"
                className="login-btn"
                style={{
                  padding: "6px 10px",
                  fontSize: 14,
                  opacity: resendDisabled ? 0.5 : 1,
                  pointerEvents: resendDisabled ? "none" : "auto",
                }}
                onClick={handleResend}
                disabled={resendDisabled}
                aria-disabled={resendDisabled}
                title={countdownActive ? "Please wait for the timer to finish" : "Resend OTP"}
              >
                RESEND OTP
              </button>
            </div>

            <button className="login-btn" disabled={verifyDisabled}>
              {loading ? "Verifying..." : "VERIFY & UPDATE"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
