const FACADE_OPTIONS = [
  {
    value: 'brick_veneer',
    icon: '🧱',
    label: 'Brick veneer',
    desc: 'Most common in Australia',
    pill: 'Base rate',
    pillClass: 'storey-pill--green',
  },
  {
    value: 'rendered_masonry',
    icon: '🏛️',
    label: 'Rendered masonry',
    desc: 'Painted / textured finish',
    pill: '+4%',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'weatherboard',
    icon: '🪵',
    label: 'Weatherboard',
    desc: 'Fibre cement or timber',
    pill: '+2%',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'colorbond_cladding',
    icon: '⬛',
    label: 'Colorbond cladding',
    desc: 'Steel panel — low maintenance',
    pill: '−3%',
    pillClass: 'storey-pill--green',
  },
  {
    value: 'timber_cladding',
    icon: '🌲',
    label: 'Timber cladding',
    desc: 'Natural look, higher upkeep',
    pill: '+8%',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'architectural',
    icon: '🏗️',
    label: 'Architectural / mixed',
    desc: 'Custom facade combination',
    pill: '+14%',
    pillClass: 'storey-pill--red',
  },
];

export default function StepFacade({ formData, update, onNext, onBack }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Facade &amp; cladding</h2>
        <p>Your exterior finish affects build cost, maintenance requirements, and climate performance. The percentage shown is the effect on your overall build rate.</p>
      </div>

      <div className="form-group">
        <div className="storey-grid storey-grid--3col">
          {FACADE_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`storey-card${formData.facadeType === opt.value ? ' selected' : ''}`}
              onClick={() => update('facadeType', opt.value)}
            >
              <div className="storey-card-top">
                <span className="storey-card-icon">{opt.icon}</span>
                <div>
                  <div className="storey-card-title">{opt.label}</div>
                  <div className="storey-card-desc">{opt.desc}</div>
                </div>
              </div>
              <span className={`storey-pill ${opt.pillClass}`}>{opt.pill}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
