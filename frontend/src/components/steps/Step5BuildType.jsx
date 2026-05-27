function OptionGroup({ label, options, value, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="option-grid">
        {options.map(opt => (
          <div
            key={opt.value}
            className={`option-card ${value === opt.value ? 'selected' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            <span className="option-icon">{opt.icon}</span>
            <div className="option-label">{opt.label}</div>
            {opt.desc && <div className="option-desc">{opt.desc}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Step5BuildType({ formData, update, onNext, onBack }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Construction type & quality</h2>
        <p>These choices affect both the structural cost and the builder margin. Custom homes typically cost 20–40% more than equivalent project homes.</p>
      </div>

      <OptionGroup
        label="Build method"
        value={formData.buildMethod}
        onChange={v => update('buildMethod', v)}
        options={[
          { value: 'brick_veneer', icon: '🧱', label: 'Brick veneer', desc: 'Most common in Aus' },
          { value: 'double_brick', icon: '🏛️', label: 'Double brick', desc: 'Premium, solid walls' },
          { value: 'timber_frame', icon: '🪵', label: 'Timber frame', desc: 'Common in QLD/VIC' },
          { value: 'steel_frame', icon: '⚙️', label: 'Steel frame', desc: 'Termite resistant' },
        ]}
      />

      <OptionGroup
        label="Design type"
        value={formData.designType}
        onChange={v => update('designType', v)}
        options={[
          { value: 'project_home', icon: '📋', label: 'Project home', desc: 'Volume builder design' },
          { value: 'custom_design', icon: '✏️', label: 'Custom design', desc: 'Architect / designer' },
        ]}
      />

      <OptionGroup
        label="Quality / finish tier"
        value={formData.qualityTier}
        onChange={v => update('qualityTier', v)}
        options={[
          { value: 'budget', icon: '💲', label: 'Budget', desc: 'Entry-level finishes' },
          { value: 'mid', icon: '💰', label: 'Mid-range', desc: 'Standard quality' },
          { value: 'premium', icon: '💎', label: 'Premium', desc: 'High-end finishes' },
        ]}
      />

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Continue →</button>
      </div>
    </div>
  );
}
