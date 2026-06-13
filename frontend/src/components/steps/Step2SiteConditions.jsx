import { useState, useEffect } from 'react';

const SITE_OPTIONS = [
  {
    value: 'flat',
    icon: '🪨',
    label: 'Flat / Level',
    desc: 'Standard cut & fill, Class M/H1 soil',
    pill: 'Base rate',
    pillClass: 'site-pill--green',
  },
  {
    value: 'gentle_slope',
    icon: '📈',
    label: 'Gentle slope',
    desc: 'Up to 1m fall across block',
    pill: '+10–15%',
    pillClass: 'site-pill--amber',
  },
  {
    value: 'steep',
    icon: '⚠️',
    label: 'Steep / complex',
    desc: '2m+ fall, retaining walls needed',
    pill: '+18–25%',
    pillClass: 'site-pill--red',
  },
  {
    value: 'not_sure',
    icon: '❓',
    label: 'Not Sure',
    desc: "I'll confirm with a surveyor",
    pill: 'Mid range used',
    pillClass: 'site-pill--grey',
  },
];

export default function Step2SiteConditions({ formData, update, onNext, onBack }) {
  const [guidance, setGuidance]   = useState(null);  // { terrainNote, councilNote }
  const [loadingGuide, setLoading] = useState(false);

  // Fetch suburb-specific AI guidance when step mounts
  useEffect(() => {
    if (!formData.suburb || !formData.state) return;
    setLoading(true);
    fetch('/api/site-guidance', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ suburb: formData.suburb, state: formData.state }),
    })
      .then(r => r.json())
      .then(data => { if (!data.error) setGuidance(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = formData.siteCondition || 'not_sure';

  return (
    <div>
      <div className="step-heading">
        <h2>What is your site like?</h2>
        <p>
          Site conditions significantly affect foundation and earthworks costs.
          If you're unsure, choose <strong>Not Sure</strong> — we'll use a mid-range
          estimate and your AI Copilot can help clarify.
        </p>
      </div>

      {/* ── Suburb guidance box ─────────────────────────────────────── */}
      {(loadingGuide || guidance) && (
        <div className="site-guidance-box">
          <span className="site-guidance-icon">ℹ️</span>
          {loadingGuide ? (
            <div className="site-guidance-loading">
              <span className="site-guidance-dot" />
              <span className="site-guidance-dot" />
              <span className="site-guidance-dot" />
              <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Loading {formData.suburb} site notes…
              </span>
            </div>
          ) : (
            <div className="site-guidance-content">
              {guidance.terrainNote && (
                <p className="site-guidance-terrain">{guidance.terrainNote}</p>
              )}
              {guidance.councilNote && (
                <div className="site-guidance-council">
                  <span className="site-guidance-council-label">
                    {formData.suburb ? `${formData.state} Council note` : 'Council note'}
                  </span>
                  <p>{guidance.councilNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Site condition cards ────────────────────────────────────── */}
      <div className="site-grid">
        {SITE_OPTIONS.map(opt => (
          <div
            key={opt.value}
            className={`storey-card site-card ${selected === opt.value ? 'selected' : ''}`}
            onClick={() => update('siteCondition', opt.value)}
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

      {/* ── AI hint ────────────────────────────────────────────────── */}
      <p className="site-ai-hint">
        💬 Not sure what applies to your block?{' '}
        <span className="site-ai-hint-em">Ask the Homeygo AI Copilot</span> on the right — describe your block and it'll guide you.
      </p>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}
