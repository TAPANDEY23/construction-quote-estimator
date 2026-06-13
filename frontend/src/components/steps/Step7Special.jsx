const SUGGESTIONS = [
  'Sloping block / cut and fill required',
  'BAL (Bushfire Attack Level) rated construction',
  'Heritage overlay or heritage-adjacent site',
  'Flood zone / overland flow path',
  'Underground power connection required',
  'Basement or undercroft',
  'Home lift / elevator',
  'Passive house / high energy efficiency rating',
  'Off-grid solar + battery system',
];

export default function Step7Special({ formData, update, onBack, onSubmit }) {
  const addSuggestion = (text) => {
    const current = formData.specialRequirements.trim();
    update('specialRequirements', current ? `${current}\n${text}` : text);
  };

  return (
    <div>
      <div className="step-heading">
        <h2>Special requirements</h2>
        <p>Any site constraints, council overlays, or special features? These can significantly affect cost. You can skip this step if nothing applies.</p>
      </div>

      <div className="form-group">
        <label>Special requirements (optional)</label>
        <textarea
          placeholder="e.g. Sloping block requiring retaining walls, BAL-29 rated construction, heritage area restrictions..."
          value={formData.specialRequirements}
          onChange={e => update('specialRequirements', e.target.value)}
          rows={4}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
          Quick add (click to add to notes):
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => addSuggestion(s)}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                borderRadius: 99,
                border: '1px solid rgba(245,158,11,0.35)',
                background: 'rgba(245,158,11,0.1)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.82)',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(245,158,11,0.25)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = '#fbbf24';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
                e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.82)';
              }}
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary btn-large" onClick={onSubmit}>
          Generate Estimate 🏗️
        </button>
      </div>
    </div>
  );
}
