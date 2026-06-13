const FINISH_OPTIONS = [
  {
    value:    'budget',
    icon:     '🏠',
    label:    'Basic',
    desc:     'Laminate benchtops, carpet & standard tiles, standard fittings throughout',
    features: ['Volume builder inclusions', 'Carpet in bedrooms', 'Laminate kitchen'],
    rate:     1850,
    pill:     '$1,850/m²',
    pillClass: 'finish-pill--green',
  },
  {
    value:    'mid',
    icon:     '⭐',
    label:    'Premium',
    desc:     'Stone benchtops, engineered timber floors, quality tapware & fittings',
    features: ['Stone benchtops', 'Engineered timber floors', 'Quality tapware'],
    rate:     2400,
    pill:     '$2,400/m²',
    pillClass: 'finish-pill--amber',
  },
  {
    value:    'premium',
    icon:     '💎',
    label:    'Luxury',
    desc:     'Marble & natural stone, custom joinery, imported fixtures & fittings',
    features: ['Marble / natural stone', 'Custom joinery', 'Imported fixtures'],
    rate:     3500,
    pill:     '$3,500/m²',
    pillClass: 'finish-pill--red',
  },
];

export default function Step6FinishLevel({ formData, update, onNext, onBack }) {
  const selected  = formData.qualityTier || 'mid';
  const houseSize = Number(formData.houseSize) || 0;

  // Show a rough indicative range based on selected rate (±15%)
  function liveRange(rate) {
    if (!houseSize) return null;
    const low  = Math.round(houseSize * rate * 0.85 / 1000) * 1000;
    const high = Math.round(houseSize * rate * 1.15 / 1000) * 1000;
    return `$${low.toLocaleString()} – $${high.toLocaleString()}`;
  }

  const selectedOpt = FINISH_OPTIONS.find(o => o.value === selected);

  return (
    <div>
      {/* ── Live estimate banner ────────────────────────────────────── */}
      {houseSize > 0 && selectedOpt && (
        <div className="finish-live-banner">
          <span className="finish-live-label">Indicative build cost</span>
          <span className="finish-live-value">{liveRange(selectedOpt.rate)}</span>
          <span className="finish-live-note">based on {houseSize.toLocaleString()} m² at {selectedOpt.pill}</span>
        </div>
      )}

      <div className="step-heading">
        <h2>What finish level are you targeting?</h2>
        <p>
          This drives material, fixture, and labour costs across every trade — kitchen,
          bathrooms, flooring, joinery, and fit-out.
        </p>
      </div>

      {/* ── Finish level cards ──────────────────────────────────────── */}
      <div className="finish-grid">
        {FINISH_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`finish-card ${selected === opt.value ? 'selected' : ''}`}
            onClick={() => update('qualityTier', opt.value)}
          >
            <div className="finish-card-top">
              <span className="finish-card-icon">{opt.icon}</span>
              <div className="finish-card-body">
                <div className="finish-card-title">{opt.label}</div>
                <div className="finish-card-desc">{opt.desc}</div>
                <ul className="finish-card-features">
                  {opt.features.map(f => (
                    <li key={f}>
                      <span className="finish-feature-dot" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="finish-card-footer">
              <span className={`finish-pill ${opt.pillClass}`}>{opt.pill}</span>
              {houseSize > 0 && (
                <span className="finish-card-range">{liveRange(opt.rate)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
