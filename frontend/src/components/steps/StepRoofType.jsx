const ROOF_OPTIONS = [
  {
    value: 'colorbond',
    icon: '🏠',
    label: 'Pitched Colorbond steel',
    desc: 'Most common in Australia — lightweight, durable, cost-effective',
    pill: 'Base rate',
    pillClass: 'storey-pill--green',
  },
  {
    value: 'tiles',
    icon: '🏡',
    label: 'Concrete or terracotta tiles',
    desc: 'Traditional look — heavier structure, additional framing required',
    pill: '+$12–20K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'skillion',
    icon: '📐',
    label: 'Skillion / flat roof',
    desc: 'Modern aesthetic — higher waterproofing and drainage cost',
    pill: '+$30–60K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'mixed_arch',
    icon: '🏛️',
    label: 'Mixed / architectural',
    desc: 'Multi-pitch or complex custom roof forms — premium build',
    pill: '+$50–80K',
    pillClass: 'storey-pill--red',
  },
];

export default function StepRoofType({ formData, update, onNext, onBack }) {
  const selected = formData.roofType || 'colorbond';

  return (
    <div>
      <div className="step-heading">
        <h2>Roof type</h2>
        <p>Roof structure and material affect framing, waterproofing, and home aesthetic — and vary significantly in cost.</p>
      </div>

      <div className="storey-grid">
        {ROOF_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`storey-card${selected === opt.value ? ' selected' : ''}`}
            onClick={() => update('roofType', opt.value)}
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

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
