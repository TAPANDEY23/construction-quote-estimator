import SuburbSearch from '../SuburbSearch';

const AU_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Capital Territory' },
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

  function handlePostcodeDetected(pc) {
    update('postcode', pc);
  }

  function handleStateClick(code) {
    update('state', code);
  }

  const stateName = AU_STATES.find(s => s.value === formData.state)?.label;

  return (
    <div>

      {/* ── Live estimate banner ──────────────────────────────────── */}
      <div className="loc-live-banner">
        <span className="loc-live-label">Live estimate</span>
        <span className="loc-live-value">
          {formData.suburb ? 'Select more options to estimate →' : 'Enter suburb to start'}
        </span>
      </div>

      {/* ── Heading ───────────────────────────────────────────────── */}
      <div className="step-heading">
        <h2>Where in Australia are you building?</h2>
        <p>
          Type any suburb or postcode —{' '}
          <span className="loc-desc-highlight">
            Location significantly affects construction costs — labour rates, material transport,
            and council fees vary widely across Australia.
          </span>
        </p>
      </div>

      {/* ── Suburb + State row ────────────────────────────────────── */}
      <div className="loc-search-row">
        <div className="form-group">
          <label>Suburb or postcode</label>
          <div className="loc-search-wrap">
            <SuburbSearch
              value={formData.suburb}
              onChange={handleSuburbChange}
              onStateDetected={handleStateDetected}
              onPostcodeDetected={handlePostcodeDetected}
            />
            <span className="loc-search-icon">🔍</span>
          </div>
        </div>

        <div className="form-group">
          <label>State / territory</label>
          <div className={`loc-state-display ${formData.state ? 'filled' : ''}`}>
            {formData.state ? (
              <>
                <span className="loc-state-code">{formData.state}</span>
                <span className="loc-state-name">{stateName}</span>
              </>
            ) : (
              <span className="loc-state-placeholder">🗺️ Auto-filled from suburb</span>
            )}
          </div>
        </div>
      </div>

      {/* ── State grid ────────────────────────────────────────────── */}
      <div className="loc-divider">or tap your state directly</div>

      <div className="loc-state-grid">
        {AU_STATES.map(s => (
          <button
            key={s.value}
            type="button"
            className={`loc-state-btn ${formData.state === s.value ? 'selected' : ''}`}
            onClick={() => handleStateClick(s.value)}
          >
            <span className="loc-state-btn-code">{s.value}</span>
            <span className="loc-state-btn-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="step-nav">
        <div />
        <button className="btn btn-primary" onClick={onNext} disabled={!canContinue}>
          Next →
        </button>
      </div>
    </div>
  );
}
