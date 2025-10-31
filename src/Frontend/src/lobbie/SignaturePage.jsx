import React, { useRef, useState, useEffect } from 'react';
import './SignaturePage.css';
 
export default function SignaturePage() {
  const canvasRef = useRef(null);
  const [activeTab, setActiveTab] = useState(null);     // 'signature' or null
  const [showOverlay, setShowOverlay] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
 
  // initialize canvas when overlay opens
  useEffect(() => {
    if (!showOverlay) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setPaths([]);
  }, [showOverlay]);
 
  const getPos = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };
 
  const startDraw = e => {
    e.preventDefault();
    const { x,y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setCurrentPath([{x,y}]);
  };
 
  const draw = e => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x,y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x,y);
    ctx.stroke();
    setCurrentPath(p => [...p, {x,y}]);
  };
 
  const stopDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setPaths(p => [...p, currentPath]);
    setCurrentPath([]);
  };
 
  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height);
    setPaths([]);
  };
 
  const saveSignature = () => {
    if (paths.length === 0) {
      alert('Draw first');
      return;
    }
    const url = canvasRef.current.toDataURL();
    setSignatureUrl(url);
    setShowOverlay(false);
  };
 
  return (
    <div className="signature-page-layout">
      {/* Sidebar */}
      <div className="ssidebar">
        <div
          className="sidebar-active"
          onClick={() => {
            setActiveTab('signature');
            setShowOverlay(false);
          }}
        >
          Signature
        </div>
      </div>
 
      {/* Main Content */}
      <div className="main-content">
        {activeTab==='signature' && (
          <div className="main-card">
            <h1 className="sig-title">Signature</h1>
 
            <div className="sig-box">
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="sig-canvas"
                />
              ) : (
                <button
                  className="set-btn"
                  onClick={() => setShowOverlay(true)}
                >
                  Set Your Digital Signature
                </button>
              )}
            </div>
 
            {signatureUrl && (
              <div className="sig-btn-row">
                <button
                  className="set-btn"
                  onClick={() => setShowOverlay(true)}
                >Update Signature</button>
                <button
                  className="del-btn"
                  onClick={() => setSignatureUrl(null)}
                >Delete Signature</button>
              </div>
            )}
          </div>
        )}
      </div>
 
      {/* Overlay */}
      {showOverlay && (
        <div
          className="sig-draw-overlay"
          onClick={() => setShowOverlay(false)}
        >
          <div
            className="sig-draw-card"
            onClick={e => e.stopPropagation()}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="sig-canvas"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              style={{ touchAction:'none' }}
            />
            <div className="sig-btn-row">
              <button className="set-btn" onClick={saveSignature}>
                Save
              </button>
              <button className="del-btn" onClick={clearCanvas}>
                Clear
              </button>
              <button className="del-btn" onClick={() => setShowOverlay(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 