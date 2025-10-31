import React from "react";
import "./FormsTabs.css";

const RefreshIcon = ({ spinning }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={spinning ? "spin" : ""}
  >
    <path
      d="M17.65 6.35A7.95 7.95 0 0012 4a8 8 0 100 16 8 8 0 007.75-6h-2.07a6 6 0 11-1.53-5.65l-2.6 2.6H22V4l-2.35 2.35z"
      fill="currentColor"
    />
  </svg>
);

const FormsTabs = ({
  selectedTab,
  setSelectedTab,
  onArchive,
  onUnarchive,
  onResetFilters,
  onRefresh,
  isRefreshing = false, // <-- pass from parent when fetching
}) => {
  const handleArchive   = onArchive       || (() => {});
  const handleUnarchive = onUnarchive     || (() => {});
  const handleReset     = onResetFilters  || (() => {});
  const handleRefresh   = onRefresh       || (() => {});

  return (
    <div className="forms-tabs-bar">
      <div className="tabs-left">
        {selectedTab === "Archived" ? (
          <button
            type="button"
            className="restore-btn"
            onClick={handleUnarchive}
          >
            Restore
          </button>
        ) : (
          <button
            type="button"
            className={`tab-link ${selectedTab === "Archive" ? "active" : ""}`}
            onClick={() => {
              setSelectedTab("Archive");
              handleArchive();
            }}
          >
            Archive
          </button>
        )}

        <button
          type="button"
          className={`tab-link ${selectedTab === "Current" ? "active" : ""}`}
          onClick={() => setSelectedTab("Current")}
        >
          Current
        </button>

        <button
          type="button"
          className={`tab-link ${selectedTab === "Archived" ? "active" : ""}`}
          onClick={() => setSelectedTab("Archived")}
        >
          Archived
        </button>

        <button
          type="button"
          className={`tab-link ${selectedTab === "Inactive" ? "active" : ""}`}
          onClick={() => setSelectedTab("Inactive")}
        >
          Inactive
        </button>
      </div>

      <div className="tabs-right">
        <button
          type="button"
          className="btn-outline icon-only"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          title="Refresh"
        >
          <RefreshIcon spinning={isRefreshing} />
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={handleReset}
          title="Reset Filters"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default FormsTabs;
