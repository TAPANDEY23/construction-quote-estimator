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

export default function Step6Inclusions({ formData, update, onNext, onBack }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Inclusions & finishes</h2>
        <p>Select what's included in the build. Each addition affects cost — pools alone can add $50,000–$120,000+.</p>
      </div>

      <div className="form-row">
        <SelectGroup
          label="Kitchen finish"
          value={formData.kitchenFinish}
          onChange={v => update('kitchenFinish', v)}
          options={[
            { value: 'standard', label: 'Standard (laminate benchtops)' },
            { value: 'mid_range', label: 'Mid-range (stone benchtops)' },
            { value: 'premium', label: 'Premium (full stone, integrated appliances)' },
            { value: 'luxury', label: 'Luxury (bespoke, butler\'s pantry)' },
          ]}
        />
        <SelectGroup
          label="Flooring"
          value={formData.flooringType}
          onChange={v => update('flooringType', v)}
          options={[
            { value: 'mixed', label: 'Mixed (carpet + tiles)' },
            { value: 'tiles_throughout', label: 'Tiles throughout' },
            { value: 'timber_living', label: 'Timber in living areas' },
            { value: 'timber_throughout', label: 'Timber/hybrid throughout' },
          ]}
        />
      </div>

      <SelectGroup
        label="Landscaping"
        value={formData.landscaping}
        onChange={v => update('landscaping', v)}
        options={[
          { value: 'none', label: 'None (bare earth / turf only)' },
          { value: 'basic', label: 'Basic (turf, driveway, pathways)' },
          { value: 'standard', label: 'Standard (garden beds, paving, fencing)' },
          { value: 'premium', label: 'Premium (full design, irrigation, feature plants)' },
        ]}
      />

      <div style={{ marginTop: 8 }}>
        <Toggle
          icon="🏊"
          label="Swimming pool"
          desc="Concrete pool + surrounds: approx. $60,000–$120,000+"
          checked={formData.pool}
          onChange={() => update('pool', !formData.pool)}
        />
        <Toggle
          icon="☀️"
          label="Solar panels (6.6kW system)"
          desc="Approx. $7,000–$12,000 installed"
          checked={formData.solar}
          onChange={() => update('solar', !formData.solar)}
        />
        <Toggle
          icon="❄️"
          label="Ducted air conditioning"
          desc="Approx. $12,000–$25,000 depending on house size"
          checked={formData.ductedAC}
          onChange={() => update('ductedAC', !formData.ductedAC)}
        />
        <Toggle
          icon="🌿"
          label="Alfresco / outdoor entertaining"
          desc="Covered patio or outdoor room: approx. $15,000–$40,000"
          checked={formData.alfresco}
          onChange={() => update('alfresco', !formData.alfresco)}
        />
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
