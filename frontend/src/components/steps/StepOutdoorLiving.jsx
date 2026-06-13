function Toggle({ icon, label, desc, checked, onChange }) {
  return (
    <div className={`toggle-group ${checked ? 'checked' : ''}`} onClick={onChange}>
      <label className="toggle-label" onClick={e => e.preventDefault()}>
        <span>{icon}</span>
        <span>
          <span style={{ display: 'block', fontWeight: 600 }}>{label}</span>
          {desc && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{desc}</span>}
        </span>
      </label>
      <div className="toggle-switch" />
    </div>
  );
}

function SelectGroup({ label, value, options, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function StepOutdoorLiving({ formData, update, onNext, onBack }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Outdoor living</h2>
        <p>Outdoor spaces add to both build cost and long-term liveability. A pool or alfresco area is one of the most commonly requested additions in Australian builds.</p>
      </div>

      <SelectGroup
        label="Landscaping"
        value={formData.landscaping}
        onChange={v => update('landscaping', v)}
        options={[
          { value: 'none',     label: 'None — bare earth or basic turf only' },
          { value: 'basic',    label: 'Basic — turf, driveway, pathways' },
          { value: 'standard', label: 'Standard — garden beds, paving, fencing (+$15K)' },
          { value: 'premium',  label: 'Premium — full design, irrigation, feature planting (+$40K)' },
        ]}
      />

      <div style={{ marginTop: 8 }}>
        <Toggle
          icon="🌿"
          label="Alfresco / outdoor entertaining area"
          desc="Covered patio or outdoor room — approx. $15,000–$40,000"
          checked={formData.alfresco}
          onChange={() => update('alfresco', !formData.alfresco)}
        />
        <Toggle
          icon="🏊"
          label="Swimming pool"
          desc="Concrete pool + coping + surrounds — approx. $60,000–$120,000+"
          checked={formData.pool}
          onChange={() => update('pool', !formData.pool)}
        />
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
