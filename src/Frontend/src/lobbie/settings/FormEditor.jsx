import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { fetchFormDetails, updateForm } from "../../api/lobbieDashboardApi";
import "./FormEditor.css";

/* Load signature font dynamically */
const loadSignatureFont = () => {
  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};

/* ---------- Helpers ---------- */
const toYMD = (v) => {
  if (!v) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(v).slice(0, 10);
};

const asString = (val) => {
  if (val === null || typeof val === "undefined") return "";
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === "boolean") return val ? "true" : "false";
  return String(val);
};

const isMobile = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/* Normalize helpers */
const norm = (v) => (v == null ? "" : String(v)).trim().toLowerCase();

/* Photo vs Camera detection */
const isCameraField = (field) => {
  const t = norm(field.field_type);
  const l = norm(field.field_label);
  return t === "camera" || t.includes("camera") || l.includes("camera");
};
const isImageLikeFieldAny = (field) => {
  const t = norm(field.field_type);
  const l = norm(field.field_label);
  const directSet = new Set([
    "file",
    "photo",
    "image",
    "picture",
    "upload",
    "attachment",
    "file upload",
    "photo upload",
    "image upload",
    "photo id",
    "id photo",
    "id image",
  ]);
  if (directSet.has(t)) return true;
  if (t.includes("image") || t.includes("photo") || t.includes("upload")) return true;
  if (l.includes("photo") || l.includes("image") || l.includes("picture")) return true;
  return false;
};
const isPhotoField = (field) => isImageLikeFieldAny(field) && !isCameraField(field);

/* ---------- STRICT single-person validation stack ---------- */
/* Load TFJS / models when needed */
const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

const loadTf = async () => {
  if (window.tf?.ready) return window.tf;
  await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js");
  if (window.tf?.ready) await window.tf.ready();
  return window.tf;
};

const loadBlazeFace = async () => {
  if (window.__bfModel) return window.__bfModel;
  await loadTf();
  await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js");
  const model = await window.blazeface.load();
  window.__bfModel = model;
  return model;
};

const loadCocoSsd = async () => {
  if (window.__coco) return window.__coco;
  await loadTf();
  await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
  const model = await window.cocoSsd.load({ base: "lite_mobilenet_v2" });
  window.__coco = model;
  return model;
};

const fetchImageBitmap = async (dataUrl) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (window.createImageBitmap) return await createImageBitmap(blob);
  // Fallback to HTMLImageElement
  const img = new Image();
  img.src = dataUrl;
  await new Promise((r, j) => { img.onload = r; img.onerror = j; });
  return img;
};

/* FaceDetector multi-pass (scaled & mirrored) */
const detectWithFaceDetector = async (imageBitmap) => {
  const passes = [
    { scale: 1, mirror: false },
    { scale: 0.75, mirror: false },
    { scale: 0.5, mirror: false },
    { scale: 0.75, mirror: true },
    { scale: 0.5, mirror: true },
  ];

  const runPass = async ({ scale, mirror }) => {
    const srcW = imageBitmap.width || imageBitmap.naturalWidth;
    const srcH = imageBitmap.height || imageBitmap.naturalHeight;
    const w = Math.max(64, Math.round(srcW * scale));
    const h = Math.max(64, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(imageBitmap, 0, 0, w, h);
    const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 8 });
    const faces = await fd.detect(canvas);
    return faces.map((f) => {
      const x = mirror ? w - (f.boundingBox.x + f.boundingBox.width) : f.boundingBox.x;
      return {
        x: (x / w) * srcW,
        y: (f.boundingBox.y / h) * srcH,
        width: (f.boundingBox.width / w) * srcW,
        height: (f.boundingBox.height / h) * srcH,
      };
    });
  };

  const all = [];
  for (const p of passes) {
    try { all.push(...await runPass(p)); } catch (_) {}
  }

  // merge overlaps (IoU)
  const merged = [];
  const iou = (a, b) => {
    const ax2 = a.x + a.width, ay2 = a.y + a.height;
    const bx2 = b.x + b.width, by2 = b.y + b.height;
    const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
    const ih = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
    const inter = iw * ih;
    const u = a.width * a.height + b.width * b.height - inter;
    return u ? inter / u : 0;
  };
  for (const f of all) {
    let placed = false;
    for (const m of merged) {
      if (iou(f, m) > 0.3) {
        const nx = Math.min(m.x, f.x);
        const ny = Math.min(m.y, f.y);
        const nx2 = Math.max(m.x + m.width, f.x + f.width);
        const ny2 = Math.max(m.y + m.height, f.y + f.height);
        m.x = nx; m.y = ny; m.width = nx2 - nx; m.height = ny2 - ny;
        placed = true; break;
      }
    }
    if (!placed) merged.push({ ...f });
  }
  const srcW = imageBitmap.width || imageBitmap.naturalWidth;
  const srcH = imageBitmap.height || imageBitmap.naturalHeight;
  const minArea = Math.max(2000, (srcW * srcH) * 0.002);
  return merged.filter((b) => b.width * b.height >= minArea);
};

