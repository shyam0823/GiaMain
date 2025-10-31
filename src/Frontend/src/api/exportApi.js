export async function startExport(patientId, view /* "staff"|"patient" */) {
  const res = await fetch("/api/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId, view }),
  });
  if (!res.ok) throw new Error("Failed to start export");
  const { exportId } = await res.json();
  return exportId;
}

export function pollExport(exportId, { onReady, onError, intervalMs = 2500 } = {}) {
  const t = setInterval(async () => {
    try {
      const r = await fetch(`/api/exports/${exportId}`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      if (j.status === "ready" && j.url) {
        clearInterval(t);
        onReady?.(j.url);
      } else if (j.status === "error") {
        clearInterval(t);
        onError?.("Export failed");
      }
    } catch {
      clearInterval(t);
      onError?.("Failed to check export");
    }
  }, intervalMs);
  return () => clearInterval(t);
}
