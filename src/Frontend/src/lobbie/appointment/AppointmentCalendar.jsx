import React, { useState, useEffect } from 'react';
import "./AppointmentCalendar.css";

/** Local date → "YYYY-MM-DD" (no UTC conversion) */
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const AppointmentCalendar = ({ appointments, selectedDate, onDateSelect }) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
  }, [selectedDate]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const days = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day);
    const dateString = toYMD(date); // local day key
    //Use correct field and no new Date() on backend date
    const dayAppointments = appointments.filter(
      (app) =>
        (app.appointmentDate || app.AppointmentDate) === dateString
    );

    const isSelected = selectedDate.toDateString() === date.toDateString();
    const isToday = new Date().toDateString() === date.toDateString();

    days.push(
      <div
        key={day}
        className={`calendar-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}${
          dayAppointments.length ? ' has-appointments' : ''
        }`}
        onClick={() => onDateSelect(date)}
      >
        <span className="day-number">{day}</span>
        {dayAppointments.length > 0 && (
          <span className="appointment-indicator">{dayAppointments.length}</span>
        )}
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-selector">
        <button className="selector-btn" onClick={prevMonth}>&lt;</button>
        <span className="selector-label">
          {new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })}
        </span>
        <button className="selector-btn" onClick={nextMonth}>&gt;</button>
      </div>

      <div className="calendar-weekdays">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="weekday">{d}</div>
        ))}
      </div>

      <div className="calendar-days">{days}</div>
    </div>
  );
};

export default AppointmentCalendar;
