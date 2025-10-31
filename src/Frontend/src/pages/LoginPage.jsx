import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/LoginApi";
import "./LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔹 Call backend API
      const result = await loginUser(email, password);
      console.log("Login response:", result);

      // 🔹 Validate response success
      const isSuccess =
        result?.success === true ||
        String(result?.status || "").toLowerCase() === "success" ||
        String(result?.message || "").toLowerCase().includes("login") ||
        String(result?.message || "").toLowerCase().includes("successful");

      if (!isSuccess) {
        alert(result?.message || "❌ Login failed. Please try again.");
        return;
      }

      // 🔹 Save token (handle both token & access_token cases)
      const token = result?.token || result?.access_token;
      if (token) {
        localStorage.setItem("token", token);
      }

      // 🔹 Save user info
      if (result?.user) {
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      // 🔹 Detect role from various possible keys
      const roleRaw =
        result?.user?.role_group ||
        result?.user?.RoleGroup ||
        result?.user?.role ||
        result?.user?.Role ||
        "";
      const role = String(roleRaw).trim().toLowerCase();
      localStorage.setItem("role", role);

      console.log("Detected role:", role || "N/A");

      // 🔹 Success message
      alert("Login successful!");

      // 🔹 Navigate based on role
      if (role === "admin") {
        navigate("/dash", { replace: true }); // Admin → Dashboard
      } else if (role === "user") {
        navigate("/customer", { replace: true }); // User → Customer Portal
      } else {
        // Unknown role → fallback
        console.warn("Unknown role, defaulting to /customer");
        navigate("/customer", { replace: true });
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      alert(error?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Header */}
        <div className="login-header">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQX-tviCnKExYEC23Ytc1BQZ_oNJxilc9V10Q&s"
            alt="GIA Home Care Logo"
            className="login-logo"
          />
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Member Login</h2>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="extra-links">
            <a href="/forgot-password">Forgot Password?</a>
            <p>
              Don’t have an account? <a href="/register">Register</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
