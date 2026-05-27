import { useState, useEffect } from 'react';
import WizardContainer from './components/WizardContainer';
import EstimateResult from './components/EstimateResult';
import CopilotChat from './components/CopilotChat';
import RegistrationForm from './components/RegistrationForm';

const INITIAL_FORM = {
  suburb: '',
  state: '',
  landSize: '',
  houseSize: '',
  storeys: 1,
  bedrooms: 4,
  bathrooms: 2,
  toilets: 2,
  study: false,
  garageType: 'single_garage',
  garageSpaces: 1,
  buildMethod: 'brick_veneer',
  designType: 'project_home',
  qualityTier: 'mid',
  kitchenFinish: 'standard',
  flooringType: 'mixed',
  landscaping: 'basic',
  pool: false,
  solar: false,
  ductedAC: false,
  alfresco: false,
  specialRequirements: '',
};

function getInitialPhase() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('name')?.trim()) return 'wizard';
  // Any user who has been here before (has a stored name) goes straight to the estimator.
  // New users (nothing stored) must register first.
  return localStorage.getItem('cqe_user_name') ? 'wizard' : 'registration';
}

export default function App() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [phase, setPhase] = useState(getInitialPhase);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // ── userName MUST initialise before userId so it can clear a stale id ────────
  // When the launcher passes ?name=&email=&phone= via URL, we detect whether
  // this is a different person than the last stored user. If so, we wipe the
  // stored cqe_user_id so the useEffect below re-registers them in SQLite.
  const [userName, setUserName] = useState(() => {
    const params       = new URLSearchParams(window.location.search);
    const fromUrl      = params.get('name')?.trim();
    const emailFromUrl = params.get('email')?.trim();
    const phoneFromUrl = params.get('phone')?.trim();

    if (fromUrl) {
      // If the incoming email differs from what's stored, the stored userId
      // belongs to a different person — clear it so the useEffect registers
      // this new user fresh.
      const storedEmail = localStorage.getItem('cqe_user_email');
      if (!storedEmail || (emailFromUrl && emailFromUrl !== storedEmail)) {
        localStorage.removeItem('cqe_user_id');
      }

      localStorage.setItem('cqe_user_name', fromUrl);
      if (emailFromUrl) localStorage.setItem('cqe_user_email', emailFromUrl);
      if (phoneFromUrl) localStorage.setItem('cqe_user_phone', phoneFromUrl);

      // Clean URL (remove query params so they don't persist on refresh)
      const clean = new URL(window.location.href);
      clean.searchParams.delete('name');
      clean.searchParams.delete('email');
      clean.searchParams.delete('phone');
      window.history.replaceState({}, '', clean);
      return fromUrl;
    }
    return localStorage.getItem('cqe_user_name') || '';
  });

  // ── userId reads localStorage AFTER userName may have cleared the stale id ───
  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem('cqe_user_id');
    return stored ? Number(stored) : null;
  });

  // ── Silent background registration: fires when name+email are known but ───────
  // no DB id exists yet (covers both the launcher URL path and direct visits).
  useEffect(() => {
    const name  = localStorage.getItem('cqe_user_name');
    const email = localStorage.getItem('cqe_user_email');
    const phone = localStorage.getItem('cqe_user_phone') || undefined;
    const id    = localStorage.getItem('cqe_user_id');
    if (name && email && !id) {
      const parts     = name.trim().split(' ');
      const firstName = parts[0] || name;
      const lastName  = parts.slice(1).join(' ') || '-';
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.userId) {
            setUserId(data.userId);
            localStorage.setItem('cqe_user_id', String(data.userId));
          }
        })
        .catch(() => {}); // silent — never interrupts the user
    }
  }, []);

  /** Called by RegistrationForm only after /api/register confirms the DB write */
  function handleRegistration({ userId: id, name, email }) {
    setUserId(id);
    setUserName(name);
    localStorage.setItem('cqe_user_name', name);
    localStorage.setItem('cqe_user_id', String(id));
    localStorage.setItem('cqe_user_email', email);
    setPhase('wizard'); // DB write already confirmed — safe to proceed
  }

  const handleSubmit = async () => {
    setPhase('loading');
    setError(null);
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Unknown error from server');
      setEstimate(data.estimate);

      // Save estimate to DB (non-blocking — best effort)
      fetch('/api/save-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, formData, estimate: data.estimate }),
      }).catch(() => {});

      setPhase('result');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleRestart = () => {
    setFormData(INITIAL_FORM);
    setEstimate(null);
    setError(null);
    setCurrentStep(1);
    // Known users go back to estimator; brand-new users go back to registration
    setPhase(localStorage.getItem('cqe_user_name') ? 'wizard' : 'registration');
  };

  const showCopilot = phase === 'wizard' || phase === 'error';

  /* ── Registration (new users only — shown once until DB write succeeds) ────── */
  if (phase === 'registration') {
    return (
      <>
        <header className="app-header">
          <span style={{ fontSize: '1.4rem' }}>🏗️</span>
          <h1>Construction Cost Estimator</h1>
          <span className="tagline">AI-powered · Australian market · Instant results</span>
        </header>
        <RegistrationForm onComplete={handleRegistration} />
      </>
    );
  }

  /* ── Estimator (wizard / loading / error / result) ────────────────────────── */
  return (
    <>
      <header className="app-header">
        <span style={{ fontSize: '1.4rem' }}>🏗️</span>
        <h1>Construction Cost Estimator</h1>
        <span className="tagline">AI-powered · Australian market · Instant results</span>
      </header>

      {phase === 'result' && (
        <main className="app-main app-main--result">
          <EstimateResult
            estimate={estimate}
            formData={formData}
            onRestart={handleRestart}
            userName={userName}
          />
        </main>
      )}

      {phase !== 'result' && (
        <main className={`app-main${showCopilot ? ' app-main--split' : ''}`}>
          <div className="wizard-panel">
            <div className="card">
              {phase === 'wizard' && (
                <WizardContainer
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleSubmit}
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                />
              )}
              {phase === 'loading' && <LoadingScreen />}
              {phase === 'error' && (
                <div className="error-box">
                  <h3>Unable to Generate Estimate</h3>
                  <p>{error}</p>
                  <button className="btn btn-primary" onClick={handleRestart}>Try Again</button>
                </div>
              )}
            </div>
          </div>
          {showCopilot && (
            <div className="copilot-side">
              <CopilotChat
                formData={formData}
                estimate={null}
                isFloating={false}
                currentStep={currentStep}
                userName={userName}
              />
            </div>
          )}
        </main>
      )}
    </>
  );
}

/* ── Loading screen ───────────────────────────────────────────────────────── */
const LOADING_MESSAGES = [
  { icon: '📍', text: 'Analysing location & market conditions...' },
  { icon: '📐', text: 'Calculating structural requirements...' },
  { icon: '🏠', text: 'Estimating materials & labour costs...' },
  { icon: '💰', text: 'Applying contractor margins & fees...' },
  { icon: '📊', text: 'Preparing detailed breakdown...' },
];

function LoadingScreen() {
  const [visibleCount, setVisibleCount] = useState(1);

  useState(() => {
    let i = 1;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= LOADING_MESSAGES.length) clearInterval(interval);
    }, 1800);
    return () => clearInterval(interval);
  });

  return (
    <div className="loading-wrapper">
      <div className="loading-spinner" />
      <div className="loading-title">Generating Your Estimate</div>
      <div className="loading-sub">
        Our AI is analysing your project against current Australian construction market data.
      </div>
      <div className="loading-steps">
        {LOADING_MESSAGES.slice(0, visibleCount).map((msg, i) => (
          <div
            key={i}
            className={`loading-step ${i === visibleCount - 1 ? 'active' : ''}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span>{msg.icon}</span>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
