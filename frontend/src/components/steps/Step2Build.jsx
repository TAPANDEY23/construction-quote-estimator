import { getCouncilData } from '../../data/councils';

// B2: land quick-selects
const LAND_PICKS = [
  { label: 'Townhouse',   m2: 250, icon: '🏙️' },
  { label: 'Small block', m2: 350, icon: '🏠' },
  { label: 'Standard',    m2: 450, icon: '🏡' },
  { label: 'Family',      m2: 600, icon: '🏘️' },
  { label: 'Large',       m2: 800, icon: '🌳' },
];

const HOUSE_PICKS = [
  { label: '3-bed starter', m2: 150, icon: '🏠' },
  { label: '3-bed family',  m2: 185, icon: '🏡' },
  { label: '4-bed family',  m2: 230, icon: '🏘️' },
  { label: '4-bed exec',    m2: 285, icon: '🏛️' },
  { label: '5-bed luxury',  m2: 355, icon: '🏰' },
];

export default function Step2Build({ formData, update, onNext, onBack }) {
  const landSize  = Number(formData.landSize)  || 0;
  const houseSize = Number(formData.houseSize) || 200;
  const storeys   = formData.storeys || 1;

  // Council FSR + coverage data
  const council = getCouncilData(formData.postcode, formData.state);

  // B4: GFA cap = MIN(FSR × land, coverage × storeys × land)
  const maxByFSR      = landSize ? Math.floor(landSize * council.fsr) : null;
  const maxByCoverage = landSize ? Math.floor(council.coverage * storeys * landSize) : null;
  const maxFloor      = (maxByFSR && maxByCoverage) ? Math.min(maxByFSR, maxByCoverage) : (maxByFSR || null);

  // B5: per-storey GFA caps displayed in storey cards
  const maxSingle = landSize ? Math.min(
    Math.floor(landSize * council.fsr),
    Math.floor(council.coverage * 1 * landSize)
  ) : null;
  const maxDouble = landSize ? Math.min(
    Math.floor(landSize * council.fsr),
    Math.floor(council.coverage * 2 * landSize)
  ) : null;

  // Slider cap: FSR max, clamped between 200 and 600
  const sliderHouseMax   = maxFloor ? Math.min(600, Math.max(200, maxFloor)) : 600;
  const sliderHouseValue = Math.min(houseSize, sliderHouseMax);

  // FSR usage
  const fsrRatio   = maxFloor ? houseSize / maxFloor : null;
  const fsrPct     = fsrRatio ? Math.min(fsrRatio * 100, 100) : 0;
  const fsrWarning = fsrRatio !== null && fsrRatio >= 0.85 && fsrRatio < 1.0;
  const fsrOver    = fsrRatio !== null && fsrRatio >= 1.0;

  // B3: block Next when FSR exceeded
  const canContinue = formData.landSize && formData.houseSize && !fsrOver;

  return (
    <div>
      <div className="step-heading">
        <h2>Land &amp; house size</h2>
        <p>These measurements are the biggest driver of your build cost.</p>
      </div>

      {/* B2: land quick-selects */}
      <div className="quick-picks-section">
        <div className="quick-picks-label">Common block sizes — tap to pre-fill</div>
        <div className="quick-picks-row">
          {LAND_PICKS.map(p => (
            <button
              key={p.m2}
              className={`quick-pick-btn${landSize === p.m2 ? ' selected' : ''}`}
              onClick={() => update('landSize', p.m2)}
            >
              <span className="qp-icon">{p.icon}</span>
              <span className="qp-label">{p.label}</span>
              <span className="qp-m2">{p.m2} m²</span>
            </button>
          ))}
        </div>
      </div>

      <SizeSlider
        label="Land Size — Total lot / block area"
        value={landSize || 600}
        onChange={v => update('landSize', v)}
        min={100} max={5000} step={50}
        minLabel="100m²" midLabel="2,500m²" maxLabel="5,000m²"
      />

      {landSize > 0 && maxFloor && (
        <FSRBar
          council={council}
          maxFloor={maxFloor}
          fsrPct={fsrPct}
          fsrWarning={fsrWarning}
          fsrOver={fsrOver}
        />
      )}

      <div className="quick-picks-section">
        <div className="quick-picks-label">Common sizes — tap to pre-fill</div>
        <div className="quick-picks-row">
          {HOUSE_PICKS.map(p => {
            const overLimit = maxFloor !== null && p.m2 > maxFloor;
            return (
              <button
                key={p.m2}
                className={`quick-pick-btn${houseSize === p.m2 ? ' selected' : ''}${overLimit ? ' over-limit' : ''}`}
                onClick={() => { if (!overLimit) update('houseSize', p.m2); }}
                disabled={overLimit}
                title={overLimit ? `Exceeds FSR limit of ${maxFloor} m²` : undefined}
              >
                <span className="qp-icon">{p.icon}</span>
                <span className="qp-label">{p.label}</span>
                <span className="qp-m2">{p.m2} m²</span>
              </button>
            );
          })}
        </div>
      </div>

      <SizeSlider
        label="House Floor Area — Biggest cost driver"
        value={sliderHouseValue}
        onChange={v => update('houseSize', v)}
        min={80}
        max={sliderHouseMax}
        step={10}
        minLabel="80m²"
        midLabel={`${Math.round(sliderHouseMax / 2)} m²`}
        maxLabel={`${sliderHouseMax.toLocaleString()} m²${maxFloor && sliderHouseMax < 600 ? ' (FSR cap)' : ''}`}
        hint="Typical: 150–220m² for 3–4 bed · 250–350m² for 4–5 bed"
      />

      {fsrWarning && (
        <div className="fsr-alert fsr-alert--warn">
          ⚠️ Approaching planning limit — {houseSize.toLocaleString()} m² is {Math.round(fsrRatio * 100)}% of the{' '}
          {maxFloor.toLocaleString()} m² GFA maximum. Some councils allow variation; confirm with your town planner.
        </div>
      )}

      {fsrOver && (
        <div className="fsr-alert fsr-alert--over">
          🚫 Exceeds planning limit — {houseSize.toLocaleString()} m² is over the {maxFloor.toLocaleString()} m² GFA
          maximum for this block. Reduce house size or seek a planning variation.
        </div>
      )}

      <div className="form-group">
        <label>Number of storeys</label>
        <div className="storey-grid">
          {[
            {
              value: 1,
              icon: '🏠',
              label: 'Single storey',
              desc: maxSingle ? `All rooms on one level · max ${maxSingle.toLocaleString()} m²` : 'All rooms on one level',
              pill: 'Base rate',
              pillClass: 'storey-pill--green',
            },
            {
              value: 2,
              icon: '🏢',
              label: 'Double storey',
              desc: maxDouble ? `Two levels · max ${maxDouble.toLocaleString()} m²` : 'Two levels',
              pill: '+5–10% on rate',
              pillClass: 'storey-pill--amber',
            },
          ].map(opt => (
            <div
              key={opt.value}
              className={`storey-card${formData.storeys === opt.value ? ' selected' : ''}`}
              onClick={() => update('storeys', opt.value)}
            >
              <div className="storey-card-top">
                <span className="storey-card-icon">{opt.icon}</span>
                <div>
                  <div className="storey-card-title">{opt.label}</div>
                  <div className="storey-card-desc">{opt.desc}</div>
                </div>
              </div>
              <span className={`storey-pill ${opt.pillClass}`}>{opt.pill}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext} disabled={!canContinue}>
          Next →
        </button>
      </div>
    </div>
  );
}

function FSRBar({ council, maxFloor, fsrPct, fsrWarning, fsrOver }) {
  return (
    <div className="fsr-bar-wrap">
      <div className="fsr-bar-header">
        <span className="fsr-bar-label">
          Planning limit{council.council ? ` · ${council.council}` : ''}
          {council.approx ? <span className="fsr-approx"> (approx)</span> : null}
        </span>
        <span className="fsr-bar-ratio">FSR {council.fsr}× · max {maxFloor.toLocaleString()} m²</span>
      </div>
      <div className="fsr-bar-track">
        <div
          className={`fsr-bar-fill${fsrWarning ? ' fsr-bar-fill--warn' : ''}${fsrOver ? ' fsr-bar-fill--over' : ''}`}
          style={{ width: `${fsrPct}%` }}
        />
      </div>
      <div className="fsr-bar-marks">
        <span>0</span>
        <span>{Math.round(maxFloor / 2).toLocaleString()} m²</span>
        <span>{maxFloor.toLocaleString()} m² limit</span>
      </div>
    </div>
  );
}

function SizeSlider({ label, value, onChange, min, max, step, minLabel, midLabel, maxLabel, hint }) {
  const pct = ((value - min) / (max - min)) * 100;
  const trackStyle = {
    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.12) 100%)`,
  };

  return (
    <div className="size-slider-group">
      <div className="size-slider-label">{label}</div>
      <div className="size-slider-value">
        <span className="size-slider-num">{value.toLocaleString()}</span>
        <span className="size-slider-unit"> m²</span>
      </div>
      <input
        type="range"
        className="size-slider-input"
        min={min} max={max} step={step} value={value}
        style={trackStyle}
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className="size-slider-marks">
        <span>{minLabel}</span>
        <span>{midLabel}</span>
        <span>{maxLabel}</span>
      </div>
      {hint && <p className="size-slider-hint">{hint}</p>}
    </div>
  );
}