const detectBlazeFaces = async (dataUrl) => {
  const model = await loadBlazeFace();
  const img = new Image();
  img.src = dataUrl;
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const preds = await model.estimateFaces(img, false);
  const minArea = Math.max(2000, (img.naturalWidth * img.naturalHeight) * 0.002);
  return (preds || []).map(p => {
    const [x1, y1] = p.topLeft, [x2, y2] = p.bottomRight;
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }).filter(b => b.width * b.height >= minArea);
};

const detectPersonsCoco = async (dataUrl) => {
  const model = await loadCocoSsd();
  const img = new Image();
  img.src = dataUrl;
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const preds = await model.detect(img);
  return (preds || []).filter(p => p.class === "person" && p.score >= 0.5);
};

/* STRICT validator: accept only when exactly ONE face/person found */
const validateSingleFace = async (dataUrl) => {
  try {
    let counts = [];

    if ("FaceDetector" in window) {
      const bmp = await fetchImageBitmap(dataUrl);
      const facesFD = await detectWithFaceDetector(bmp);
      counts.push(facesFD.length);
    }

    try {
      const facesBF = await detectBlazeFaces(dataUrl);
      counts.push(facesBF.length);
    } catch (e) {
      console.debug("BlazeFace failed:", e);
    }

    try {
      const persons = await detectPersonsCoco(dataUrl);
      counts.push(persons.length);
    } catch (e) {
      console.debug("COCO-SSD failed:", e);
    }

    // If nothing ran, block
    if (counts.length === 0) {
      alert("Automatic face detection is unavailable. Please use a different browser/device.");
      return false;
    }

    const maxCount = Math.max(...counts);
    if (maxCount !== 1) {
      alert(
        maxCount === 0
          ? "No face detected. Please choose a clear photo of a single person."
          : "Multiple faces detected. Choose another photo."
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("Validation error:", err);
    alert("Face verification failed. Please try a clearer image of one person.");
    return false;
  }
};

/* ---------- Signature Modal ---------- */
const SignatureModal = ({ show, onClose, onConfirm }) => {
  const [name, setName] = useState("");
  useEffect(() => loadSignatureFont(), []);
  if (!show) return null;

  return (
    <div className="signature-modal-overlay">
      <div className="signature-modal">
        <h3 className="signature-title">Enter Name for Electronic Signature</h3>

        <div className="signature-preview" style={{ fontFamily: "Great Vibes, cursive" }}>
          {name || "Your Signature"}
        </div>

        <label className="signature-label">Enter Signature</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="signature-input"
          placeholder="Type your full name"
        />

        <p className="signature-note">
          I acknowledge that typing my name here constitutes an electronic
          signature, and that I am at least 24 years of age or completing this
          form on behalf of someone under the age of 24.
        </p>

        <div className="signature-buttons">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="save-btn"
            onClick={() => {
              if (!name.trim()) {
                alert("Please enter your name to sign.");
                return;
              }
              onConfirm(name);
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Camera Modal (desktop/laptop webcam; mobile uses native capture) ---------- */
const CameraModal = ({ show, onClose, onCapture, initialFacing = "environment" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [facingMode, setFacingMode] = useState(initialFacing);
  const startingRef = useRef(false);

  const stopStream = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };

  const startStream = async (desiredFacing) => {
    try {
      stopStream();
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: desiredFacing },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("getUserMedia error:", err);
      alert("Unable to access the camera. Please allow permissions or try another browser.");
      onClose();
    }
  };

  useEffect(() => {
    let active = true;
    const start = async () => {
      if (!show || startingRef.current) return;
      startingRef.current = true;
      await startStream(facingMode);
      if (!active) stopStream();
      startingRef.current = false;
    };
    start();
    return () => { active = false; stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => { if (show) startStream(facingMode); /* eslint-disable-line */ }, [facingMode]);

  if (!show) return null;

  const takeSnapshot = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640, h = video.videoHeight || 480;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotoDataUrl(dataUrl);
  };

  const retake = () => setPhotoDataUrl("");

  const usePhoto = async () => {
    if (!photoDataUrl) return alert("Please capture a photo first.");
    const ok = await validateSingleFace(photoDataUrl);
    if (!ok) return;
    onCapture(photoDataUrl);
  };

  return (
    <div className="signature-modal-overlay">
      <div className="signature-modal" style={{ width: 520 }}>
        <h3 className="signature-title">Use Camera</h3>

        {!photoDataUrl ? (
          <video ref={videoRef} style={{ width: "100%", borderRadius: 8 }} playsInline muted autoPlay />
        ) : (
          <img src={photoDataUrl} alt="Captured" style={{ width: "100%", borderRadius: 8 }} />
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="signature-buttons" style={{ marginTop: 14 }}>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          {!photoDataUrl ? (
            <button className="save-btn" onClick={takeSnapshot}>Capture Photo</button>
          ) : (
            <>
              <button className="cancel-btn" onClick={retake}>Retake</button>
              <button className="save-btn" onClick={usePhoto}>Use Photo</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Main FormEditor ---------- */
const FormEditor = () => {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const patientId = searchParams.get("patient");
  const from = (searchParams.get("from") || "").toLowerCase();
  const formIds = searchParams.get("forms")?.split(",") || [formId];
  const currentIndex = formIds.indexOf(formId);

  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeSignatureField, setActiveSignatureField] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Camera state (desktop modal)
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [activeCameraField, setActiveCameraField] = useState(null);
  const [cameraInitialFacing, setCameraInitialFacing] = useState("user");

  const loadForm = async () => {
    try {
      const f = await fetchFormDetails(formId, patientId);
      const fields = (f.fields || []).map((fld) => {
        let v = fld.submitted_value ?? fld.response_value ?? fld.saved_value ?? "";
        if (fld.field_type === "Date") v = toYMD(v);
        if (fld.field_type === "Check") {
          const truthy = v === true || v === "true" || v === "1" || v === 1;
          v = truthy ? "true" : "";
        }
        return { ...fld, submitted_value: v };
      });
      setForm({ ...f, fields });
      setHasChanges(false);
    } catch (err) {
      console.error("Error loading form:", err);
    }
  };

  useEffect(() => {
    loadSignatureFont();
    loadForm();
    const beforeUnload = (e) => {
      if (!hasChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, patientId]);

  const handleFieldChange = (fieldId, value) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.map((fld) =>
        fld.field_id === fieldId ? { ...fld, submitted_value: value } : fld
      ),
    }));
    setHasChanges(true);
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSave = async (silent = false) => {
    if (!form) return false;
    setIsSaving(true);
    try {
      const payload = {
        patientId,
        fields: form.fields.map((f) => ({
          field_id: f.field_id,
          response_value:
            f.field_type === "Check"
              ? (f.submitted_value === "true" || f.submitted_value === true ? "true" : "")
              : asString(f.submitted_value),
        })),
      };
      const resp = await updateForm(formId, payload, patientId);
      const completion =
        typeof resp?.completion === "number" ? resp.completion.toFixed(2) : undefined;
      if (!silent) alert(`Saved successfully!${completion ? ` Completion: ${completion}%` : ""}`);
      await loadForm();
      setHasChanges(false);
      return true;
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save form.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (hasChanges) {
      const ok = window.confirm("You have unsaved changes. Do you want to discard them and go back?");
      if (!ok) return;
    }
    if (from === "customer") navigate("/customer");
    else navigate("/dash");
  };

  const handleNavigate = async (direction) => {
    const ok = await handleSave(true);
    if (!ok || isSaving) return;
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < formIds.length) {
      navigate(
        `/form-editor/${formIds[nextIndex]}?patient=${patientId}&forms=${formIds.join(",")}${from ? `&from=${from}` : ""}`
      );
    } else if (direction === "next") {
      alert("All forms completed!");
      if (from === "customer") navigate("/customer");
      else navigate("/dash");
    }
  };

  if (!form) return <p>Loading form...</p>;

  /* ---------- Photo field (media picker only — click drop area) ---------- */
  const PhotoField = ({ field }) => {
    const inputRef = useRef(null);

    const setIfValid = async (dataUrl) => {
      const ok = await validateSingleFace(dataUrl);
      if (!ok) {
        // ensure field is cleared if previously had a value
        handleFieldChange(field.field_id, "");
        return;
      }
      handleFieldChange(field.field_id, dataUrl);
    };

    const handleDrop = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        await setIfValid(dataUrl);
      } catch (err) {
        console.error("Drop->read error:", err);
        alert("Failed to read the dropped file.");
      }
    };

    const handleBrowse = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        await setIfValid(dataUrl);
      } catch (err) {
        console.error("Browse->read error:", err);
        alert("Failed to read the selected file.");
      } finally {
        e.target.value = "";
      }
    };

    const openFilePicker = () => inputRef.current?.click();
    const clearPhoto = () => handleFieldChange(field.field_id, "");

    const preview = field.submitted_value;

    return (
      <div>
        <div
          className="file-drop-area"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          onClick={openFilePicker}
          title="Click to choose a file or drop it here"
        >
          {preview ? (
            <div style={{ display: "grid", gap: 8 }}>
              <img
                src={preview}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8 }}
              />
              <small>Click area to replace the photo</small>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Drag & drop image here</p>
              <p style={{ margin: "6px 0 0 0" }}>or click to choose</p>
            </div>
          )}
        </div>

        {/* Hidden native picker (triggered by clicking the drop area) */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleBrowse}
        />

        {preview && (
          <div className="button-row">
            <button type="button" className="clear-btn" onClick={clearPhoto}>
              Clear
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ---------- Camera field (desktop: webcam modal; mobile: front/back native) ---------- */
  const CameraField = ({ field }) => {
    const mobileFrontRef = useRef(null);
    const mobileBackRef = useRef(null);

    const setIfValid = async (dataUrl) => {
      const ok = await validateSingleFace(dataUrl);
      if (!ok) {
        handleFieldChange(field.field_id, "");
        return;
      }
      handleFieldChange(field.field_id, dataUrl);
    };

    const handleBrowse = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        await setIfValid(dataUrl);
      } catch (err) {
        console.error("Mobile capture -> read error:", err);
        alert("Failed to read the captured image.");
      } finally {
        e.target.value = "";
      }
    };

    const openDesktopCamera = () => {
      setActiveCameraField(field.field_id);
      setCameraInitialFacing("user");
      setShowCameraModal(true);
    };

    const openFrontMobile = () => mobileFrontRef.current?.click();
    const openBackMobile = () => mobileBackRef.current?.click();

    const preview = field.submitted_value;
    const clearPhoto = () => handleFieldChange(field.field_id, "");

    return (
      <div>
        {preview && (
          <div style={{ marginBottom: 8 }}>
            <img
              src={preview}
              alt="Captured"
              style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8 }}
            />
          </div>
        )}

        {/* Mobile native capture inputs */}
        <input
          ref={mobileFrontRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: "none" }}
          onChange={handleBrowse}
        />
        <input
          ref={mobileBackRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleBrowse}
        />

        {isMobile() ? (
          <div className={preview ? "button-row-3" : "button-row-3"}>
            <button type="button" className="camera-btn" onClick={openFrontMobile}>
              Front Camera
            </button>
            <button type="button" className="camera-btn" onClick={openBackMobile}>
              Back Camera
            </button>
            {preview && (
              <button type="button" className="clear-btn" onClick={clearPhoto}>
                Clear
              </button>
            )}
          </div>
        ) : (
          <div className={preview ? "button-row" : "button-row"}>
            <button type="button" className="camera-btn" onClick={openDesktopCamera}>
              Use Camera
            </button>
            {preview && (
              <button type="button" className="clear-btn" onClick={clearPhoto}>
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ---------- Field Renderer ---------- */
  const renderField = (field) => {
    if (isPhotoField(field)) return <PhotoField field={field} />;
    if (isCameraField(field)) return <CameraField field={field} />;

    switch (field.field_type) {
      case "Text":
        return (
          <input
            type="text"
            value={field.submitted_value || ""}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
          />
        );
      case "Date":
        return (
          <input
            type="date"
            value={toYMD(field.submitted_value)}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
          />
        );
      case "Check":
        return (
          <input
            type="checkbox"
            checked={field.submitted_value === "true" || field.submitted_value === true}
            onChange={(e) => handleFieldChange(field.field_id, e.target.checked ? "true" : "")}
          />
        );
      case "Signature":
        return (
          <div>
            {field.submitted_value ? (
              <div className="signature-display" style={{ fontFamily: "Great Vibes, cursive" }}>
                {field.submitted_value}
              </div>
            ) : (
              <span
                className="signature-link"
                onClick={() => {
                  setActiveSignatureField(field.field_id);
                  setShowSignatureModal(true);
                }}
              >
                Click here to sign
              </span>
            )}
          </div>
        );
      case "Drop Down":
        return (
          <select
            value={field.submitted_value || ""}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={field.submitted_value || ""}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="form-editor-container">
      <h2>{form.title}</h2>
      <p>Status: {form.status || "Not Started"}</p>
      <p>Due Date: {toYMD(form.dueDate) || "—"}</p>
      <p>Location: {form.location || "—"}</p>
      <p>Patient ID: {patientId}</p>
      <p>Completion: {Number(form.completion || 0).toFixed(2)}%</p>

      <div className="form-section">
        {form.fields.map((field) => (
          <div key={field.field_id} className="form-field">
            <label>
              {field.field_label}
              {field.is_required && <span className="required">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button onClick={handleCancel} disabled={isSaving} className="cancel-btn">
          Cancel
        </button>

        {currentIndex > 0 && (
          <button onClick={() => handleNavigate("prev")} disabled={isSaving} className="cancel-btn">
            ⬅️ Previous
          </button>
        )}

        <button onClick={() => handleSave()} disabled={isSaving} className="save-btn">
          {isSaving ? "Saving..." : "Save"}
        </button>

        {currentIndex < formIds.length - 1 && (
          <button onClick={() => handleNavigate("next")} disabled={isSaving} className="save-btn">
            Next ➡️
          </button>
        )}
      </div>

      <SignatureModal
        show={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onConfirm={(name) => {
          handleFieldChange(activeSignatureField, name);
          setShowSignatureModal(false);
        }}
      />

      {/* Desktop/laptop webcam modal only */}
      <CameraModal
        show={showCameraModal && !isMobile()}
        onClose={() => setShowCameraModal(false)}
        onCapture={async (dataUrl) => {
          if (activeCameraField) {
            const ok = await validateSingleFace(dataUrl);
            if (ok) handleFieldChange(activeCameraField, dataUrl);
          }
          setShowCameraModal(false);
        }}
        initialFacing={cameraInitialFacing}
      />
    </div>
  );
};

export default FormEditor;
