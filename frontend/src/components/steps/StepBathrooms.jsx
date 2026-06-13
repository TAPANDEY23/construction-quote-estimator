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

export default function StepBathrooms({ formData, update, onNext, onBack }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Bathrooms & toilets</h2>
        <p>Wet areas are the most expensive rooms per square metre — each full bathroom adds significant plumbing, tiling, and waterproofing costs.</p>
      </div>

      <Counter
        label="Full bathrooms (with shower or bath)"
        value={formData.bathrooms}
        min={1}
        max={8}
        onChange={v => update('bathrooms', v)}
      />
      <Counter
        label="Toilets (total, including ensuites)"
        value={formData.toilets}
        min={1}
        max={8}
        onChange={v => update('toilets', v)}
      />

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
