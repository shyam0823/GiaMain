import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadSavedTheme } from "../theme";

// dashboard modals
import ExportCsvModal from "./dashboard/ExportCsvModal";
import AssignFormsModal from "./dashboard/AssignFormsModal";

//API
import {
  fetchLobbyDashboard,
  assignFormsToPatient,
  fetchForms,
  archivePatients,
  unarchivePatients,
} from "../api/lobbieDashboardApi";

//components
import FormsHeader from "./components/FormsHeader";
import FormsTabs from "./components/FormsTabs";
import FormsFilters from "./components/FormsFilters";
import FormsTable from "./components/FormsTable";
import ThemedSelect from "./components/ThemedSelect"; // themed dropdown (react-select)

// context
import { useSearch } from "../context/SearchContext"; //  global search
import { useExport } from "../context/ExportContext"; //  added export context

// styles
import "./LobbieDashboard.css";

// modal for print style (Staff / Patient)
import PrintViewModal from "./components/PrintViewModal"; // added

const LobbieDashboard = () => {
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const { startExport } = useExport(); // added

  // -------------------- State --------------------
  const [selectedTab, setSelectedTab] = useState("Current");
  const [patientFilter, setPatientFilter] = useState(searchQuery || "");
  const [formTemplateFilter, setFormTemplateFilter] = useState("All");
  const [practitionerFilter, setPractitionerFilter] = useState("All Practitioners");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dueFilter, setDueFilter] = useState("All");

  const [isCsvModalOpen, setCsvModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formsData, setFormsData] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [expandedPatients, setExpandedPatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);

  //  Pagination controls
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5); // default 5 like screenshot

  //  Print modal state
  const [printOpen, setPrintOpen] = useState(false);            //  added
  const [printTarget, setPrintTarget] = useState(null);         //  added

  // Page-size options for ThemedSelect (kept for clarity, not used directly below)
  const pageSizeOptions = [5, 10, 20, 50, 100, 200].map((n) => ({ value: n, label: String(n) }));

  // -------------------- Sync global search --------------------
  useEffect(() => {
    setPatientFilter(searchQuery || "");
  }, [searchQuery]);

  // -------------------- Helpers --------------------
  const openCsvModal = () => setCsvModalOpen(true);
  const closeCsvModal = () => setCsvModalOpen(false);

  const handleSendForms = () => navigate("send-forms");

  const normalizeCompletion = (val) =>
    typeof val !== "number" || isNaN(val)
      ? 0
      : Math.min(Math.max(val, 0), 100);

  const normalizeRow = (r = {}) => ({
    patientId: r.patientId ?? r.patient_id ?? null,
    patient: r.patient ?? r.patientName ?? r.patient_name ?? null,
    formId: r.formId ?? r.form_id ?? r.id ?? null,
    form: r.form ?? r.formName ?? r.form_name ?? r.title ?? null,
    status:
      r.status ??
      r.form_status ??
      r.patient_status ??
      r.patientStatus ??
      (r.patient && r.patient.status) ??
      "Active",
    dueDate: r.dueDate ?? r.due_date ?? null,
    emailSent: r.emailSent ?? r.email_sent ?? null,
    smsSent: r.smsSent ?? r.sms_sent ?? null,
    created: r.created ?? r.form_created ?? r.created_at ?? null,
    location: r.location ?? null,
    completion: normalizeCompletion(r.completion),
  });

  const toTime = (d) => {
    if (!d) return 0;
    const dt = typeof d === "string" ? new Date(d) : new Date(String(d));
    const t = dt.getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const recencyScore = (f) =>
    Math.max(toTime(f.emailSent), toTime(f.smsSent), toTime(f.dueDate), toTime(f.created));

  // -------------------- Refresh Data --------------------
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const resp = await fetchLobbyDashboard();
      let data = Array.isArray(resp) ? resp : [];

      if (data.length && data[0].forms && Array.isArray(data[0].forms)) {
        const flat = [];
        for (const p of data) {
          const pid = p.patientId ?? p.patient_id ?? null;
          const pname = p.patient ?? p.patientName ?? p.patient_name ?? p.patient;
          const patientLevelStatus = p.status ?? p.patient_status ?? p.patientStatus ?? "Active";

          if (Array.isArray(p.forms) && p.forms.length) {
            for (const f of p.forms) {
              flat.push(
                normalizeRow({
                  patientId: pid,
                  patient: pname,
                  formId: f.formId ?? f.form_id ?? f.id,
                  form: f.form ?? f.formName ?? f.form_name ?? f.title,
                  status: f.status ?? patientLevelStatus,
                  dueDate: f.dueDate ?? f.due_date ?? null,
                  emailSent: f.emailSent ?? f.email_sent ?? null,
                  smsSent: f.smsSent ?? f.sms_sent ?? null,
                  created: f.created ?? null,
                  location: f.location ?? null,
                  completion: normalizeCompletion(f.completion),
                })
              );
            }
          } else {
            flat.push(
              normalizeRow({
                patientId: pid,
                patient: pname,
                status: patientLevelStatus,
                created: p.createdOn ?? p.created_on ?? null,
                location: p.location ?? null,
              })
            );
          }
        }
        setFormsData(flat);
      } else {
        setFormsData(data.map((r) => normalizeRow(r)));
      }
    } catch (err) {
      console.error("fetchLobbyDashboard failed", err);
      setFormsData([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // -------------------- Reset Filters --------------------
  const resetFilters = () => {
    setPatientFilter("");
    setFormTemplateFilter("All");
    setPractitionerFilter("All Practitioners");
    setStatusFilter("All");
    setDueFilter("All");
    setSelectedTab("Current");
  };

  // -------------------- Assign, Archive, Unarchive --------------------
  const handleAssignForms = async (patientId, formIds) => {
    try {
      await assignFormsToPatient(patientId, formIds, {
        status: "Active",
        dueDate: new Date().toISOString().split("T")[0],
        location: "GIA HR",
      });
      alert("Forms assigned successfully!");
      setAssignModalOpen(false);
      handleRefresh();
    } catch (err) {
      console.error("Assign forms failed", err);
      alert("Failed to assign forms.");
    }
  };

  const handleArchiveSelected = async () => {
    if (!selectedPatients.length) return alert("No patients selected");
    try {
      await archivePatients(selectedPatients);
      alert("Patients archived");
      setFormsData((prev) =>
        prev.map((p) =>
          selectedPatients.includes(p.patientId)
            ? { ...p, status: "Archived" }
            : p
        )
      );
      setSelectedPatients([]);
    } catch (err) {
      console.error("Archive failed", err);
      alert("Failed to archive patients");
    }
  };

  const handleUnarchiveSelected = async () => {
    if (!selectedPatients.length) return alert("No patients selected");
    try {
      await unarchivePatients(selectedPatients);
      alert("Patients unarchived");
      setFormsData((prev) =>
        prev.map((p) =>
          selectedPatients.includes(p.patientId)
            ? { ...p, status: "Active" }
            : p
        )
      );
      setSelectedPatients([]);
    } catch (err) {
      console.error("Unarchive failed", err);
      alert("Failed to unarchive patients");
    }
  };

  // -------------------- Lifecycle --------------------
  useEffect(() => {
    handleRefresh();
    (async () => {
      try {
        const resp = await fetchForms();
        const normalized = (resp || []).map((f) => ({
          id: f.id,
          title: f.title || "Untitled Form",
        }));
        setAllForms(normalized);
      } catch (err) {
        console.error("fetchForms failed", err);
      }
    })();

    const onFocus = () => handleRefresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [handleRefresh]);

  useEffect(() => {
    if (location.state?.fromDashboard) {
      handleRefresh();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, handleRefresh, navigate]);

  // -------------------- Helpers --------------------
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const toggleExpand = (pid) => {
    setExpandedPatients((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const togglePatientSelection = (pid) => {
    setSelectedPatients((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const groupPatients = (list) =>
    list.reduce((acc, form) => {
      if (!form.patientId) return acc;
      if (!acc[form.patientId]) {
        acc[form.patientId] = {
          patientId: form.patientId,
          patient: form.patient,
          status: form.status ?? null,
          forms: [],
        };
      }
      acc[form.patientId].forms.push(form);
      return acc;
    }, {});

  const applyFilters = (list) => {
    const grouped = groupPatients(list);
    const groupedArray = Object.values(grouped);
    for (const p of groupedArray) {
      p.forms.sort((a, b) => recencyScore(b) - recencyScore(a));
    }

    return groupedArray.filter((patient) => {
      const patientName = patient?.patient || "";
      const matchesPatient =
        !patientFilter ||
        patientName.toLowerCase().includes(patientFilter.toLowerCase());
      const matchesTemplate =
        formTemplateFilter === "All" ||
        patient.forms.some((f) =>
          (f.form || "").toLowerCase().includes(formTemplateFilter.toLowerCase())
        );
      const matchesPractitioner =
        practitionerFilter === "All Practitioners" ||
        patient.forms.some((f) => f.location === practitionerFilter);
      const matchesStatus =
        statusFilter === "All" ||
        patient.forms.some((f) =>
          (f.status || "").toLowerCase().includes(statusFilter.toLowerCase())
        );

      return (
        matchesPatient &&
        matchesTemplate &&
        matchesPractitioner &&
        matchesStatus
      );
    });
  };

  const getTabData = () => {
    let filtered =
      selectedTab === "Archived"
        ? formsData.filter((f) => f.status === "Archived")
        : selectedTab === "Inactive"
        ? formsData.filter((f) => f.status === "Inactive")
        : formsData.filter((f) => f.status === "Active");

    return applyFilters(filtered);
  };

  // Pagination logic
  const filteredData = getTabData();
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // react-select change for page size
  const handleRowsChangeSelect = (opt) => {
    const val = Number(opt?.value ?? rowsPerPage);
    setRowsPerPage(val);
    setCurrentPage(1);
  };

  // open print modal from table
  const onOpenPrint = ({ patientId, patientName }) => {
    setPrintTarget({ patientId, patientName });
    setPrintOpen(true);
  };

  // handle print choice (staff | patient)
  const handlePrintChoice = async (view) => {
    setPrintOpen(false);
    if (!printTarget) return;
    try {
      await startExport({
        patientId: printTarget.patientId,
        view, // 'staff' | 'patient'
        label: `Forms for ${printTarget.patientName}`,
      });
      alert("Preparing forms… Check the File download button at the top when it lights up.");
    } catch (e) {
      alert("Failed to start export.");
    }
  };

  // -------------------- Render --------------------
  return (
    <div className="lobbie-dashboard">
      <FormsHeader
        onGenerateCsv={openCsvModal}
        onSendForms={handleSendForms}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onResetFilters={resetFilters}
      />

      {isCsvModalOpen && <ExportCsvModal onClose={closeCsvModal} />}

      <FormsTabs
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        onArchive={handleArchiveSelected}
        onUnarchive={handleUnarchiveSelected}
      />

      <FormsFilters
        patientFilter={patientFilter}
        setPatientFilter={setPatientFilter}
        formTemplateFilter={formTemplateFilter}
        setFormTemplateFilter={setFormTemplateFilter}
        practitionerFilter={practitionerFilter}
        setPractitionerFilter={setPractitionerFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dueFilter={dueFilter}
        setDueFilter={setDueFilter}
        allForms={allForms}
      />

      {/* Table */}
      <FormsTable
        filteredData={currentData}
        selectedPatients={selectedPatients}
        expandedPatients={expandedPatients}
        toggleExpand={toggleExpand}
        togglePatientSelection={togglePatientSelection}
        navigate={navigate}
        setSelectedPatient={setSelectedPatient}
        setAssignModalOpen={setAssignModalOpen}
        formatDate={formatDate}
        onOpenPrint={onOpenPrint}
      />

      {/* Footer bar with ThemedSelect (NO native <select>) */}
      <div className="footer-bar">
        {/* left: total count */}
        <div className="count-badge">
          {filteredData.length} forms
        </div>

        {/* middle: "Show" dropdown + numbered pager */}
        <div className="pager-wrap">
          <div className="show-wrap" style={{ paddingRight: 10 }}>
            <span className="show-label">Show:</span>

            {/* Themed React-Select replacing native <select> */}
            <div style={{ width: 120 }}>
              <ThemedSelect
                size="sm"
                menuPlacement="top"
                value={{ value: rowsPerPage, label: String(rowsPerPage) }}
                onChange={(opt) => {
                  if (opt?.value) {
                    setRowsPerPage(opt.value);
                    setCurrentPage(1);
                  }
                }}
                options={[5, 10, 20, 50, 100, 200].map((n) => ({
                  value: n,
                  label: String(n),
                }))}
              />
            </div>
          </div>

          <div className="pager">
            <button
              className="pager-btn ghost"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              &lt;
            </button>

            {(() => {
              const items = [];
              const max = 7;
              const add = (key, content, active=false, disabled=false) =>
                items.push(
                  <button
                    key={key}
                    className={`pager-btn ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                    disabled={disabled}
                    onClick={() => !disabled && !active && setCurrentPage(Number(content))}
                  >
                    {content}
                  </button>
                );

              if (totalPages <= max) {
                for (let i = 1; i <= totalPages; i++) add(i, i, i === currentPage);
              } else {
                const first = 1;
                const last = totalPages;
                const nearStart = [1, 2, 3];
                const middle = [currentPage - 1, currentPage, currentPage + 1].filter(
                  (p) => p > 1 && p < last
                );

                add("p1", first, currentPage === first);
                if (!nearStart.includes(currentPage) && currentPage > 4) add("gap1", "…", false, true);

                const cluster = currentPage <= 4 ? [2,3,4,5]
                              : currentPage >= last - 3 ? [last-4,last-3,last-2,last-1]
                              : middle;

                [...new Set(cluster.filter(p => p>1 && p<last))].forEach((p) =>
                  add(`p${p}`, p, currentPage === p)
                );

                if (currentPage < last - 3) add("gap2", "…", false, true);
                add("plast", last, currentPage === last);
              }

              return items;
            })()}

            <button
              className="pager-btn ghost"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              aria-label="Next page"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* right: arrow */}
        <button
          className="go-arrow"
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          aria-label="Go next"
          title="Next page"
        >
          ➜
        </button>
      </div>

      {/* Print style modal */}
      <PrintViewModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        onChoose={handlePrintChoice}
      />

      {isAssignModalOpen && (
        <AssignFormsModal
          patient={selectedPatient}
          forms={allForms}
          onClose={() => setAssignModalOpen(false)}
          onAssign={handleAssignForms}
        />
      )}
    </div>
  );
};

export default LobbieDashboard;
