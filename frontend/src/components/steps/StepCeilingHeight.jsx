const CEILING_OPTIONS = [
  {
    value: 'standard',
    icon: '🏠',
    label: 'Standard — 2.4 m',
    desc: 'Code minimum, suits most volume builder homes',
    pill: 'Base rate',
    pillClass: 'storey-pill--green',
  },
  {
    value: 'high_2_7',
    icon: '⬆️',
    label: 'High — 2.7 m',
    desc: 'Popular upgrade — noticeably airier feel throughout',
    pill: '+$8–12K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'extra_3_0',
    icon: '🏛️',
    label: 'Extra high — 3.0 m',
    desc: 'Premium finish — increased wall area and material costs',
    pill: '+$15–25K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'raked',
    icon: '🔺',
    label: 'Raked / vaulted',
    desc: 'Architectural feature — complex framing and custom joinery',
    pill: '+$20–35K',
    pillClass: 'storey-pill--red',
  },
];

export default function StepCeilingHeight({ formData, update, onNext, onBack }) {
  const selected = formData.ceilingHeight || 'standard';

  return (
    <div>
      <div className="step-heading">
        <h2>Ceiling heights</h2>
        <p>One of the most popular upgrades in NSW — ceiling height transforms how spacious a home feels throughout.</p>
      </div>

      <div className="storey-grid">
        {CEILING_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`storey-card${selected === opt.value ? ' selected' : ''}`}
            onClick={() => update('ceilingHeight', opt.value)}
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
