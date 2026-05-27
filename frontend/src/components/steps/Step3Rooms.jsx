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

export default function Step3Rooms({ formData, update, onNext, onBack }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Rooms & layout</h2>
        <p>Wet areas (bathrooms & toilets) are among the most expensive rooms per square metre — they significantly influence plumbing and tiling costs.</p>
      </div>

      <Counter label="Bedrooms" value={formData.bedrooms} min={1} max={10} onChange={v => update('bedrooms', v)} />
      <Counter label="Bathrooms (full, with shower/bath)" value={formData.bathrooms} min={1} max={8} onChange={v => update('bathrooms', v)} />
      <Counter label="Toilets (total, incl. ensuites)" value={formData.toilets} min={1} max={8} onChange={v => update('toilets', v)} />

      <div
        className={`toggle-group ${formData.study ? 'checked' : ''}`}
        onClick={() => update('study', !formData.study)}
      >
        <span className="toggle-label">
          <span>📚</span>
          <span>Study / home office</span>
        </span>
        <div className="toggle-switch" />
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Continue →</button>
      </div>
    </div>
  );
}
