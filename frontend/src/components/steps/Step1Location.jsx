import SuburbSearch from '../SuburbSearch';

const AU_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

export default function Step1Location({ formData, update, onNext }) {
  const canContinue = formData.suburb.trim() && formData.state;

  function handleSuburbChange(value) {
    update('suburb', value);
  }

  function handleStateDetected(stateCode) {
    update('state', stateCode);
  }

  return (
    <div>
      <div className="step-heading">
        <h2>Where are you building?</h2>
        <p>Location significantly affects construction costs — labour rates, material transport, and council fees vary widely across Australia.</p>
      </div>

      <div className="form-group">
        <label>Suburb</label>
        <SuburbSearch
          value={formData.suburb}
          onChange={handleSuburbChange}
          onStateDetected={handleStateDetected}
        />
        <p className="hint">Type to search from a list, or enter any suburb name manually.</p>
      </div>

      <div className="form-group">
        <label>State / Territory</label>
        <select value={formData.state} onChange={e => update('state', e.target.value)}>
          <option value="">Select state or territory...</option>
          {AU_STATES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {formData.state && (
          <p className="hint state-auto-hint">Auto-detected from suburb — you can change it above if needed.</p>
        )}
      </div>

      <div className="step-nav">
        <div />
        <button className="btn btn-primary" onClick={onNext} disabled={!canContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
