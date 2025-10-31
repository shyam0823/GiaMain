import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./TemplateCreator.css"; // modal styling
 
/* --- Camera modal (inline component) --- */
function CameraModal({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
 
  useEffect(() => {
    async function start() {
      if (!open) return;
      setError("");
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" }, // rear camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(e.message || "Unable to access camera.");
      }
    }
    start();
 
    return () => {
      // stop camera when modal closes/unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open]);
 
  if (!open) return null;
 
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9
    );
  };
 
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="tc-overlay"
      style={{ zIndex: 9999 }}
    >
      <div className="tc-modal" style={{ maxWidth: 760 }}>
        <h3 className="tc-modal__title">Camera</h3>
        {error ? (
          <div className="tc-muted" style={{ marginBottom: 16 }}>
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              width: "100%",
              borderRadius: 12,
              background: "#000",
              maxHeight: 420,
              objectFit: "cover",
            }}
          />
        )}
 
        <div className="tc-actions" style={{ marginTop: 16 }}>
          <button className="tc-btn tc-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="tc-btn tc-btn--primary"
            onClick={handleCapture}
            disabled={!!error}
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
 
/* --- Main page --- */
function TemplateCreator({ onClose }) {
  const [templateName, setTemplateName] = useState("");
  const [fields, setFields] = useState([]);
  const [fieldInput, setFieldInput] = useState("");
  const [cameraOpenForIndex, setCameraOpenForIndex] = useState(null);
  const [capturedPreviews, setCapturedPreviews] = useState({}); // optional: show thumbnail
  const navigate = useNavigate();
 
  // Add new field dynamically
  const handleAddField = () => {
    if (!fieldInput.trim()) return;
    const type = getFieldType(fieldInput.toLowerCase());
    setFields((prev) => [...prev, { label: fieldInput, type }]);
    setFieldInput("");
  };
 
  // Map words to input types
  const getFieldType = (text) => {
    if (text.includes("photo") || text.includes("image")) return "file";
    if (text.includes("camera") || text.includes("camara")) return "camera";
    if (text.includes("date")) return "date";
    if (text.includes("email")) return "email";
    if (text.includes("number") || text.includes("age")) return "number";
    if (text.includes("signature")) return "signature";
    return "text";
  };
 
  // Save template to backend
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || fields.length === 0)
      return alert("Add template name and fields");
 
    try {
      const res = await axios.post("http://localhost:5000/api/home/forms", {
        name: templateName,
        fields,
      });
      alert(res.data.message);
      setTemplateName("");
      setFields([]);
      setCapturedPreviews({});
      if (onClose) onClose();
      // navigate("/dash/settings/forms");
    } catch (err) {
      console.error(err);
      alert("Error saving template");
    }
  };
 
  // Cancel handler -> navigate to Forms list
  const handleCancel = () => {
    setTemplateName("");
    setFieldInput("");
    setFields([]);
    setCapturedPreviews({});
    if (onClose) onClose();
    navigate("/dash/settings/forms"); // go to Forms page
  };
 
  return (
    <div className="tc-overlay">
      <div className="tc-modal" role="dialog" aria-modal="true" aria-labelledby="tc-title">
        <h2 id="tc-title" className="tc-modal__title">
          Create New Form Template
        </h2>
 
        <div className="tc-form">
          {/* Template name */}
          <div>
            <label className="tc-label">Template name</label>
            <input
              type="text"
              placeholder="Enter template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="tc-input"
            />
          </div>
 
          {/* Add field */}
          <div className="tc-grid-2">
            <div>
              <label className="tc-label">Add field</label>
              <input
                type="text"
                placeholder="Type field name (e.g., Name, Photo, Date of Birth)"
                value={fieldInput}
                onChange={(e) => setFieldInput(e.target.value)}
                className="tc-input"
              />
            </div>
            <div className="tc-row" style={{ alignSelf: "end" }}>
              <button
                className="tc-btn tc-btn--primary tc-btn--bar"
                onClick={handleAddField}
              >
                Add Field
              </button>
            </div>
          </div>
 
          {/* Preview */}
          <div>
            <label className="tc-label">Fields Preview</label>
            <div className="tc-preview">
              {fields.length === 0 && (
                <div className="tc-muted">No fields yet. Add some above.</div>
              )}
 
              {fields.map((f, i) => (
                <div
                  key={i}
                  className="tc-row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                    gap: 12,
                  }}
                >
                  <div className="tc-row" style={{ gap: 10 }}>
                    <strong style={{ textTransform: "lowercase" }}>{f.label}</strong>
 
                    {/* Render by type */}
                    {f.type === "signature" ? (
                      <span style={{ fontStyle: "italic" }}>(Signature)</span>
                    ) : f.type === "camera" ? (
                      <div className="tc-row" style={{ gap: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          className="tc-btn tc-btn--primary tc-btn--small"
                          onClick={() => setCameraOpenForIndex(i)}
                          aria-label="Open device camera"
                        >
                          Open Camera
                        </button>
 
                        {/* tiny preview if captured */}
                        {capturedPreviews[i] && (
                          <img
                            src={capturedPreviews[i]}
                            alt="Captured preview"
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              objectFit: "cover",
                              border: "1px solid rgba(0,0,0,0.1)",
                            }}
                          />
                        )}
                      </div>
                    ) : f.type === "file" ? (
                      <input
                        className="tc-input"
                        type="file"
                        accept="image/*"
                        style={{ width: 220, padding: 6 }}
                        aria-label="Choose file"
                      />
                    ) : (
                      <input
                        className="tc-input"
                        type={f.type}
                        disabled
                        placeholder={f.label}
                        style={{ width: 220 }}
                      />
                    )}
                  </div>
 
                  {/* smaller remove button */}
                  <button
                    className="tc-btn tc-btn--ghost tc-btn--small"
                    onClick={() => {
                      setFields(fields.filter((_, idx) => idx !== i));
                      setCapturedPreviews((p) => {
                        const n = { ...p };
                        delete n[i];
                        return n;
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
 
          {/* Actions */}
          <div className="tc-actions">
            <button className="tc-btn tc-btn--ghost" onClick={handleCancel}>
              Cancel
            </button>
            <button className="tc-btn tc-btn--primary" onClick={handleSaveTemplate}>
              Save Template
            </button>
          </div>
        </div>
      </div>
 
      {/* Camera modal */}
      <CameraModal
        open={cameraOpenForIndex !== null}
        onClose={() => setCameraOpenForIndex(null)}
        onCapture={(blob) => {
          // optional: show a preview; you can also upload/store this blob
          const url = URL.createObjectURL(blob);
          setCapturedPreviews((p) => ({ ...p, [cameraOpenForIndex]: url }));
          setCameraOpenForIndex(null);
        }}
      />
    </div>
  );
}
 
export default TemplateCreator;
 
 