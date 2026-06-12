// Engine picker — two big touch cards with plain-language labels (PLAN.md §6),
// plus the PDPA consent line before the camera step (PLAN.md §9).
const ENGINES = [
  {
    id: 'idmvton',
    emoji: '🧪',
    title: 'IDM-VTON',
    sub: 'Experimental clothing swap',
    tag: 'Free',
  },
  {
    id: 'nanobanana',
    emoji: '🎯',
    title: 'Nano Banana',
    sub: 'Accurate, realistic result',
    tag: 'AI',
  },
];

export default function EngineSelect({ garmentImage, onBack, onSelect }) {
  return (
    <div className="screen pad">
      <header className="topbar">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="step-title">Choose a style</h2>
        <span className="step-count">2 / 3</span>
      </header>

      {garmentImage && (
        <img className="garment-thumb-top" src={garmentImage} alt="Your garment" />
      )}

      <div className="engine-grid">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            type="button"
            className="engine-card"
            onClick={() => onSelect(e.id)}
          >
            <span className="engine-emoji" aria-hidden="true">{e.emoji}</span>
            <span className="engine-title">{e.title}</span>
            <span className="engine-sub">{e.sub}</span>
            <span className="engine-tag">{e.tag}</span>
          </button>
        ))}
      </div>

      <p className="consent-line">
        Next you'll take a photo. We use it only to generate your try-on and don't store it.
      </p>
    </div>
  );
}
