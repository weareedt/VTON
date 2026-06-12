// Camera capture: live preview, body-framing overlay, 3-2-1 countdown, capture a
// still to JPEG, and a retake option (PLAN.md §6). Captures a frame, not a stream.
import { useEffect, useRef, useState } from 'react';
import { scaleImageToJpeg } from '../imageUtils.js';

export default function Camera({ onBack, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | live | denied
  const [countdown, setCountdown] = useState(null);
  const [shot, setShot] = useState(null); // captured data URL (for retake review)

  // Acquire the camera once.
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('live');
      } catch {
        setStatus('denied');
      }
    }
    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function startCountdown() {
    if (countdown !== null || status !== 'live') return;
    let n = 3;
    setCountdown(n);
    const tick = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(tick);
        setCountdown(null);
        capture();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const jpeg = scaleImageToJpeg(video, video.videoWidth, video.videoHeight);
    setShot(jpeg);
  }

  function confirm() {
    stopCamera();
    onCapture(shot);
  }

  if (status === 'denied') {
    return (
      <div className="screen pad center">
        <p className="error-text big">Camera access is needed to take your photo.</p>
        <button type="button" className="btn-primary" onClick={onBack}>Go back</button>
      </div>
    );
  }

  return (
    <div className="screen camera">
      <div className="camera-stage">
        {/* Live preview (hidden while reviewing a shot) */}
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          style={{ display: shot ? 'none' : 'block' }}
        />
        {shot && <img className="camera-video" src={shot} alt="Your photo" />}

        {/* Body-framing overlay — the highest-leverage UI element (PLAN.md §8) */}
        {!shot && (
          <div className="frame-overlay" aria-hidden="true">
            <div className="frame-outline" />
            <span className="frame-hint">Stand back so your upper body fits the outline</span>
          </div>
        )}

        {countdown !== null && <div className="countdown">{countdown}</div>}
      </div>

      <footer className="camera-actions">
        {!shot ? (
          <>
            <button type="button" className="btn-ghost" onClick={() => { stopCamera(); onBack(); }}>
              ← Back
            </button>
            <button
              type="button"
              className="shutter"
              onClick={startCountdown}
              disabled={status !== 'live' || countdown !== null}
              aria-label="Take photo"
            />
            <span className="spacer" />
          </>
        ) : (
          <>
            <button type="button" className="btn-ghost" onClick={() => setShot(null)}>
              Retake
            </button>
            <button type="button" className="btn-primary" onClick={confirm}>
              Use this photo
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
