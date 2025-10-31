import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import { registerUser } from "../api/RegisterApi";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    mobile_number: "",
    role_group: "user",
    default_location: "",
    is_active: true,
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const data = await registerUser(formData);
      console.log("API response:", data);

      // Flexible success check
      const isSuccess =
        data?.success === true ||
        data?.status?.toLowerCase() === "success" ||
        data?.status?.toLowerCase() === "ok" ||
        data?.message?.toLowerCase().includes("register");

      if (isSuccess) {
        setMessage("✅ " + (data.message || "Registration successful"));
        setIsError(false);

        // Reset form
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          mobile_number: "",
          role_group: "user",
          default_location: "",
          is_active: true,
        });

        // Navigate immediately to login
        navigate("/login");
      } else {
        setMessage("❌ " + (data.message || "Registration failed"));
        setIsError(true);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setMessage("❌ Registration failed. Please try again.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>

      {message && (
        <div className={isError ? "error" : "success"}>{message}</div>
      )}

      <form className="register-form" onSubmit={handleSubmit}>
        <label>First Name</label>
        <input
          type="text"
          name="first_name"
          placeholder="Enter first name"
          value={formData.first_name}
          onChange={handleChange}
          required
        />

        <label>Last Name</label>
        <input
          type="text"
          name="last_name"
          placeholder="Enter last name"
          value={formData.last_name}
          onChange={handleChange}
          required
        />

        <label>Email</label>
        <input
          type="email"
          name="email"
          placeholder="Enter email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label>Password</label>
        <input
          type="password"
          name="password"
          placeholder="Enter password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <label>Mobile Number</label>
        <input
          type="text"
          name="mobile_number"
          placeholder="Enter mobile number"
          value={formData.mobile_number}
          onChange={handleChange}
          required
        />

        <label>Role Group</label>
        <select
          name="role_group"
          value={formData.role_group}
          onChange={handleChange}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <label>Default Location</label>
        <input
          type="text"
          name="default_location"
          placeholder="Enter default location"
          value={formData.default_location}
          onChange={handleChange}
        />

        <label>
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
          />
          Active
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}

export default Register;
