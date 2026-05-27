const GARAGE_OPTIONS = [
  { value: 'none', icon: '🚫', label: 'No garage', desc: 'Street or on-site parking only' },
  { value: 'single_garage', icon: '🚗', label: 'Single garage', desc: '1 car, internal access' },
  { value: 'double_garage', icon: '🚙', label: 'Double garage', desc: '2 cars, internal access' },
  { value: 'triple_garage', icon: '🏎️', label: 'Triple garage', desc: '3 cars, internal access' },
  { value: 'single_carport', icon: '🅿️', label: 'Single carport', desc: '1 car, open structure' },
  { value: 'double_carport', icon: '🅿️', label: 'Double carport', desc: '2 cars, open structure' },
];

export default function Step4Garage({ formData, update, onNext, onBack }) {
  const handleSelect = (value) => {
    update('garageType', value);
    const spaces = value === 'none' ? 0
      : value.includes('single') ? 1
      : value.includes('double') ? 2
      : 3;
    update('garageSpaces', spaces);
  };

  return (
    <div>
      <div className="step-heading">
        <h2>Garage & parking</h2>
        <p>An internal-access double garage typically adds $35,000–$65,000 to a build. Carports are significantly cheaper but offer less security.</p>
      </div>

      <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {GARAGE_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`option-card ${formData.garageType === opt.value ? 'selected' : ''}`}
            onClick={() => handleSelect(opt.value)}
          >
            <span className="option-icon">{opt.icon}</span>
            <div className="option-label">{opt.label}</div>
            <div className="option-desc">{opt.desc}</div>
          </div>
        ))}
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Continue →</button>
      </div>
    </div>
  );
}
