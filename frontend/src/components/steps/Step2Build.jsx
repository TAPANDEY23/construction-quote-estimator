export default function Step2Build({ formData, update, onNext, onBack }) {
  const canContinue = formData.landSize && formData.houseSize;

  return (
    <div>
      <div className="step-heading">
        <h2>Land & house size</h2>
        <p>These measurements are the biggest driver of your build cost. House floor area includes all habitable and non-habitable spaces across all storeys.</p>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Land size (m²)</label>
          <input
            type="number"
            placeholder="e.g. 600"
            min="100"
            max="100000"
            value={formData.landSize}
            onChange={e => update('landSize', e.target.value)}
          />
          <p className="hint">Total lot/block area</p>
        </div>
        <div className="form-group">
          <label>House floor area (m²)</label>
          <input
            type="number"
            placeholder="e.g. 250"
            min="50"
            max="2000"
            value={formData.houseSize}
            onChange={e => update('houseSize', e.target.value)}
          />
          <p className="hint">Total internal floor area</p>
        </div>
      </div>

      <div className="form-group">
        <label>Number of storeys</label>
        <div className="option-grid">
          {[
            { value: 1, icon: '🏠', label: 'Single storey' },
            { value: 2, icon: '🏢', label: 'Double storey' },
            { value: 3, icon: '🏗️', label: 'Three storeys' },
          ].map(opt => (
            <div
              key={opt.value}
              className={`option-card ${formData.storeys === opt.value ? 'selected' : ''}`}
              onClick={() => update('storeys', opt.value)}
            >
              <span className="option-icon">{opt.icon}</span>
              <div className="option-label">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext} disabled={!canContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
