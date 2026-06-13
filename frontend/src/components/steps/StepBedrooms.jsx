function Counter({ label, value, min, max, onChange }) {
  return (
    <div className="counter-group">
      <label>{label}</label>
      <div className="counter-controls">
        <button className="counter-btn" onClick={() => onChange(value - 1)} disabled={value <= min}>−</button>
        <span className="counter-value">{value}</span>
        <button className="counter-btn" onClick={() => onChange(value + 1)} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

export default function StepBedrooms({ formData, update, onNext, onBack }) {
  // B7: auto-cap ensuites to bedroom count when bedrooms decreases
  function handleBedrooms(v) {
    update('bedrooms', v);
    if ((formData.ensuites || 1) > v) update('ensuites', v);
  }

  return (
    <div>
      <div className="step-heading">
        <h2>Bedrooms</h2>
        <p>Bedroom and ensuite count drives floor area requirements and wet-area costs.</p>
      </div>

      <Counter
        label="Bedrooms"
        value={formData.bedrooms}
        min={1}
        max={10}
        onChange={handleBedrooms}
      />

      {/* B7: ensuites counter */}
      <Counter
        label="Ensuites"
        value={formData.ensuites ?? 1}
        min={0}
        max={formData.bedrooms}
        onChange={v => update('ensuites', v)}
      />

      <div
        className={`toggle-group ${formData.study ? 'checked' : ''}`}
        onClick={() => update('study', !formData.study)}
      >
        <span className="toggle-label">
          <span>📚</span>
          <span>Study / home office (+$15,000)</span>
        </span>
        <div className="toggle-switch" />
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
