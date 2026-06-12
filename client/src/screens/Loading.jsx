// While the backend generates: show the garment thumbnail + animated progress so
// the wait feels intentional (PLAN.md §3).
const LABELS = {
  idmvton: 'Accurate (IDM-VTON)',
  fashn: 'Accurate (FASHN)',
  nanobanana: 'Creative (Nano Banana 2)',
};

export default function Loading({ garmentImage, engine }) {
  return (
    <div className="screen center loading">
      {garmentImage && (
        <img className="loading-garment" src={garmentImage} alt="Your garment" />
      )}
      <div className="spinner" aria-hidden="true" />
      <h2 className="loading-title">Creating your try-on…</h2>
      <p className="loading-sub">{LABELS[engine] || 'Generating'} · this takes a few seconds</p>
    </div>
  );
}
