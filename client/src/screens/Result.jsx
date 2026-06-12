// Full-screen result: the image edge-to-edge with Save (download), a QR to grab
// it on a phone, and Start over (PLAN.md §6). Also renders the error state.
import { QRCodeSVG } from 'qrcode.react';
import { resultUrlFromToken } from '../api.js';

export default function Result({ result, error, onRetry, onStartOver }) {
  if (error || !result) {
    return (
      <div className="screen pad center">
        <p className="error-text big">{error || 'No result to show.'}</p>
        <div className="actions">
          <button type="button" className="btn-ghost" onClick={onStartOver}>Start over</button>
          <button type="button" className="btn-primary" onClick={onRetry}>Try again</button>
        </div>
      </div>
    );
  }

  const { imageBase64, placeholder, token } = result;
  const qrUrl = resultUrlFromToken(token);

  function download() {
    const a = document.createElement('a');
    a.href = imageBase64;
    a.download = 'virtual-tryon.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="screen result">
      <img className="result-image" src={imageBase64} alt="Your try-on result" />

      {placeholder && (
        <span className="placeholder-badge">Preview (placeholder)</span>
      )}

      <div className="result-panel">
        {qrUrl && (
          <div className="qr-box">
            <QRCodeSVG value={qrUrl} size={120} includeMargin />
            <small>Scan to save on your phone</small>
          </div>
        )}
        <div className="result-buttons">
          <button type="button" className="btn-secondary" onClick={download}>Save</button>
          <button type="button" className="btn-primary" onClick={onStartOver}>Start over</button>
        </div>
      </div>
    </div>
  );
}
