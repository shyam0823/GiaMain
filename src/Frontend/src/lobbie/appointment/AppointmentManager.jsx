import React, { useState, useEffect } from "react";
import "./AppointmentManager.css";
import AppointmentCalendar from "./AppointmentCalendar";
import AppointmentForm from "./AppointmentForm";
import AppointmentList from "./AppointmentList";
import PostponeModal from "./PostponeModal";
import CancelModal from "./CancelModal";
import {
  addAppointmentApi,
  getAppointmentsApi,
  cancelAppointmentApi,     // delete in backend
  postponeAppointmentApi,   // reschedule in backend
} from "../../api/AppointmentApi";

/** Local date → "YYYY-MM-DD" (NO toISOString here) */
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Pretty print "YYYY-MM-DD" → "Nov 11, 2025" (timezone-safe) */
const pretty = (ymd) => {
  if (!ymd) return "—";
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    // Fallback: try Date parse for other shapes
    const d = new Date(ymd);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return ymd;
  }
  const [, y, mm, dd] = m;
  const d = new Date(Number(y), Number(mm) - 1, Number(dd)); // local-safe construction
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const AppointmentManager = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);

  // Postpone modal state
  const [showPostpone, setShowPostpone] = useState(false);
  const [postponeTargetId, setPostponeTargetId] = useState(null);
  const [postponePrefill, setPostponePrefill] = useState({
    date: "",
    time: "",
  });

  // Cancel modal state
  const [showCancel, setShowCancel] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelTargetName, setCancelTargetName] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch appointments from backend
  const fetchAppointments = async () => {
    try {
      const data = await getAppointmentsApi();
      // Normalize backend fields → always keep appointmentDate/time in camelCase
      const normalized = (data || []).map((app) => ({
        ...app,
        id: app.id ?? app.AppointmentID, // safety
        appointmentDate: app.AppointmentDate || app.appointmentDate, // "YYYY-MM-DD"
        appointmentTime: app.AppointmentTime || app.appointmentTime, // "HH:MM:SS"
        status: app.Status || app.status || "confirmed",
        purpose: app.purpose || "Regular appointment",
        PatientName: app.PatientName || app.patientName,
        PhoneNumber: app.PhoneNumber || app.phoneNumber,
      }));
      setAppointments(normalized);
    } catch (error) {
      console.error("❌ Failed to fetch appointments:", error);
    }
  };

  // Add new appointment
  const addAppointment = async (appointment) => {
    try {
      await addAppointmentApi(appointment);
      await fetchAppointments();
      setShowForm(false);
    } catch (error) {
      console.error("❌ Failed to save appointment:", error);
      alert("Error saving appointment. Please try again.");
    }
  };

  // Open cancel modal
  const openCancel = (id) => {
    const target = appointments.find((a) => a.id === id);
    setCancelTargetId(id);
    setCancelTargetName(target?.PatientName || target?.patientName || "");
    setShowCancel(true);
  };

  // Confirm cancel (DELETE in backend)
  const confirmCancel = async () => {
    try {
      await cancelAppointmentApi(cancelTargetId);
      setAppointments((prev) => prev.filter((app) => app.id !== cancelTargetId));
      setShowCancel(false);
    } catch (error) {
      console.error("❌ Failed to cancel appointment:", error);
      alert("Failed to cancel appointment.");
    }
  };

  // Local-only update placeholder (e.g., Start Visit)
  const updateAppointment = async (id, updatedAppointment) => {
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, ...updatedAppointment } : app))
    );
  };

  // Open postpone modal with prefilled values
  const openPostpone = (id) => {
    const cur = appointments.find((a) => a.id === id);
    const currentDate = cur?.appointmentDate || cur?.AppointmentDate || toYMD(new Date());
    const rawTime = cur?.appointmentTime || cur?.AppointmentTime || "09:00:00";
    const currentTime = rawTime.length === 8 ? rawTime.slice(0, 5) : rawTime;

    setPostponeTargetId(id);
    setPostponePrefill({ date: currentDate, time: currentTime });
    setShowPostpone(true);
  };

  // Submit postpone to backend
  const submitPostpone = async ({ appointmentDate, appointmentTime, reason }) => {
    try {
      if (!postponeTargetId) return;
      await postponeAppointmentApi(postponeTargetId, {
        appointmentDate,             // "YYYY-MM-DD"
        appointmentTime,             // "HH:MM" or "HH:MM:SS"
        reason: reason || "",
      });
      setShowPostpone(false);
      setPostponeTargetId(null);
      await fetchAppointments();
    } catch (error) {
      console.error("❌ Failed to postpone appointment:", error);
      alert("Failed to reschedule. Please check the date/time format and try again.");
    }
  };

  // Filter by local date string (NO new Date on backend date)
  const getAppointmentsForDate = (date) => {
    const dateString = toYMD(date); // exact local day the user clicked
    return appointments.filter(
      (app) => (app.appointmentDate || app.AppointmentDate) === dateString
    );
  };

  const selectedDateStr = toYMD(selectedDate);

  const getTotalAppointments = () => appointments.length;
  const getUrgentCases = () =>
    appointments.filter((app) => String(app.status).toLowerCase() === "urgent").length;
  const getTodaysAppointments = () =>
    getAppointmentsForDate(selectedDate).length;

  return (
    <div className="appointment-manager">
      <div className="header">
        <h1>GIA Homecare</h1>
        <p>Doctor Appointment Management System</p>
        <button
          className="new-appointment-btn"
          onClick={() => setShowForm(true)}
        >
          + New Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Today's Appointments</h3>
          <div className="stat-number">{getTodaysAppointments()}</div>
          <p>{getTodaysAppointments()} pending confirmations</p>
        </div>
        <div className="stat-card">
          <h3>Total Patients</h3>
          <div className="stat-number">{getTotalAppointments()}</div>
          <p>Active patient records</p>
        </div>
        <div className="stat-card">
          <h3>Average Wait Time</h3>
          <div className="stat-number">8 min</div>
          <p>Below target of 15 min</p>
        </div>
        <div className="stat-card">
          <h3>Urgent Cases</h3>
          <div className="stat-number">{getUrgentCases()}</div>
          <p>Require immediate attention</p>
        </div>
      </div>

      {/* Calendar + Appointments */}
      <div className="main-content">
        <div className="calendar-section">
          <AppointmentCalendar
            appointments={appointments}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        <div className="appointments-section">
          <h3>
            Appointments for {pretty(selectedDateStr)}
            <span className="appointment-count">
              {getAppointmentsForDate(selectedDate).length} appointments
            </span>
          </h3>
          <AppointmentList
            appointments={getAppointmentsForDate(selectedDate)}
            onDelete={openCancel}           //  opens cancel modal
            onUpdate={updateAppointment}
            onPostpone={openPostpone}        // opens modal → PUT postpone
            onAdd={() => setShowForm(true)}  // enables +Schedule button in empty state
          />
        </div>
      </div>

      {/* Appointment Form */}
      {showForm && (
        <AppointmentForm
          onSubmit={addAppointment}
          onClose={() => setShowForm(false)}
          selectedDate={selectedDate}
        />
      )}

      {/* Postpone Modal */}
      <PostponeModal
        show={showPostpone}
        onClose={() => setShowPostpone(false)}
        onSubmit={submitPostpone}
        currentDate={postponePrefill.date}
        currentTime={postponePrefill.time}
      />

      {/* Cancel Modal */}
      <CancelModal
        show={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={confirmCancel}
        patientName={cancelTargetName}
      />
    </div>
  );
};

export default AppointmentManager;
