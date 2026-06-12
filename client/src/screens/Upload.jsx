// Garment upload. Validates a JPEG under the size cap, previews it, and
// downscales before handing a data URL upstream.
import { useRef, useState } from 'react';
import { fileToScaledJpeg } from '../imageUtils.js';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function Upload({ onBack, onNext }) {
  const [preview, setPreview] = useState(null); // scaled data URL
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!/^image\/jpe?g$/i.test(file.type)) {
      setError('Please choose a JPEG image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is too large (max 10 MB).');
      return;
    }

    setBusy(true);
    try {
      const scaled = await fileToScaledJpeg(file);
      setPreview(scaled);
    } catch {
      setError('Could not read that image. Try another.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen pad">
      <header className="topbar">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="step-title">Upload a garment</h2>
        <span className="step-count">1 / 3</span>
      </header>

      <div className="upload-body">
        {preview ? (
          <img className="garment-preview" src={preview} alt="Garment preview" />
        ) : (
          <button
            type="button"
            className="dropzone"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Loading…' : (
              <>
                <span className="dropzone-icon" aria-hidden="true">📷</span>
                <span>Tap to choose a garment photo</span>
                <small>JPEG, up to 10 MB</small>
              </>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg"
          hidden
          onChange={handleFile}
        />

        {error && <p className="error-text">{error}</p>}
      </div>

      <footer className="actions">
        {preview && (
          <button type="button" className="btn-ghost" onClick={() => { setPreview(null); setError(null); }}>
            Choose another
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={!preview}
          onClick={() => onNext(preview)}
        >
          Continue
        </button>
      </footer>
    </div>
  );
}
