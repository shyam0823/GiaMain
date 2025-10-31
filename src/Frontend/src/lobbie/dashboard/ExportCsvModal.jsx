import React, { useState, useMemo } from "react";
import axios from "axios";
import "./ExportCsvModal.css";

/**
 * Props (optional):
 * - onClose: () => void
 * - selectedPatientIds: number[]
 * - selectedTemplateIds: number[]
 * - selectedStatuses: string[]
 * - dueFrom: string (YYYY-MM-DD)
 * - dueTo: string   (YYYY-MM-DD)
 * - locationName: string
 */
function ExportCsvModal({
  onClose,
  selectedPatientIds = [],
  selectedTemplateIds = [],
  selectedStatuses = [],
  dueFrom = "",
  dueTo = "",
  locationName = "GIA HR",
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  // Defaults tuned for Lobbie-like export (ZIP with one CSV per template)
  const [opts, setOpts] = useState({
    // General
    respectLocation: true,
    respectPage: true,
    includeCurrentAndArchived: true,

    // Filters
    respectTemplates: true,
    respectPractitioner: false, // placeholder (not used)
    respectDueDate: false,
    respectStatus: false,
    respectGroups: false, // placeholder (not used)

    // Answers / structure (used by backend to generate Lobbie-style ZIP)
    includeAnswers: true,
    includeAnswerMeta: false,
    groupPerTemplate: true,
  });

  // Are ALL currently checked?
  const allChecked = useMemo(() => Object.values(opts).every(Boolean), [opts]);

  // Toggle a single flag
  const toggle = (key) => setOpts((prev) => ({ ...prev, [key]: !prev[key] }));

  // Toggle all -> if all are checked, uncheck all; else check all
  const handleUncheckAll = () => {
    const next = !allChecked;
    const updated = Object.fromEntries(Object.keys(opts).map((k) => [k, next]));
    if (!updated.includeAnswers && updated.includeAnswerMeta) {
      updated.includeAnswerMeta = false;
    }
    setOpts(updated);
  };

  // Keep includeAnswerMeta disabled if includeAnswers is false
  const handleToggleIncludeAnswers = () => {
    setOpts((prev) => {
      const includeAnswers = !prev.includeAnswers;
      return {
        ...prev,
        includeAnswers,
        includeAnswerMeta: includeAnswers ? prev.includeAnswerMeta : false,
      };
    });
  };

  // Build payload for backend
  const buildPayload = () => {
    const payload = {
      includeCurrentAndArchived: opts.includeCurrentAndArchived,

      // answers/structure -> enables per-template ZIP with pivoted fields
      includeAnswers: opts.includeAnswers,
      groupPerTemplate: opts.groupPerTemplate,
      includeAnswerMeta: opts.includeAnswers && opts.includeAnswerMeta,
    };

    if (opts.respectPage && selectedPatientIds.length) {
      payload.respectPage = true;
      payload.patientIds = selectedPatientIds;
    }

    if (opts.respectTemplates && selectedTemplateIds.length) {
      payload.respectTemplates = true;
      payload.templateIds = selectedTemplateIds;
    }

    if (opts.respectStatus && selectedStatuses.length) {
      payload.respectStatus = true;
      payload.statuses = selectedStatuses;
    }

    if (opts.respectDueDate && (dueFrom || dueTo)) {
      payload.respectDueDate = true;
      if (dueFrom) payload.dueFrom = dueFrom;
      if (dueTo) payload.dueTo = dueTo;
    }

    if (opts.respectLocation && locationName) {
      payload.respectLocation = true;
      payload.location = locationName;
    }

    return payload;
  };

  // Call Flask backend and download CSV/ZIP
  const handleCreateCsv = async () => {
    setError("");
    setIsDownloading(true);
    try {
      const payload = buildPayload();

      const res = await axios.post(
        "http://127.0.0.1:5000/api/exports/forms/csv",
        payload,
        { responseType: "blob" }
      );

      // Extract filename from header (CSV or ZIP)
      const disposition = res.headers["content-disposition"] || "";
      let filename = opts.includeAnswers
        ? "forms-export.zip"
        : "forms-export.csv";
      const match = disposition.match(
        /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i
      );
      if (match) filename = decodeURIComponent(match[1] || match[2]);

      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || (opts.includeAnswers ? "application/zip" : "text/csv"),
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();

      onClose?.();
    } catch (err) {
      let msg = "Failed to generate CSV. Check backend connection or data.";
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed?.message) msg = parsed.message;
          } catch {
            msg = text || msg;
          }
        } else if (err.message) {
          msg = err.message;
        }
      } catch {}
      setError(msg);
      console.error("CSV export failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="export-modal-backdrop">
      <div className="export-modal">
        <h2 className="export-modal-title">Export Forms to CSV</h2>
        <div className="export-modal-desc">
          Configure how you want to export forms to CSV.
          <br />
          <span className="export-modal-helper">
            When you click "Create CSV", Lobbie will remember your choices.
          </span>
        </div>

        {/* Top Row: Uncheck All / Check All */}
        <div className="export-modal-row">
          <div style={{ flex: 1 }} />
          <button className="export-modal-uncheck" onClick={handleUncheckAll}>
            {allChecked ? "Uncheck All" : "Check All"}
          </button>
        </div>

        {/* General */}
        <div className="export-section-label">General:</div>
        <div className="export-modal-row">
          <label className={`export-checkbox ${opts.respectLocation ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={opts.respectLocation}
              onChange={() => toggle("respectLocation")}
            />
            <span className="custom-checkbox"></span>
            Respect current Lobbie location?
          </label>

          <label className={`export-checkbox ${opts.respectPage ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={opts.respectPage}
              onChange={() => toggle("respectPage")}
            />
            <span className="custom-checkbox"></span>
            Respect current page?
          </label>
        </div>

        <div className="export-modal-row">
          <label className={`export-checkbox ${opts.includeCurrentAndArchived ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={opts.includeCurrentAndArchived}
              onChange={() => toggle("includeCurrentAndArchived")}
            />
            <span className="custom-checkbox"></span>
            Include current and archived forms?
          </label>
        </div>

        {/* Filters */}
        <div className="export-section-label">Filters:</div>
        <div className="export-modal-row">
          <label className={`export-checkbox ${opts.respectTemplates ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={opts.respectTemplates}
              onChange={() => toggle("respectTemplates")}
            />
            <span className="custom-checkbox"></span>
            Respect form templates filter?
          </label>

          <label
            className={`export-checkbox ${opts.respectPractitioner ? "checked" : ""}`}
            title="(Not used in CSV export yet)"
          >
            <input
              type="checkbox"
              checked={opts.respectPractitioner}
              onChange={() => toggle("respectPractitioner")}
            />
            <span className="custom-checkbox"></span>
            Respect practitioner filter?
          </label>
        </div>

        <div className="export-modal-row">
          <label className={`export-checkbox ${opts.respectDueDate ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={opts.respectDueDate}
              onChange={() => toggle("respectDueDate")}
            />
            <span className="custom-checkbox"></span>
            Respect due date filter?
          </label>

          <label className={`export-checkbox ${opts.respectStatus ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={opts.respectStatus}
              onChange={() => toggle("respectStatus")}
            />
            <span className="custom-checkbox"></span>
            Respect status filter?
          </label>
        </div>

        <div className="export-modal-row">
          <label
            className={`export-checkbox ${opts.respectGroups ? "checked" : ""}`}
            title="(Not used in CSV export yet)"
          >
            <input
              type="checkbox"
              checked={opts.respectGroups}
              onChange={() => toggle("respectGroups")}
            />
            <span className="custom-checkbox"></span>
            Respect selected form groups?
          </label>
        </div>

        {/* Answers */}
        <div className="export-section-label">Form Answers:</div>
        <div className="export-modal-row">
          <label
            className={`export-checkbox ${opts.includeAnswers ? "checked" : ""}`}
            title="Enable to get a ZIP with one CSV per template (fields as columns)."
          >
            <input
              type="checkbox"
              checked={opts.includeAnswers}
              onChange={handleToggleIncludeAnswers}
            />
            <span className="custom-checkbox"></span>
            Include form answers.
          </label>

          <label
            className={`export-checkbox ${
              opts.includeAnswers ? (opts.includeAnswerMeta ? "checked" : "") : "disabled"
            }`}
            title={opts.includeAnswers ? "(Optional meta columns, if supported)" : "Enable 'Include form answers' first"}
          >
            <input
              type="checkbox"
              disabled={!opts.includeAnswers}
              checked={opts.includeAnswers && opts.includeAnswerMeta}
              onChange={() => toggle("includeAnswerMeta")}
            />
            <span className="custom-checkbox"></span>
            Include metadata about form answers.
          </label>
        </div>

        {/* Structure */}
        <div className="export-section-label">CSV Structure:</div>
        <div className="export-modal-row">
          <label
            className={`export-checkbox ${opts.groupPerTemplate ? "checked" : ""}`}
            title="When answers are included, keep one file per template (ZIP)."
          >
            <input
              type="checkbox"
              checked={opts.groupPerTemplate}
              onChange={() => toggle("groupPerTemplate")}
            />
            <span className="custom-checkbox"></span>
            Group each form template into a single CSV?
          </label>
        </div>

        {/* Error */}
        {error && <div className="export-modal-error">{error}</div>}

        {/* Footer */}
        <div className="export-modal-footer">
          <button className="export-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="export-modal-submit"
            onClick={handleCreateCsv}
            disabled={isDownloading}
          >
            {isDownloading ? "Creating..." : "Create CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportCsvModal;
