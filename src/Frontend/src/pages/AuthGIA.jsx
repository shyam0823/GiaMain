import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// use global tokens (inputs, colors, fonts)
import "../theme/typography-and-inputs.css";
import "./AuthGIA.css";

import giaLogo from "../assets/gia-logo.png";
import doctorImg from "../assets/doctor.png";

export default function AuthGIA({ onLogin, onRegister }) {
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // unified form state for both modes
  const [form, setForm] = useState({
    // signin
    email: "",
    password: "",

    // signup
    first_name: "",
    last_name: "",
    mobile_number: "",
    role_group: "user",
    default_location: "",
    is_active: true,
  });

  useEffect(() => {
    const want = mode === "signin" ? "/login" : "/register";
    if (window.location.pathname !== want) {
      window.history.replaceState(null, "", want);
    }
  }, [mode]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === "signin") {
        const resp = await onLogin?.(form.email, form.password);

        const ok =
          resp?.success === true ||
          ["success", "ok"].includes(String(resp?.status || "").toLowerCase()) ||
          String(resp?.message || "").toLowerCase().includes("login");

        if (!ok) throw new Error(resp?.message || "Login failed");

        const token = resp?.token || resp?.access_token;
        if (token) localStorage.setItem("token", token);
        if (resp?.user) localStorage.setItem("user", JSON.stringify(resp.user));

        const role =
          String(
            resp?.user?.role_group ||
              resp?.user?.RoleGroup ||
              resp?.user?.role ||
              resp?.user?.Role ||
              ""
          )
            .trim()
            .toLowerCase() || "user";

        localStorage.setItem("role", role);
        nav(role === "admin" ? "/dash" : "/customer", { replace: true });
      } else {
        // build payload EXACTLY like your Register component
        const payload = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          mobile_number: form.mobile_number,
          role_group: form.role_group || "user",
          default_location: form.default_location,
          is_active: !!form.is_active,
        };

        const resp = await onRegister?.(payload);

        const ok =
          resp?.success === true ||
          ["success", "ok"].includes(String(resp?.status || "").toLowerCase()) ||
          String(resp?.message || "").toLowerCase().includes("register");

        if (!ok) throw new Error(resp?.message || "Registration failed");

        // go to sign in
        setMode("signin");
        window.history.replaceState(null, "", "/login");

        // optional: clear signup fields
        setForm((p) => ({
          ...p,
          first_name: "",
          last_name: "",
          mobile_number: "",
          role_group: "user",
          default_location: "",
          is_active: true,
        }));
      }
    } catch (err) {
      alert(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gia-auth-shell">
      <section className="gia-auth-frame">
        {/* LEFT — gradient brand panel with logo + doctor */}
        <aside className="gia-left">
          {/* animated transparent theme bubbles */}
          <div className="bounce-field" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className={`ball n${i + 1}`} />
            ))}
          </div>

          <img
            src={giaLogo}
            alt="GIA Homecare Services"
            className="gia-brand brand-glow"
          />

          <div className="gia-hero">
            <img src={doctorImg} alt="Healthcare professional" />
          </div>

          <p className="gia-copy">
            © {new Date().getFullYear()} GIA Homecare Services
          </p>
        </aside>

        {/* RIGHT — form section */}
        <aside className="gia-right">
          <div className="gia-tabs">
            <button
              type="button"
              className={`tab ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
            <button
              type="button"
              className={`tab ${mode === "signin" ? "is-active" : ""}`}
              onClick={() => setMode("signin")}
            >
              Sign In
            </button>
          </div>

          <div className="gia-card wide">
            <form onSubmit={submit} className="gia-form">
              {mode === "signup" ? (
                <>
                  <Field label="First Name">
                    <Input
                      name="first_name"
                      placeholder="Jane"
                      value={form.first_name}
                      onChange={onChange}
                      autoComplete="given-name"
                      required
                    />
                  </Field>

                  <Field label="Last Name">
                    <Input
                      name="last_name"
                      placeholder="Doe"
                      value={form.last_name}
                      onChange={onChange}
                      autoComplete="family-name"
                      required
                    />
                  </Field>

                  <Field label="Email">
                    <Input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={onChange}
                      autoComplete="email"
                      required
                    />
                  </Field>

                  <Field label="Password">
                    <Input
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={onChange}
                      autoComplete="new-password"
                      required
                    />
                  </Field>

                  <Field label="Mobile Number">
                    <Input
                      name="mobile_number"
                      type="tel"
                      placeholder="9876543210"
                      value={form.mobile_number}
                      onChange={onChange}
                      autoComplete="tel"
                      required
                    />
                  </Field>

                  <Field label="Role Group">
                    <Select
                      name="role_group"
                      value={form.role_group}
                      onChange={onChange}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </Field>

                  <Field label="Default Location">
                    <Input
                      name="default_location"
                      placeholder="Hyderabad"
                      value={form.default_location}
                      onChange={onChange}
                      autoComplete="address-level2"
                    />
                  </Field>

                  <CheckRow>
                    <input
                      id="is_active"
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={onChange}
                    />
                    <label htmlFor="is_active">Active</label>
                  </CheckRow>
                </>
              ) : (
                <>
                  <Field label="Email">
                    <Input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={onChange}
                      autoComplete="email"
                      required
                    />
                  </Field>

                  <Field label="Password">
                    <Input
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={onChange}
                      autoComplete="current-password"
                      required
                    />
                  </Field>

                  {/* Centered forgot password */}
                  <div className="row-center">
                    <Link className="muted-link center-link" to="/forgot-password">
                      Forgot password?
                    </Link>
                  </div>
                </>
              )}

              <button className="btn-primary" disabled={loading}>
                {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
              </button>

              {/* Plain text toggle */}
              <p className="foot-link">
                {mode === "signin" ? (
                  <>
                    Don’t have an account?{" "}
                    <a
                      href="#"
                      className="auth-textlink"
                      onClick={(e) => {
                        e.preventDefault();
                        setMode("signup");
                      }}
                    >
                      Sign Up
                    </a>
                  </>
                ) : (
                  <>
                    I have an account?{" "}
                    <a
                      href="#"
                      className="auth-textlink"
                      onClick={(e) => {
                        e.preventDefault();
                        setMode("signin");
                      }}
                    >
                      Sign In
                    </a>
                  </>
                )}
              </p>
            </form>
          </div>
        </aside>
      </section>
    </div>
  );
}

/* -----------------------
   Small form primitives
------------------------*/
function Field({ label, children }) {
  return (
    <label className="field">
      <span className="flabel">{label}</span>
      {children}
    </label>
  );
}
function Input(props) {
  return <input {...props} className="input" />;
}
function Select(props) {
  return <select {...props} className="input" />;
}
function CheckRow({ children }) {
  return <div className="check-row">{children}</div>;
}
