import "./FormsFilters.css";
import React, { useMemo } from "react";
import ThemedSelect from "./ThemedSelect";

export default function FormsFilters({
  patientFilter,
  setPatientFilter,
  formTemplateFilter,
  setFormTemplateFilter,
  practitionerFilter,
  setPractitionerFilter,
  statusFilter,
  setStatusFilter,
  dueFilter,
  setDueFilter,
  allForms,
}) {
  const opt = (value, label = value) => ({ value, label });
  const fromValue = (options, v) => options.find(o => o.value === v) || null;

  const formOptions = useMemo(() => {
    const base = [opt("All", "All Forms")];
    const forms = (allForms || []).map(f => opt(f.title, f.title));
    return [...base, ...forms];
  }, [allForms]);

  const practitionerOptions = useMemo(
    () => [opt("All Practitioners"), opt("GIA HR"), opt("NY Branch")],
    []
  );

  const statusOptions = useMemo(
    () => [opt("All", "All Status"), opt("Active"), opt("Completed"), opt("Not Started")],
    []
  );

  const dueOptions = useMemo(
    () => [
      opt("All", "All Due Dates"),
      opt("overdue", "Overdue"),
      opt("this-week", "This week"),
      opt("this-month", "This month"),
    ],
    []
  );

  return (
    <form className="forms-filters" aria-label="Forms filters">
      {/* Search */}
      <div className="forms-filters__item forms-filters__item--search">
        <label htmlFor="search" className="sr-only">Search</label>
        <input
          id="search"
          name="search"
          type="text"
          placeholder="Filter by patient name..."
          className="ff-input"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
        />
      </div>

      {/* All Forms */}
      <div className="forms-filters__item">
        <ThemedSelect
          options={formOptions}
          value={fromValue(formOptions, formTemplateFilter)}
          onChange={(o) => setFormTemplateFilter(o?.value ?? "All")}
          placeholder="All Forms"
        />
      </div>

      {/* All Practitioners */}
      <div className="forms-filters__item">
        <ThemedSelect
          options={practitionerOptions}
          value={fromValue(practitionerOptions, practitionerFilter)}
          onChange={(o) => setPractitionerFilter(o?.value ?? "All Practitioners")}
          placeholder="All Practitioners"
        />
      </div>

      {/* All Status */}
      <div className="forms-filters__item">
        <ThemedSelect
          options={statusOptions}
          value={fromValue(statusOptions, statusFilter)}
          onChange={(o) => setStatusFilter(o?.value ?? "All")}
          placeholder="All Status"
        />
      </div>

      {/* All Due Dates */}
      <div className="forms-filters__item">
        <ThemedSelect
          options={dueOptions}
          value={fromValue(dueOptions, dueFilter)}
          onChange={(o) => setDueFilter(o?.value ?? "All")}
          placeholder="All Due Dates"
        />
      </div>
    </form>
  );
}
