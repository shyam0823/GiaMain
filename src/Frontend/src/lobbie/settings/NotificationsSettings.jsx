import React from 'react';
import './NotificationsSettings.css';

function NotificationsSettings() {
  return (
    <div className="notifications-root">
      <h1>Notifications</h1>
      <div className="notifications-subtitle">
        Control what notifications will be sent by Lobbie
      </div>
      <div className="notifications-panel">
        {/* Left Column: Patient Notifications */}
        <section className="notifications-col">
          <h2>Patient Notifications</h2>

          <div className="notif-group">
            <div className="notif-group-title">Forms</div>
            <label className="notif-checkbox checked">
              <input type="checkbox" checked readOnly />
              <span className="custom-checkbox"></span>
              Forms assigned without an appointment
            </label>
            <label className="notif-checkbox checked">
              <input type="checkbox" checked readOnly />
              <span className="custom-checkbox"></span>
              Form reminders without an appointment
            </label>
            <span className="view-link">View / Edit</span>
          </div>

          <div className="notif-divider"></div>

          <div className="notif-group">
            <div className="notif-group-title">Appointments</div>
            <label className="notif-checkbox disabled">
              <input type="checkbox" checked readOnly disabled />
              <span className="custom-checkbox"></span>
              New appointment created
            </label>
            <label className="notif-checkbox disabled nested">
              <input type="checkbox" checked readOnly disabled />
              <span className="custom-checkbox"></span>
              Appointment forms reminders
              <span className="info-icon">?</span>
            </label>
            <label className="notif-checkbox disabled">
              <input type="checkbox" checked readOnly disabled />
              <span className="custom-checkbox"></span>
              Appointment confirmation reminders
            </label>
          </div>

          <div className="notif-divider"></div>

          <div className="notif-group">
            <div className="notif-group-title">Appointment re-scheduling</div>
            <label className="notif-checkbox disabled">
              <input type="checkbox" checked readOnly disabled />
              <span className="custom-checkbox"></span>
              Re-scheduling of appointments via link to patient self-scheduling flow.
              <span className="info-icon">?</span>
            </label>
          </div>

          <div className="notif-divider"></div>

          <div className="notif-group">
            <div className="notif-group-title">In-office notifications</div>
            <label className="notif-checkbox checked">
              <input type="checkbox" checked readOnly />
              <span className="custom-checkbox"></span>
              Remote check-in reminders
            </label>
            <label className="notif-checkbox checked">
              <input type="checkbox" checked readOnly />
              <span className="custom-checkbox"></span>
              Room ready
            </label>
          </div>

          <div className="notif-divider"></div>

          <div className="notif-group">
            <div className="notif-group-title">Telehealth notifications</div>
            <label className="notif-checkbox checked">
              <input type="checkbox" checked readOnly />
              <span className="custom-checkbox"></span>
              Telehealth link reminders
            </label>
          </div>
        </section>

        {/* Right Column: Staff & General Notifications */}
        <section className="notifications-col right">
          <h2>Staff Notifications</h2>
          <label className="notif-checkbox checked">
            <input type="checkbox" checked readOnly />
            <span className="custom-checkbox"></span>
            Attach form PDFs to forms-complete notification emails
          </label>

          <div className="notif-divider"></div>

          <h2>General Notification Settings</h2>
          <label className="notif-checkbox checked">
            <input type="checkbox" checked readOnly />
            <span className="custom-checkbox"></span>
            Display the ability for patients to cancel appointments within notifications
          </label>

          <div className="notif-divider"></div>

          <div className="notif-group">
            <div className="notif-desc-title">User-level settings:</div>
            <div className="notif-desc">
              Adjust these settings under the staff user profile in the <a href="#">User settings</a>:<br />
              <ul>
                <li>New appointment created.</li>
                <li>Appointment canceled by patient.</li>
                <li>Forms completed by patient.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default NotificationsSettings
