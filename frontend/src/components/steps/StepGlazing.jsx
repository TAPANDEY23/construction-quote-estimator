const GLAZING_OPTIONS = [
  {
    value: 'single_aluminium',
    icon: '🪟',
    label: 'Single-glazed aluminium',
    desc: 'Standard spec — budget-friendly, less thermal performance',
    pill: 'Base rate',
    pillClass: 'storey-pill--green',
  },
  {
    value: 'double_aluminium',
    icon: '🔲',
    label: 'Double-glazed aluminium',
    desc: 'Better thermal comfort — BASIX compliant for most NSW zones',
    pill: '+$8–15K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'double_upvc',
    icon: '❄️',
    label: 'Double-glazed uPVC / thermal break',
    desc: 'Premium thermal and acoustic performance — European standard',
    pill: '+$15–25K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'large_format',
    icon: '🏙️',
    label: 'Large format / feature glazing',
    desc: 'Floor-to-ceiling or architectural glass walls — high visual impact',
    pill: '+$25–40K',
    pillClass: 'storey-pill--red',
  },
];

export default function StepGlazing({ formData, update, onNext, onBack }) {
  const selected = formData.glazingType || 'single_aluminium';

  return (
    <div>
      <div className="step-heading">
        <h2>Windows &amp; glazing</h2>
        <p>Glazing affects thermal comfort, acoustic performance, energy bills, and NSW BASIX star-rating compliance.</p>
      </div>

      <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {GLAZING_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`option-card${selected === opt.value ? ' selected' : ''}`}
            onClick={() => update('glazingType', opt.value)}
          >
            <span className="option-icon">{opt.icon}</span>
            <div className="option-label">{opt.label}</div>
            <div className="option-desc">{opt.desc}</div>
            <span className={`storey-pill ${opt.pillClass}`} style={{ marginTop: 8 }}>{opt.pill}</span>
          </div>
        ))}
      </div>

      <p className="site-ai-hint" style={{ marginTop: 12 }}>
        💡 <span className="site-ai-hint-em">NSW BASIX tip:</span> Double glazing is required for most climate zones in NSW for new residential builds. Check your BASIX certificate requirements early.
      </p>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
