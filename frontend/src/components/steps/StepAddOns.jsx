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

export default function StepAddOns({ formData, update, onBack, onSubmit }) {
  return (
    <div>
      <div className="step-heading">
        <h2>Optional features</h2>
        <p>Last step — select any optional features to include in your estimate.</p>
      </div>

      <Toggle
        icon="☀️"
        label="Solar panels (6.6 kW system)"
        desc="+$12,000"
        checked={formData.solar}
        onChange={() => update('solar', !formData.solar)}
      />
      <Toggle
        icon="❄️"
        label="Ducted air conditioning"
        desc="+$22,000"
        checked={formData.ductedAC}
        onChange={() => update('ductedAC', !formData.ductedAC)}
      />

      {/* B9: new add-ons */}
      <Toggle
        icon="🎬"
        label="Home theatre room"
        desc="+$25,000"
        checked={formData.homeTheatre}
        onChange={() => update('homeTheatre', !formData.homeTheatre)}
      />
      <Toggle
        icon="👗"
        label="Walk-in robe (master)"
        desc="+$8,000"
        checked={formData.walkInRobe}
        onChange={() => update('walkInRobe', !formData.walkInRobe)}
      />
      <Toggle
        icon="🏠"
        label="Smart home automation"
        desc="+$18,000"
        checked={formData.smartHome}
        onChange={() => update('smartHome', !formData.smartHome)}
      />
      <Toggle
        icon="🛗"
        label="Home lift"
        desc="+$55,000"
        checked={formData.homeLift}
        onChange={() => update('homeLift', !formData.homeLift)}
      />
      <Toggle
        icon="🔥"
        label="Fireplace"
        desc="+$12,000"
        checked={formData.fireplace}
        onChange={() => update('fireplace', !formData.fireplace)}
      />
      <Toggle
        icon="🕌"
        label="Prayer / meditation room"
        desc="+$15,000"
        checked={formData.prayerRoom}
        onChange={() => update('prayerRoom', !formData.prayerRoom)}
      />
      <Toggle
        icon="🛏️"
        label="Extra guest bedroom"
        desc="+$22,000"
        checked={formData.extraGuestBedroom}
        onChange={() => update('extraGuestBedroom', !formData.extraGuestBedroom)}
      />

      <div className="form-group" style={{ marginTop: 20 }}>
        <label>Special requirements or notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
        <textarea
          value={formData.specialRequirements}
          onChange={e => update('specialRequirements', e.target.value)}
          placeholder="e.g. accessibility requirements, heritage overlay, awkward block shape, specific materials, BAL rating, bushfire zone…"
          rows={3}
          style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onSubmit}>Get my estimate →</button>
      </div>
    </div>
  );
}
