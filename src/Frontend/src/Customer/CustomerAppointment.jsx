import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./CustomerAppointment.css";

/* helpers */
const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("access_token") || "";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const parseJwt = (tok) => {
  if (!tok || tok.split(".").length < 2) return {};
  try {
    const base64 = tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
};

const CustomerAppointment = ({ customerId }) => {
  const token = getToken();
  const user = useMemo(getUser, []);
  const claims = useMemo(() => parseJwt(token), [token]);

  const derivedCustomerId =
    customerId ??
    user?.patient_id ??
    user?.customer_id ??
    user?.CustomerID ??
    claims?.patient_id ??
    user?.id ??
    user?.Id ??
    91;

  const [appointment, setAppointment] = useState({
    name:
      user?.full_name ||
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
      user?.name ||
      "",
    email: (user?.email || "").toLowerCase(),
    phone: user?.phone || user?.Phone || "",
    doctor: "",
    date: "",
    time: "",
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 2500);
  };

  const handleBookAppointment = async () => {
    const { name, email, phone, doctor, date, time } = appointment;
    if (!name || !email || !phone || !doctor || !date || !time) {
      showToast("Please fill all appointment fields.", "error");
      return;
    }

    try {
      setLoading(true);

      // Match Flask /api/book_appointment
      const payload = {
        patientName: name,
        patientEmail: email.toLowerCase(),
        phoneNumber: phone,
        appointmentDate: date,   // "YYYY-MM-DD"
        appointmentTime: time,   // "HH:MM"
        specialist: doctor,      // this is a specialization in your UI
      };

      await axios.post("/api/book_appointment", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Appointment booked successfully!", "success");

      setAppointment({
        name:
          user?.full_name ||
          [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
          user?.name ||
          "",
        email: (user?.email || "").toLowerCase(),
        phone: user?.phone || user?.Phone || "",
        doctor: "",
        date: "",
        time: "",
      });
    } catch (err) {
      console.error("Error booking appointment:", err);
      showToast("❌ Failed to book appointment. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appointment-page">
      <div className="appointment-container">
        <h2 className="appointment-title">Book Appointment</h2>

        {/* Outer soft panel that spans the full right content width */}
        <div className="appointment-outer">
          {/* Inner card that expands inside the outer overlay */}
          <div className="appointment-card">
            <form
              className="appointment-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleBookAppointment();
              }}
            >
              <input
                placeholder="Patient Name"
                value={appointment.name}
                onChange={(e) =>
                  setAppointment({ ...appointment, name: e.target.value })
                }
              />
              <input
                placeholder="Email"
                type="email"
                value={appointment.email}
                onChange={(e) =>
                  setAppointment({ ...appointment, email: e.target.value })
                }
              />
              <input
                placeholder="Phone Number"
                type="tel"
                value={appointment.phone}
                onChange={(e) =>
                  setAppointment({ ...appointment, phone: e.target.value })
                }
              />
              <input
                placeholder="Specialist"
                value={appointment.doctor}
                onChange={(e) =>
                  setAppointment({ ...appointment, doctor: e.target.value })
                }
              />
              <input
                type="date"
                value={appointment.date}
                onChange={(e) =>
                  setAppointment({ ...appointment, date: e.target.value })
                }
              />
              <input
                type="time"
                value={appointment.time}
                onChange={(e) =>
                  setAppointment({ ...appointment, time: e.target.value })
                }
              />

              <button type="submit" disabled={loading}>
                {loading ? "Booking..." : "Book Appointment"}
              </button>
            </form>
          </div>
        </div>

        {toast.show && (
          <div className={`toast-message ${toast.type}`}>{toast.message}</div>
        )}
      </div>
    </div>
  );
};

export default CustomerAppointment;
