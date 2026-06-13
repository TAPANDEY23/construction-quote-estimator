const LIVING_OPTIONS = [
  {
    value: 'open_plan',
    name: 'Open-plan',
    sub: 'Kitchen, dining and living flow together — dashed lines show no walls between spaces',
    pill: 'Base rate',
    pillClass: 'storey-pill--green',
    svg: (
      <svg width="100%" viewBox="0 0 100 74" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="94" height="68" rx="3" fill="rgba(99,102,241,0.15)" stroke="#818cf8" strokeWidth="1.5"/>
        <text x="50" y="19" textAnchor="middle" fontSize="8" fontWeight="700" fill="#a5b4fc">KITCHEN</text>
        <line x1="3" y1="27" x2="97" y2="27" stroke="#818cf8" strokeWidth=".8" strokeDasharray="4 2" opacity=".6"/>
        <text x="50" y="40" textAnchor="middle" fontSize="8" fontWeight="700" fill="#a5b4fc">DINING</text>
        <line x1="3" y1="49" x2="97" y2="49" stroke="#818cf8" strokeWidth=".8" strokeDasharray="4 2" opacity=".6"/>
        <text x="50" y="63" textAnchor="middle" fontSize="8" fontWeight="700" fill="#a5b4fc">LIVING ROOM</text>
      </svg>
    ),
  },
  {
    value: 'plus_lounge',
    name: '+ Separate lounge',
    sub: 'Open-plan core plus a walled lounge room with its own door',
    pill: '+$12–20K',
    pillClass: 'storey-pill--amber',
    svg: (
      <svg width="100%" viewBox="0 0 100 74" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="58" height="68" rx="3" fill="rgba(34,197,94,0.12)" stroke="#4ade80" strokeWidth="1.5"/>
        <text x="32" y="17" textAnchor="middle" fontSize="7" fontWeight="700" fill="#86efac">KITCHEN</text>
        <line x1="3" y1="25" x2="61" y2="25" stroke="#4ade80" strokeWidth=".7" strokeDasharray="3 2" opacity=".6"/>
        <text x="32" y="37" textAnchor="middle" fontSize="7" fontWeight="700" fill="#86efac">DINING</text>
        <line x1="3" y1="46" x2="61" y2="46" stroke="#4ade80" strokeWidth=".7" strokeDasharray="3 2" opacity=".6"/>
        <text x="32" y="61" textAnchor="middle" fontSize="7" fontWeight="700" fill="#86efac">LIVING ROOM</text>
        <rect x="64" y="3" width="33" height="68" rx="3" fill="rgba(148,163,184,0.1)" stroke="#64748b" strokeWidth="1.5"/>
        <text x="80" y="34" textAnchor="middle" fontSize="7" fontWeight="700" fill="#94a3b8">SEPARATE</text>
        <text x="80" y="43" textAnchor="middle" fontSize="7" fontWeight="700" fill="#94a3b8">LOUNGE</text>
        <rect x="58" y="32" width="10" height="8" rx="1" fill="#1e293b" stroke="#64748b" strokeWidth=".8"/>
        <path d="M58 36 Q63 32 68 36" fill="none" stroke="#64748b" strokeWidth=".6"/>
      </svg>
    ),
  },
  {
    value: 'plus_formal',
    name: '+ Formal dining + lounge',
    sub: 'Three distinct living spaces — best for larger families and entertaining',
    pill: '+$25–40K',
    pillClass: 'storey-pill--amber',
    svg: (
      <svg width="100%" viewBox="0 0 100 74" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="42" height="68" rx="3" fill="rgba(34,197,94,0.12)" stroke="#4ade80" strokeWidth="1.5"/>
        <text x="24" y="16" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#86efac">KITCHEN</text>
        <line x1="3" y1="24" x2="45" y2="24" stroke="#4ade80" strokeWidth=".7" strokeDasharray="3 2" opacity=".6"/>
        <text x="24" y="35" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#86efac">DINING</text>
        <line x1="3" y1="44" x2="45" y2="44" stroke="#4ade80" strokeWidth=".7" strokeDasharray="3 2" opacity=".6"/>
        <text x="24" y="60" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#86efac">LIVING</text>
        <rect x="48" y="3" width="22" height="68" rx="3" fill="rgba(245,158,11,0.1)" stroke="#f59e0b" strokeWidth="1.5"/>
        <text x="59" y="36" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fbbf24">FORMAL</text>
        <text x="59" y="44" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fbbf24">DINING</text>
        <rect x="43" y="33" width="9" height="8" rx="1" fill="#1e293b" stroke="#f59e0b" strokeWidth=".8"/>
        <path d="M43 37 Q47.5 33 52 37" fill="none" stroke="#f59e0b" strokeWidth=".6"/>
        <rect x="73" y="3" width="24" height="68" rx="3" fill="rgba(148,163,184,0.1)" stroke="#64748b" strokeWidth="1.5"/>
        <text x="85" y="36" textAnchor="middle" fontSize="6" fontWeight="700" fill="#94a3b8">FORMAL</text>
        <text x="85" y="44" textAnchor="middle" fontSize="6" fontWeight="700" fill="#94a3b8">LOUNGE</text>
        <rect x="68" y="33" width="9" height="8" rx="1" fill="#1e293b" stroke="#64748b" strokeWidth=".8"/>
        <path d="M68 37 Q72.5 33 77 37" fill="none" stroke="#64748b" strokeWidth=".6"/>
      </svg>
    ),
  },
];

export default function StepLivingAreas({ formData, update, onNext, onBack }) {
  const selected = formData.livingAreas || 'open_plan';

  return (
    <div>
      <div className="step-heading">
        <h2>Living areas</h2>
        <p>How many distinct living spaces does your home need? Dining is included in all options — choose the layout that suits your lifestyle.</p>
      </div>

      <div className="living-grid">
        {LIVING_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`living-card${selected === opt.value ? ' selected' : ''}`}
            onClick={() => update('livingAreas', opt.value)}
          >
            <div className="living-card-svg">{opt.svg}</div>
            <div className="living-card-body">
              <div className="living-card-name">{opt.name}</div>
              <div className="living-card-sub">{opt.sub}</div>
              <div className="living-card-footer">
                <span className={`storey-pill ${opt.pillClass}`}>{opt.pill}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
