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

export default function StepKitchen({ formData, update, onNext, onBack }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Kitchen & flooring</h2>
        <p>The kitchen is typically the highest-cost room per square metre. Flooring choice affects the entire living area and is one of the most visible finishes.</p>
      </div>

      <SelectGroup
        label="Kitchen finish"
        value={formData.kitchenFinish}
        onChange={v => update('kitchenFinish', v)}
        options={[
          { value: 'standard',  label: 'Standard — laminate benchtops, flat-pack cabinetry' },
          { value: 'mid_range', label: 'Mid-range — stone benchtops, semi-custom cabinetry (+$12K base)' },
          { value: 'premium',   label: 'Premium — full stone, integrated appliances (+$35K base)' },
          { value: 'luxury',    label: "Luxury — bespoke kitchen (+$65K base, scales with home size)" },
        ]}
      />

      {/* C4: Butler's pantry toggle */}
      <div
        className={`toggle-group ${formData.pantry ? 'checked' : ''}`}
        onClick={() => update('pantry', !formData.pantry)}
      >
        <span className="toggle-label">
          <span>🍽️</span>
          <span>Butler's pantry (+$12,000)</span>
        </span>
        <div className="toggle-switch" />
      </div>

      <SelectGroup
        label="Flooring"
        value={formData.flooringType}
        onChange={v => update('flooringType', v)}
        options={[
          { value: 'mixed',             label: 'Mixed (carpet in bedrooms, tiles in living areas)' },
          { value: 'tiles_throughout',  label: 'Tiles throughout (+2%)' },
          { value: 'timber_living',     label: 'Timber / hybrid in living areas (+3%)' },
          { value: 'timber_throughout', label: 'Timber / hybrid throughout (+5%)' },
        ]}
      />

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
