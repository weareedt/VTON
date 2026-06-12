// Idle / attract screen. Tapping anywhere starts a session.
export default function Welcome({ onStart }) {
  return (
    <button type="button" className="screen welcome" onClick={onStart}>
      <div className="welcome-art" aria-hidden="true">👕</div>
      <h1 className="welcome-title">Virtual Try-On</h1>
      <p className="welcome-sub">See yourself in any outfit</p>
      <span className="welcome-cta pulse">Tap to start</span>
    </button>
  );
}
