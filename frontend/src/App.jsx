import { useState, useEffect } from 'react';
import WizardContainer from './components/WizardContainer';
import EstimateResult from './components/EstimateResult';
import CopilotChat from './components/CopilotChat';
import RegistrationForm from './components/RegistrationForm';

const INITIAL_FORM = {
  suburb: '',
  state: '',
  postcode: '',
  siteCondition: 'not_sure',
  landSize: '',
  houseSize: '',
  storeys: 1,
  bedrooms: 4,
  bathrooms: 2,
  toilets: 2,
  study: false,
  garageType: 'single_garage',
  garageSpaces: 1,
  qualityTier: 'mid',
  kitchenFinish: 'standard',
  flooringType: 'mixed',
  landscaping: 'basic',
  pool: false,
  solar: false,
  ductedAC: false,
  alfresco: false,
  specialRequirements: '',
  // Category A — new fields
  roofType:      'colorbond',
  ceilingHeight: 'standard',
  glazingType:   'single_aluminium',
  livingAreas:   'open_plan',
  laundryType:   'standard',
  // Category B — new fields
  ensuites:           1,
  pantry:             false,
  facadeType:         'brick_veneer',
  homeTheatre:        false,
  walkInRobe:         false,
  smartHome:          false,
  homeLift:           false,
  fireplace:          false,
  prayerRoom:         false,
  extraGuestBedroom:  false,
};

function getInitialPhase() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('name')?.trim()) return 'wizard';
  // ?reset=1 clears stored identity and forces registration page
  if (params.get('reset') === '1') {
    ['cqe_user_name', 'cqe_user_id', 'cqe_user_email', 'cqe_user_phone'].forEach(k => localStorage.removeItem(k));
    const clean = new URL(window.location.href);
    clean.searchParams.delete('reset');
    window.history.replaceState({}, '', clean);
    return 'registration';
  }
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
      <div className="reg-split-layout">
        <RegistrationImagePanel />
        <div className="reg-split-right">
          <header className="app-header">
            <span style={{ fontSize: '1.4rem' }}>🏗️</span>
            <h1>Construction Cost Estimator</h1>
            <span className="tagline">Homeygo AI · Australian market · Instant results</span>
          </header>
          <RegistrationForm onComplete={handleRegistration} />
        </div>
      </div>
    );
  }

  /* ── Estimator (wizard / loading / error / result) ────────────────────────── */
  return (
    <>
      <header className="app-header">
        <span style={{ fontSize: '1.4rem' }}>🏗️</span>
        <h1>Construction Cost Estimator</h1>
        <span className="tagline">Homeygo AI · Australian market · Instant results</span>
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

/* ── Registration image slider ────────────────────────────────────────────── */
const SLIDES = [
  {
    url: 'https://images.pexels.com/photos/209266/pexels-photo-209266.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    caption: 'Timber frame — new residential build in progress',
  },
  {
    url: 'https://images.pexels.com/photos/37627540/pexels-photo-37627540.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    caption: 'Two-storey home — wall framing & structural stage',
  },
  {
    url: 'https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    caption: 'Residential development — construction & crane lift',
  },
];

function RegistrationImagePanel() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveSlide(prev => (prev + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="reg-image-panel">
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className={`reg-slide${i === activeSlide ? ' active' : ''}`}
          style={{ backgroundImage: `url('${slide.url}')` }}
        />
      ))}
      <div className="reg-slide-overlay" />
      <div className="reg-slide-brand">
        <span style={{ fontSize: '1.2rem' }}>🏗️</span>
        <span className="reg-slide-brand-text">Built in Australia</span>
      </div>
      <div className="reg-slide-tagline">
        <div className="reg-slide-tagline-title">Estimate your build<br />with AI confidence</div>
        <div className="reg-slide-tagline-sub">Australian pricing · 2024–2025</div>
      </div>
      <div className="reg-slide-captions">
        {SLIDES.map((slide, i) => (
          <div key={i} className={`reg-slide-caption${i === activeSlide ? ' active' : ''}`}>
            {slide.caption}
          </div>
        ))}
      </div>
      <div className="reg-slide-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`reg-slide-dot${i === activeSlide ? ' active' : ''}`}
            onClick={() => setActiveSlide(i)}
            aria-label={`Photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
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
  const allDone = visibleCount >= LOADING_MESSAGES.length;

  useEffect(() => {
    if (allDone) return;
    const interval = setInterval(() => {
      setVisibleCount(prev => {
        const next = prev + 1;
        if (next >= LOADING_MESSAGES.length) clearInterval(interval);
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-wrapper">
      <div className="loading-spinner" />
      <div className="loading-title">Generating Your Estimate</div>
      <div className="loading-sub">
        Our AI is analysing your project against current Australian construction market data.
      </div>
      <div className="loading-steps">
        {LOADING_MESSAGES.map((msg, i) => (
          i < visibleCount ? (
            <div
              key={i}
              className={`loading-step ${!allDone && i === visibleCount - 1 ? 'active' : 'done'}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span>{allDone || i < visibleCount - 1 ? '✓' : msg.icon}</span>
              <span>{msg.text}</span>
            </div>
          ) : null
        ))}
        {allDone && (
          <div className="loading-step loading-step--finalising">
            <span>⏳</span>
            <span>Finalising your report…</span>
          </div>
        )}
      </div>
    </div>
  );
}
