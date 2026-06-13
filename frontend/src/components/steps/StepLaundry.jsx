const LAUNDRY_OPTIONS = [
  {
    value: 'standard',
    icon: '🫧',
    label: 'Standard laundry',
    desc: 'Tub, basic cabinetry, appliance connections — typical volume builder spec',
    pill: 'Base rate',
    pillClass: 'storey-pill--green',
  },
  {
    value: 'with_cabinetry',
    icon: '🗄️',
    label: 'With extra cabinetry',
    desc: 'Additional overhead storage and bench space — great for larger households',
    pill: '+$6–14K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'combined',
    icon: '🚿',
    label: 'Combined laundry / bathroom',
    desc: 'Laundry integrated with a bathroom — saves space and reduces plumbing runs',
    pill: '+$5–10K',
    pillClass: 'storey-pill--amber',
  },
  {
    value: 'premium',
    icon: '✨',
    label: 'Premium laundry',
    desc: 'Stone benchtop, quality cabinetry, feature tiles — a design-conscious space',
    pill: '+$12–22K',
    pillClass: 'storey-pill--red',
  },
];

export default function StepLaundry({ formData, update, onNext, onBack }) {
  const selected = formData.laundryType || 'standard';

  return (
    <div>
      <div className="step-heading">
        <h2>Laundry</h2>
        <p>The laundry is a high-use utility space — its finish level and layout have a noticeable effect on day-to-day liveability.</p>
      </div>

      <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {LAUNDRY_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`option-card${selected === opt.value ? ' selected' : ''}`}
            onClick={() => update('laundryType', opt.value)}
          >
            <span className="option-icon">{opt.icon}</span>
            <div className="option-label">{opt.label}</div>
            <div className="option-desc">{opt.desc}</div>
            <span className={`storey-pill ${opt.pillClass}`} style={{ marginTop: 8 }}>{opt.pill}</span>
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
