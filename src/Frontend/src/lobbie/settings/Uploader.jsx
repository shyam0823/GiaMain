import React, { useMemo, useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import "./uploader.css";

export default function Uploader() {
  const [sheetLinks, setSheetLinks] = useState("");
  const [datasets, setDatasets] = useState([]); // [{id,name,rows,uploadedAt,isSaved,source,original}]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  console.log("Uploader build tag: 2025-10-30-14:40");

  // bulk “select all”
  const [allSelected, setAllSelected] = useState(false);

  // header filters
  const [filterDate, setFilterDate] = useState("");   // YYYY-MM-DD
  const [sortOrder, setSortOrder]   = useState("desc");

  // inline edit
  const [editingId, setEditingId] = useState(null);
  const [editedRows, setEditedRows] = useState([]);

  // simple toast
  const [toast, setToast] = useState(null);
  function showToast(msg, type="ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  }

  // ---------- helpers ----------
  function extractExportCsvUrl(url) {
    try {
      const u = new URL(url.trim());
      if (u.pathname.includes("/export") && u.searchParams.get("format") === "csv") return u.toString();
      const hasGid = u.searchParams.get("gid");
      const base = `https://docs.google.com/spreadsheets/d/${u.pathname.split("/")[3]}/export?format=csv`;
      return hasGid ? `${base}&gid=${hasGid}` : base;
    } catch { return null; }
  }

  // RFC4122-compliant UUID v4 (works with SQL Server UNIQUEIDENTIFIER)
  function uuidv4() {
    try {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    } catch {
      // fallback (looks like a GUID; good enough if crypto is unavailable)
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
        const r = Math.random()*16|0, v = ch === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    }
  }

  // simple GUID check (lower/upper accepted)
  function isGuid(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));
  }

  const getDatasetById = (id) => datasets.find(d => d.id === id) || null;

  // ---------- backend I/O ----------
  async function loadExisting() {
    try {
      const res = await fetch(`/api/uploads?sort=desc`);
      if (!res.ok) throw new Error(await res.text());
      const arr = await res.json();
      // map API shape -> UI shape
      const mapped = (arr || []).map(x => ({
        id: x.UploadId,
        name: x.Name,
        source: x.Source,
        original: x.Original,
        uploadedAt: x.UploadedAt,
        rows: Array.isArray(x.DataJson) ? x.DataJson : [],
        isSaved: !!x.IsSaved
      }));
      setDatasets(mapped);
    } catch (e) {
      console.error(e);
      setError(String(e.message || e));
    }
  }

  // Save: POST for brand-new, PUT for existing GUIDs or when forced (edits)
  async function saveToDb(dataset, { forcePut = false } = {}) {
    const isUpdate = forcePut || isGuid(dataset.id) || dataset.isSaved === true;
    const method   = isUpdate ? "PUT" : "POST";
    const url      = isUpdate ? `/api/uploads/${encodeURIComponent(dataset.id)}` : `/api/uploads`;

    const payload = {
      id: dataset.id,
      name: dataset.name,
      source: dataset.source,
      original: dataset.original,
      uploadedAt: dataset.uploadedAt,
      rowCount: Array.isArray(dataset.rows) ? dataset.rows.length : 0,
      data: dataset.rows
    };

    console.log(`[Uploader] ${method} ${url}`, payload);

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[Uploader] ${method} failed:`, txt);
      throw new Error(txt || `${method} /api/uploads failed`);
    }

    const json = await res.json().catch(() => ({}));
    console.log(`[Uploader] ${method} ok:`, json);

    // mark as saved locally
    setDatasets(prev =>
      prev.map(d => d.id === dataset.id ? { ...d, isSaved: true } : d)
    );
  }

  async function deleteOnServer(ids) {
    const qs = encodeURIComponent(ids.join(","));
    const res = await fetch(`/api/uploads?ids=${qs}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
  }

  // ---------- pre-load from DB on first mount ----------
  useEffect(() => { loadExisting(); }, []);

  // ---------- parse/load ----------
  const parseCsvFromUrl = (name, csvUrl) =>
    new Promise((resolve, reject) => {
      Papa.parse(csvUrl, {
        download: true, header: true, dynamicTyping: true, skipEmptyLines: "greedy",
        complete: (r) => r?.data ? resolve(r.data) : reject(new Error("No data returned from CSV")),
        error: reject
      });
    });

  async function handleFetchSheets() {
    setBusy(true); setError("");
    try {
      const links = sheetLinks.split(/\n|\s+/).map(s => s.trim()).filter(Boolean);
      const created = [];
      for (let i = 0; i < links.length; i++) {
        const csvUrl = extractExportCsvUrl(links[i]);
        if (!csvUrl) throw new Error(`Invalid URL: ${links[i]}`);
        const rows = await parseCsvFromUrl(`Sheet ${i + 1}`, csvUrl);
        created.push({
          id: uuidv4(),
          name: `Sheet ${i + 1}`,
          rows,
          uploadedAt: new Date().toISOString(),
          isSaved: false,                 // brand-new => POST
          source: "google-sheet",
          original: csvUrl
        });
      }
      // add to UI first (optimistic)
      setDatasets(prev => [...created, ...prev]);
      // persist each (POST)
      await Promise.allSettled(created.map(ds => saveToDb(ds, { forcePut: false })));
      showToast("Saved successfully", "ok");
      await loadExisting(); // ensure local matches DB
    } catch (e) {
      setError(e.message || String(e));
    } finally { setBusy(false); }
  }

  function handleCsvFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setError("");

    const created = [];

    const onDone = async () => {
      // push to UI
      setDatasets(prev => [...created, ...prev]);
      // persist to DB (POST)
      try {
        await Promise.allSettled(created.map(ds => saveToDb(ds, { forcePut: false })));
        showToast("Saved successfully", "ok");
        await loadExisting();
      } catch (e) {
        setError(e.message || String(e));
      } finally { setBusy(false); }
    };

    let finished = 0;
    files.forEach(file => {
      Papa.parse(file, {
        header: true, dynamicTyping: true, skipEmptyLines: "greedy",
        complete: (res) => {
          created.push({
            id: uuidv4(),
            name: file.name,
            rows: res.data,
            uploadedAt: new Date().toISOString(),
            isSaved: false,               // brand-new => POST
            source: "csv",
            original: file.name
          });
          finished++; if (finished === files.length) onDone();
        },
        error: (err) => {
          setError(`Failed to parse ${file.name}: ${err?.message || err}`);
          finished++; if (finished === files.length) onDone();
        }
      });
    });
  }

  // ---------- filter + sort ----------
  const filteredDatasets = useMemo(() => {
    if (!filterDate) return datasets;
    const d0 = new Date(filterDate + "T00:00:00");
    const d1 = new Date(filterDate + "T23:59:59.999");
    return datasets.filter(d => {
      const t = new Date(d.uploadedAt);
      return t >= d0 && t <= d1;
    });
  }, [datasets, filterDate]);

  const sortedDatasets = useMemo(() => {
    const arr = [...filteredDatasets];
    arr.sort((a,b) => {
      const ta = new Date(a.uploadedAt).getTime();
      const tb = new Date(b.uploadedAt).getTime();
      return sortOrder === "desc" ? tb - ta : ta - tb;
    });
    return arr;
  }, [filteredDatasets, sortOrder]);

  // ---------- deletions ----------
  async function deleteLocalById(id) {
    // optimistic UI
    setDatasets(prev => prev.filter(d => d.id !== id));
    try {
      await deleteOnServer([id]);
      showToast("Deleted successfully", "ok");
    } catch (e) {
      setError(String(e.message || e));
      // reload from server to recover
      loadExisting();
    }
    if (editingId === id) { setEditingId(null); setEditedRows([]); }
  }

  async function deleteAllSelected() {
    if (!allSelected || datasets.length === 0) return;
    const ids = datasets.map(d => d.id);
    // optimistic UI
    setDatasets([]);
    setAllSelected(false);
    setEditingId(null);
    setEditedRows([]);
    try {
      await deleteOnServer(ids);
      showToast("Deleted successfully", "ok");
    } catch (e) {
      setError(String(e.message || e));
      loadExisting();
    }
  }

  // ---------- edit flow ----------
  function startEditingFor(id) {
    const ds = getDatasetById(id); if (!ds) return;
    setEditingId(id);
    setEditedRows(JSON.parse(JSON.stringify(ds.rows || [])));
    console.log("Entered edit mode for:", id);
  }
  function cancelEditing() { setEditingId(null); setEditedRows([]); }

  // (kept for completeness; not relied on anymore)
  function applyEditedRowsTo(id) {
    let updated = null;
    setDatasets(prev => prev.map(d => {
      if (d.id === id) { updated = { ...d, rows: editedRows, isSaved: d.isSaved }; return updated; }
      return d;
    }));
    return updated;
  }

  async function saveAndPersist(id) {
    console.log("saveAndPersist fired for:", id); // function-level proof
    if (editingId !== id) {
      showToast("Not in edit mode for this dataset", "err");
      console.warn("Save clicked but editingId !== id", { editingId, id });
      return;
    }

    // NEW: build updated from current state directly (no reliance on setState timing)
    const base = getDatasetById(id);
    if (!base) {
      console.warn("Dataset not found in state for id:", id, { datasets });
      showToast("Dataset not found", "err");
      return;
    }
    const updated = { ...base, rows: editedRows };
    console.log("About to call saveToDb with:", { id: updated.id, rowCount: updated.rows?.length });

    try {
      await saveToDb(updated, { forcePut: true }); // force PUT so you see it server-side
      showToast("Saved successfully", "ok");
      await loadExisting();
    } catch (e) {
      console.error("Save failed:", e);
      setError("Save failed: " + (e.message || e));
      showToast("Save failed", "err");
    } finally {
      setEditingId(null); setEditedRows([]);
    }
  }

  const showBulkBar = sortedDatasets.length >= 2;

  // global click debug (to catch overlay issues)
  useEffect(() => {
    const capture = (e) => {
      const target = e.target.closest?.(".edit-cta--save");
      if (target) console.log("Document CAPTURE sees Save click");
    };
    const bubble = (e) => {
      const target = e.target.closest?.(".edit-cta--save");
      if (target) console.log("Document BUBBLE sees Save click");
    };
    document.addEventListener("click", capture, true);
    document.addEventListener("click", bubble, false);
    return () => {
      document.removeEventListener("click", capture, true);
      document.removeEventListener("click", bubble, false);
    };
  }, []);

  return (
    <div className="uploader-page">
      <div className="uploader-container" onKeyDown={(e) => {
        if (e.key === "Enter" && editingId) {
          console.log("Enter pressed -> save");
          e.preventDefault();
          saveAndPersist(editingId);
        }
      }}>

        {/* Tiny toast */}
        {toast && (
          <div
            style={{
              position: "fixed", top: 16, right: 16, zIndex: 1000,
              background: toast.type === "ok" ? "#16a34a" : "#ef4444",
              color: "#fff", padding: "10px 12px", borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,.15)"
            }}
          >
            {toast.msg}
          </div>
        )}

        <header className="uploader-header">
          <h1>Google Sheets + Multi-CSV Uploader</h1>

          {/* Right-side header tools: calendar + sort toggle */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <label title="Filter by date" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden>📅</span>
              <input
                type="date"
                className="date-input"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </label>

            <div className="sort-wrap">
              <span className="sort-label">
                <svg
                  className={`sort-arrows ${sortOrder === "desc" ? "desc" : "asc"}`}
                  width="18" height="18" viewBox="0 0 24 24" aria-hidden
                >
                  <path className="up" d="M12 5l-4 4h8l-4-4z" />
                  <path className="down" d="M12 19l4-4H8l4 4z" />
                </svg>
                <span>Sort</span>
              </span>

              <button
                type="button"
                className="sort-pill"
                onClick={() => setSortOrder(p => (p === "desc" ? "asc" : "desc"))}
                aria-label="Toggle sort order"
              >
                {sortOrder === "desc" ? "Newest first" : "Oldest first"}
              </button>
            </div>
          </div>
        </header>

        <section className="uploader-card">
          <div className="uploader-inputs">
            <div className="uploader-field">
              <label>Paste Google Sheets links (one per line)</label>
              <textarea
                value={sheetLinks}
                onChange={(e) => setSheetLinks(e.target.value)}
                placeholder="Paste your sheet URLs here..."
              />
              <button onClick={handleFetchSheets} disabled={busy} className="btn-primary">
                {busy ? "Loading…" : "Fetch Sheets"}
              </button>
            </div>
            <div className="uploader-field">
              <label>Upload CSV files (multiple)</label>
              <input type="file" multiple accept=".csv" onChange={handleCsvFiles} />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
        </section>

        {/* Bulk toolbar */}
        {showBulkBar && (
          <section className="uploader-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => setAllSelected(e.target.checked)}
              />
              <strong>Select all</strong>
            </label>

            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <button className="btn" style={{ minHeight: 44, minWidth: 140, fontWeight: 600 }}
                onClick={() => setAllSelected(false)}>
                Cancel
              </button>
              <button className="btn-danger" style={{ minHeight: 44, minWidth: 140, fontWeight: 600 }}
                disabled={!allSelected} onClick={deleteAllSelected}>
                Delete all
              </button>
            </div>
          </section>
        )}

        {/* One card per dataset */}
        {sortedDatasets.length ? (
          sortedDatasets.map((ds) => {
            const isEditing = editingId === ds.id;
            return (
              <section key={ds.id} className="uploader-card dataset-wrapper">
                <div className="ds-head" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <strong style={{ fontSize: 16 }}>{ds.name}</strong>
                  <span className="muted" style={{ fontStyle: "italic", marginLeft: 8 }}>
                    {isEditing ? "— editing…" : ""}
                  </span>
                  <div className="ds-meta" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="muted">Uploaded: {new Date(ds.uploadedAt).toLocaleString()}</span>
                    <InlineKebab onEdit={() => startEditingFor(ds.id)} onDeleteThis={() => deleteLocalById(ds.id)} />
                  </div>
                </div>

                <div className="table-scroll" style={{ marginTop: 10 }}>
                  <EditableTable
                    data={isEditing ? editedRows : ds.rows}
                    editing={isEditing}
                    onChangeCell={(rIdx, key, val) => {
                      setEditedRows(prev => {
                        const next = [...prev];
                        next[rIdx] = { ...next[rIdx], [key]: val };
                        return next;
                      });
                    }}
                  />
                </div>

                {isEditing && (
                  <div
                    className="edit-footer"
                    style={{
                      position: "relative",
                      zIndex: 50,
                      pointerEvents: "auto",
                      display: "flex",
                      gap: 8,
                      marginTop: 12
                    }}
                  >
                    <button
                      type="button"
                      className="edit-cta edit-cta--cancel"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="edit-cta edit-cta--save"
                      tabIndex={0}
                      onMouseDown={() => console.log("🖱️ onMouseDown Save")}
                      onPointerUp={() => console.log("🖱️ onPointerUp Save")}
                      onClick={(e) => {
                        console.log("Save button clicked (UI), id:", ds.id);
                        e.stopPropagation();
                        saveAndPersist(ds.id);
                      }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </section>
            );
          })
        ) : (
          <section className="uploader-card"><span className="no-data">No uploads yet.</span></section>
        )}
      </div>
    </div>
  );
}

/* ---------- Minimal inline kebab ---------- */
function InlineKebab({ onEdit, onDeleteThis }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span
        style={{ fontSize: 20, padding: 4, cursor: "pointer", userSelect: "none", display: "inline-block" }}
        title="More"
        onClick={() => setOpen(v => !v)}
      >⋮</span>

      {open && (
        <div className="kebab-pop" style={{
          position: "absolute", right: 0, top: 26, width: 200, zIndex: 40, padding: 12,
          borderRadius: 12, background: "var(--card, #fff)", boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          display: "grid", gap: 10
        }} onClick={(e) => e.stopPropagation()}>
          <button className="btn" onClick={() => { onEdit?.(); setOpen(false); }}>Edit cells</button>
          <button className="btn-danger" onClick={() => { onDeleteThis?.(); setOpen(false); }}>Delete dataset</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Editable table ---------- */
function EditableTable({ data, editing, onChangeCell }) {
  const columns = useMemo(() => {
    const set = new Set();
    data?.forEach(r => Object.keys(r).forEach(k => set.add(k)));
    return Array.from(set);
  }, [data]);

  if (!data?.length) return <p className="no-data">No data available.</p>;

  return (
    <table className="uploader-table">
      <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {data.map((row, rIdx) => (
          <tr key={rIdx}>
            {columns.map(c => (
              <td key={c}>
                {editing ? (
                  <input
                    value={row[c] ?? ""}
                    onChange={(e) => onChangeCell(rIdx, c, e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px" }}
                  />
                ) : (String(row[c] ?? ""))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
