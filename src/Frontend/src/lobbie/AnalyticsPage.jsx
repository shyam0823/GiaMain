// src/lobbie/AnalyticsPage.jsx
import React, { useEffect, useState } from "react";
import "./AnalyticsPage.css";
import DetailView from "./DetailView"; // added DetailView import
import {
  fetchFormsAnalytics,
  fetchPatientsAnalytics,
} from "../api/lobbieDashboardApi";
 
function AnalyticsPage() {
  const [view, setView] = useState("forms");
  const [mode, setMode] = useState("overview"); // Overview / Detail View toggle
  const [dateRange, setDateRange] = useState("past-week");
  const [startDate, setStartDate] = useState("2025-09-15");
  const [endDate, setEndDate] = useState("2025-09-23");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareStart, setCompareStart] = useState("2025-08-15");
  const [compareEnd, setCompareEnd] = useState("2025-08-23");
 
  const [formsData, setFormsData] = useState(null);
  const [patientsData, setPatientsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
 
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        let data;
        if (view === "forms") {
          data = await fetchFormsAnalytics({
            startDate,
            endDate,
            ...(compareEnabled ? { compareStart, compareEnd } : {}),
          });
          setFormsData(data);
        } else {
          data = await fetchPatientsAnalytics({
            startDate,
            endDate,
            ...(compareEnabled ? { compareStart, compareEnd } : {}),
          });
          setPatientsData(data);
        }
      } catch (err) {
        console.error("Analytics load failed", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [view, mode, startDate, endDate, compareEnabled, compareStart, compareEnd]);
 
  // Loading or error states
  if (loading) return <div>Loading analytics data...</div>;
  if (error) return <div>{error}</div>;
 
  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h2>Analytics</h2>
        <div className="analytics-tabs">
          <button
            className={`tab-btn ${mode === "overview" ? "active" : ""}`}
            onClick={() => setMode("overview")}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${mode === "detail" ? "active" : ""}`}
            onClick={() => setMode("detail")}
          >
            Detail View
          </button>
        </div>
      </div>
 
      {/* Filters */}
      <div className="analytics-filters">
        <label className="analytics-label" htmlFor="date-range">
          Date Range:
        </label>
        <select
          id="date-range"
          value={dateRange}
          className="analytics-select"
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="past-week">Past Week</option>
          <option value="past-month">Past Month</option>
          <option value="custom">Custom</option>
        </select>
 
        <input
          className="analytics-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span className="analytics-date-separator">–</span>
        <input
          className="analytics-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
 
        <label className="analytics-checkbox-label">
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(e) => setCompareEnabled(e.target.checked)}
          />
          <span>Comparing To:</span>
        </label>
 
        {compareEnabled && (
          <>
            <input
              className="analytics-date"
              type="date"
              value={compareStart}
              onChange={(e) => setCompareStart(e.target.value)}
            />
            <span className="analytics-date-separator">–</span>
            <input
              className="analytics-date"
              type="date"
              value={compareEnd}
              onChange={(e) => setCompareEnd(e.target.value)}
            />
          </>
        )}
 
        {/* Forms / Patients Toggle */}
        <div className="analytics-toggle-group">
          <label className="analytics-radio">
            <input
              type="radio"
              name="analytics-toggle"
              checked={view === "forms"}
              onChange={() => setView("forms")}
            />
            <span>Forms</span>
          </label>
          <label className="analytics-radio">
            <input
              type="radio"
              name="analytics-toggle"
              checked={view === "patients"}
              onChange={() => setView("patients")}
            />
            <span>Patients</span>
          </label>
        </div>
      </div>
 
      {/* Table / Detail View */}
      <div className="analytics-table">
        {mode === "overview" ? (
          view === "forms" && formsData ? (
            <table>
              <thead>
                <tr>
                  <th>Forms</th>
                  <th>Current</th>
                  {formsData.compare && <th>Comparing To</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Assigned</td>
                  <td>{formsData.current?.Assigned}</td>
                  {formsData.compare && <td>{formsData.compare?.Assigned}</td>}
                </tr>
                <tr>
                  <td>Completed</td>
                  <td>{formsData.current?.Completed}</td>
                  {formsData.compare && <td>{formsData.compare?.Completed}</td>}
                </tr>
                <tr>
                  <td>Completion Rate</td>
                  <td>{formsData.current?.CompletionRate}</td>
                  {formsData.compare && (
                    <td>{formsData.compare?.CompletionRate}</td>
                  )}
                </tr>
                <tr>
                  <td
                    colSpan={formsData.compare ? 3 : 2}
                    className="section-divider"
                  >
                    Forms Within 24 Hours of the Due Date
                  </td>
                </tr>
                <tr>
                  <td>Completed</td>
                  <td>{formsData.current?.Within24_Completed}</td>
                  {formsData.compare && (
                    <td>{formsData.compare?.Within24_Completed}</td>
                  )}
                </tr>
                <tr>
                  <td>Completion Rate</td>
                  <td>{formsData.current?.Within24_CompletionRate}</td>
                  {formsData.compare && (
                    <td>{formsData.compare?.Within24_CompletionRate}</td>
                  )}
                </tr>
              </tbody>
            </table>
          ) : view === "patients" && patientsData ? (
            <table>
              <thead>
                <tr>
                  <th>Patients by Known Intake Method</th>
                  <th>Current</th>
                  {patientsData.compare && <th>Comparing To</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total</td>
                  <td>{patientsData.current?.Total}</td>
                  {patientsData.compare && (
                    <td>{patientsData.compare?.Total}</td>
                  )}
                </tr>
                <tr>
                  <td>Bulk Import</td>
                  <td>{patientsData.current?.Bulk_Import}</td>
                  {patientsData.compare && (
                    <td>{patientsData.compare?.Bulk_Import}</td>
                  )}
                </tr>
                <tr>
                  <td>Integration</td>
                  <td>{patientsData.current?.Integration}</td>
                  {patientsData.compare && (
                    <td>{patientsData.compare?.Integration}</td>
                  )}
                </tr>
                <tr>
                  <td>Patient Self Scheduling</td>
                  <td>{patientsData.current?.Patient_Self_Scheduling}</td>
                  {patientsData.compare && (
                    <td>{patientsData.compare?.Patient_Self_Scheduling}</td>
                  )}
                </tr>
                <tr>
                  <td>Sent Forms</td>
                  <td>{patientsData.current?.Sent_Forms}</td>
                  {patientsData.compare && (
                    <td>{patientsData.compare?.Sent_Forms}</td>
                  )}
                </tr>
                <tr>
                  <td>Staff Created</td>
                  <td>{patientsData.current?.Staff_Created}</td>
                  {patientsData.compare && (
                    <td>{patientsData.compare?.Staff_Created}</td>
                  )}
                </tr>
                <tr>
                  <td>Staff Scheduled Appointments</td>
                  <td>{patientsData.current?.Staff_Scheduled_Appointments}</td>
                  {patientsData.compare && (
                    <td>
                      {patientsData.compare?.Staff_Scheduled_Appointments}
                    </td>
                  )}
                </tr>
                <tr>
                  <td>Static/Anonymous Form Template Group Link</td>
                  <td>{patientsData.current?.Static_Anonymous_Link}</td>
                  {patientsData.compare && (
                    <td>{patientsData.compare?.Static_Anonymous_Link}</td>
                  )}
                </tr>
              </tbody>
            </table>
          ) : (
            <div>No data available for selected view.</div>
          )
        ) : (
          <DetailView startDate={startDate} endDate={endDate} />
        )}
      </div>
    </div>
  );
}
 
export default AnalyticsPage;