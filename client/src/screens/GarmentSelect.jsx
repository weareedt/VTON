// Garment picker. Shows a built-in library of pre-stored garments (tap to pick),
// plus an "Upload your own" fallback. Visitors normally just tap a garment — no
// upload needed each time (PLAN.md §6).
//
// The library is fetched at runtime from /api/garments, so adding a garment
// (drop a file in client/public/garments) needs no rebuild — just refresh.
import { useEffect, useRef, useState } from 'react';
import { fileToScaledJpeg, urlToScaledJpeg } from '../imageUtils.js';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function GarmentSelect({ onBack, onNext }) {
  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/garments')
      .then((r) => (r.ok ? r.json() : { garments: [] }))
      .then((d) => { if (!cancelled) setLibrary(d.garments || []); })
      .catch(() => { if (!cancelled) setLibrary([]); })
      .finally(() => { if (!cancelled) setLoadingLib(false); });
    return () => { cancelled = true; };
  }, []);

  async function pickFromLibrary(item) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await urlToScaledJpeg(item.url);
      onNext(dataUrl);
    } catch {
      setError('Could not load that garment. Try another.');
      setBusy(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      setError('Please choose a JPEG or PNG image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is too large (max 10 MB).');
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await fileToScaledJpeg(file);
      onNext(dataUrl);
    } catch {
      setError('Could not read that image. Try another.');
      setBusy(false);
    }
  }

  return (
    <div className="screen pad">
      <header className="topbar">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="step-title">Choose a garment</h2>
        <span className="step-count">1 / 3</span>
      </header>

      <div className="garment-grid">
        {library.map((item) => (
          <button
            key={item.url}
            type="button"
            className="garment-tile"
            onClick={() => pickFromLibrary(item)}
            disabled={busy}
          >
            <img src={item.url} alt={item.name} loading="lazy" />
            <span className="garment-name">{item.name}</span>
          </button>
        ))}

        {/* Upload-your-own tile */}
        <button
          type="button"
          className="garment-tile upload-tile"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <span className="upload-icon" aria-hidden="true">＋</span>
          <span className="garment-name">Upload your own</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleUpload}
      />

      {!loadingLib && library.length === 0 && (
        <p className="hint-text">
          No garments in the library yet — add images to <code>client/public/garments/</code>, or upload one.
        </p>
      )}
      {busy && <p className="hint-text">Loading…</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
