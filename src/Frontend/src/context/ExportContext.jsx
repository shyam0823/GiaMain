import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";
import { startExport as apiStart, pollExport as apiPoll } from "../api/exportApi";

const ExportContext = createContext(null);
export const useExport = () => useContext(ExportContext);

export const ExportProvider = ({ children }) => {
  const [queue, setQueue] = useState([]); // [{ exportId, label }]
  const [ready, setReady] = useState([]); // [{ url, exportId, label }]
  const pollers = useRef({}); // exportId -> cancel fn

  const startExport = useCallback(async ({ patientId, view, label }) => {
    const exportId = await apiStart(patientId, view);  // POST /api/exports
    setQueue(prev => [...prev, { exportId, label }]);

    // begin polling for this job
    if (!pollers.current[exportId]) {
      pollers.current[exportId] = apiPoll(exportId, {
        onReady: (url) => {
          setReady(prev => [{ url, exportId, label }, ...prev]);
          delete pollers.current[exportId];
        },
        onError: () => {
          delete pollers.current[exportId];
          alert("Export failed");
        },
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pollers.current).forEach(cancel => cancel?.());
      pollers.current = {};
    };
  }, []);

  const downloadLatest = useCallback(() => {
    if (!ready.length) return;
    const { url } = ready[0];
    window.open(url, "_blank"); // GET /api/exports/<id>/file
    setReady(prev => prev.slice(1));
  }, [ready]);

  return (
    <ExportContext.Provider
      value={{
        startExport,
        hasReady: ready.length > 0,
        readyList: ready,
        downloadLatest,
      }}
    >
      {children}
    </ExportContext.Provider>
  );
};
