// ── Slideshow ─────────────────────────────────────────────────────────────────
(function () {
  const slides    = document.querySelectorAll('.slide');
  const dots      = document.querySelectorAll('.slide-dot');
  const captions  = document.querySelectorAll('.slide-caption');
  let   current   = 0;
  let   timer     = null;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    captions[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    captions[current].classList.add('active');
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startTimer(); });
  });

  startTimer();
})();

// ── DOM refs — launcher ───────────────────────────────────────────────────────
const btn          = document.getElementById('launch-btn');
const btnLabel     = document.getElementById('btn-label');
const btnIcon      = document.getElementById('btn-icon');
const statusCard   = document.getElementById('status-card');
const statusDot    = document.getElementById('status-dot');
const statusText   = document.getElementById('status-text');
const openLink     = document.getElementById('open-link');
const progressWrap = document.getElementById('progress-wrap');
const progressFill = document.getElementById('progress-fill');
const progressMsg  = document.getElementById('progress-msg');
const progStep1    = document.getElementById('prog-step-1');
const progStep2    = document.getElementById('prog-step-2');
const progStep3    = document.getElementById('prog-step-3');

// ── DOM refs — registration modal ────────────────────────────────────────────
const regOverlay    = document.getElementById('reg-overlay');
const regForm       = document.getElementById('reg-form');
const regSubmit     = document.getElementById('reg-submit');
const regSubmitLbl  = document.getElementById('reg-submit-label');
const regSubmitArr  = document.getElementById('reg-submit-arrow');
const regSkip       = document.getElementById('reg-skip');
const regModalBody  = document.querySelector('.reg-modal-body');
const regSuccess    = document.getElementById('reg-success');
const regSuccessMsg = document.getElementById('reg-success-msg');

const fName  = document.getElementById('reg-name');
const fEmail = document.getElementById('reg-email');
const fPhone = document.getElementById('reg-phone');
const fTc    = document.getElementById('reg-tc');
const fTcWrap = document.getElementById('reg-tc-wrap');

const errName  = document.getElementById('err-name');
const errEmail = document.getElementById('err-email');
const errPhone = document.getElementById('err-phone');
const errTc    = document.getElementById('err-tc');

// ── State ─────────────────────────────────────────────────────────────────────
let isEstimatorRunning = false;
let isLaunching        = false;
let statusPollId       = null;
let registeredName     = '';   // set after successful registration
let registeredEmail    = '';   // forwarded to estimator URL for SQLite registration
let registeredPhone    = '';   // forwarded to estimator URL
// pendingAction is set before showing the modal so we know what to do after
let pendingAction      = null; // 'open' | 'launch'

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const tick  = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  };
  requestAnimationFrame(tick);
}
setTimeout(() => {
  document.querySelectorAll('.stat-num').forEach(el =>
    animateCounter(el, parseInt(el.dataset.target, 10))
  );
}, 400);

// ── Registration modal ────────────────────────────────────────────────────────
function openModal() {
  // ── Reset to form state (in case a previous success panel is showing) ──────
  regSuccess.style.display  = 'none';
  regForm.style.display     = '';
  regForm.reset();
  clearErrors();
  regSubmit.disabled        = false;
  regSubmitLbl.textContent  = 'Continue to Estimator';
  regSubmitArr.textContent  = '→';
  regSubmit.classList.remove('loading');

  regOverlay.classList.add('open');
  // Focus first field after transition
  setTimeout(() => fName.focus(), 350);
}

function closeModal() {
  regOverlay.classList.remove('open');
}

// Close on overlay click (outside the modal card)
regOverlay.addEventListener('click', (e) => {
  if (e.target === regOverlay) closeModal();
});

// Escape key closes modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && regOverlay.classList.contains('open')) closeModal();
});

// ── Validation ────────────────────────────────────────────────────────────────
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validatePhone(v) {
  return /^[\d\s\+\-\(\)]{7,}$/.test(v.trim());
}

function clearErrors() {
  [fName, fEmail, fPhone].forEach(f => f.classList.remove('invalid'));
  fTcWrap.classList.remove('invalid');
  [errName, errEmail, errPhone, errTc].forEach(e => (e.textContent = ''));
}

function validateForm() {
  clearErrors();
  let ok = true;

  if (!fName.value.trim()) {
    fName.classList.add('invalid');
    errName.textContent = 'Full name is required.';
    ok = false;
  }

  if (!fEmail.value.trim()) {
    fEmail.classList.add('invalid');
    errEmail.textContent = 'Email address is required.';
    ok = false;
  } else if (!validateEmail(fEmail.value)) {
    fEmail.classList.add('invalid');
    errEmail.textContent = 'Please enter a valid email address.';
    ok = false;
  }

  if (!fPhone.value.trim()) {
    fPhone.classList.add('invalid');
    errPhone.textContent = 'Contact number is required.';
    ok = false;
  } else if (!validatePhone(fPhone.value)) {
    fPhone.classList.add('invalid');
    errPhone.textContent = 'Please enter a valid phone number.';
    ok = false;
  }

  if (!fTc.checked) {
    fTcWrap.classList.add('invalid');
    errTc.textContent = 'You must accept the terms to continue.';
    ok = false;
  }

  return ok;
}

// Clear field error on input
[fName, fEmail, fPhone].forEach(f => {
  f.addEventListener('input', () => {
    f.classList.remove('invalid');
    document.getElementById('err-' + f.id.replace('reg-', '')).textContent = '';
  });
});
fTc.addEventListener('change', () => {
  fTcWrap.classList.remove('invalid');
  errTc.textContent = '';
});

// ── Form submit ───────────────────────────────────────────────────────────────
regForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  // Loading state
  regSubmit.disabled = true;
  regSubmitLbl.textContent = 'Saving your details';
  regSubmitArr.textContent = '';
  regSubmit.classList.add('loading');

  try {
    const res = await fetch('/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:  fName.value.trim(),
        email: fEmail.value.trim(),
        phone: fPhone.value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Registration failed');

    // Capture registration details — forwarded to estimator URL so the
    // frontend can register the user in the SQLite DB (port 3001) as well.
    registeredName  = fName.value.trim();
    registeredEmail = fEmail.value.trim();
    registeredPhone = fPhone.value.trim();

    // Show success state (toggle divs — does NOT break event listeners)
    regSuccessMsg.innerHTML = `Thanks, <strong>${escHtml(registeredName)}</strong>! Building vendors will reach out via <strong>${escHtml(registeredEmail)}</strong> with relevant quotes.`;
    regForm.style.display    = 'none';
    regSuccess.style.display = '';

    await sleep(1800);
    closeModal();
    await sleep(300);
    executePendingAction();

  } catch (err) {
    regSubmit.disabled = false;
    regSubmitLbl.textContent = 'Continue to Estimator';
    regSubmitArr.textContent = '→';
    regSubmit.classList.remove('loading');
    errTc.textContent = err.message || 'Something went wrong. Please try again.';
  }
});

// ── Skip ──────────────────────────────────────────────────────────────────────
regSkip.addEventListener('click', () => {
  closeModal();
  setTimeout(executePendingAction, 300);
});

// ── Build estimator URL — passes name + email + phone so the frontend can ──────
// call /api/register on the backend (port 3001) and save to SQLite.
function estimatorUrl() {
  const name = registeredName.trim();
  if (!name) return 'http://localhost:5173';
  let url = `http://localhost:5173?name=${encodeURIComponent(name)}`;
  if (registeredEmail) url += `&email=${encodeURIComponent(registeredEmail)}`;
  if (registeredPhone) url += `&phone=${encodeURIComponent(registeredPhone)}`;
  return url;
}

// ── Execute the deferred action ───────────────────────────────────────────────
function executePendingAction() {
  if (pendingAction === 'open') {
    window.open(estimatorUrl(), '_blank');
  } else if (pendingAction === 'launch') {
    launchEstimator();
  }
  pendingAction = null;
}

// ── Always show the registration modal on every "Open Estimator" click ────────
// Each click = a fresh registration (new user or repeat visitor).
// The DB stores every entry; the launcher JSON keeps a full lead log.
function requestEstimatorAccess(action) {
  pendingAction = action;
  openModal();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Status helpers ────────────────────────────────────────────────────────────
async function checkStatus() {
  try {
    const res  = await fetch('/status');
    const data = await res.json();
    return data.running;
  } catch { return false; }
}

function applyStatus(running) {
  isEstimatorRunning = running;
  if (running) {
    statusDot.className      = 'status-dot running';
    statusText.textContent   = 'Estimator is running';
    statusText.className     = 'status-text running-text';
    statusCard.classList.add('status-running');
    openLink.style.display   = 'inline';
    btn.disabled             = false;
    btn.classList.add('open-mode');
    btnIcon.textContent      = '🌐';
    btnLabel.textContent     = 'Open Estimator';
  } else {
    statusDot.className      = 'status-dot stopped';
    statusText.textContent   = 'Estimator is not running';
    statusText.className     = 'status-text';
    statusCard.classList.remove('status-running');
    openLink.style.display   = 'none';
    if (!isLaunching) {
      btn.disabled           = false;
      btn.classList.remove('open-mode');
      btnIcon.textContent    = '🚀';
      btnLabel.textContent   = 'Launch Estimator';
    }
  }
}

async function pollStatus() {
  statusDot.className    = 'status-dot checking';
  statusText.textContent = 'Checking status…';
  statusText.className   = 'status-text';
  applyStatus(await checkStatus());
}

pollStatus();
statusPollId = setInterval(pollStatus, 5000);

// ── Progress helpers ──────────────────────────────────────────────────────────
function setProgress(pct, msg, loading = true) {
  progressFill.style.width = pct + '%';
  progressMsg.textContent  = msg;
  progressMsg.className    = loading ? 'progress-msg loading' : 'progress-msg';
}

function setProgStep(step) {
  [progStep1, progStep2, progStep3].forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i < step - 1)   s.classList.add('done');
    if (i === step - 1) s.classList.add('active');
  });
  progressWrap.querySelectorAll('.prog-connector').forEach((c, i) => {
    c.classList.toggle('done', i < step - 1);
  });
}

function showProgress() { progressWrap.classList.add('visible'); setProgStep(1); }

function hideProgress() {
  progressWrap.classList.remove('visible');
  progressFill.style.width = '0%';
  progressMsg.textContent  = '';
  [progStep1, progStep2, progStep3].forEach(s => s.classList.remove('active', 'done'));
  progressWrap.querySelectorAll('.prog-connector').forEach(c => c.classList.remove('done'));
}

// ── Wait for estimator ────────────────────────────────────────────────────────
async function waitForEstimator(maxSeconds = 90) {
  for (let i = 0; i < maxSeconds; i++) {
    await sleep(1000);
    if (await checkStatus()) return true;
  }
  return false;
}

// ── Launch sequence (runs AFTER registration) ─────────────────────────────────
async function launchEstimator() {
  isLaunching  = true;
  btn.disabled = true;
  clearInterval(statusPollId);
  showProgress();

  setProgress(10, 'Sending launch command…');
  setProgStep(1);
  try {
    await fetch('/launch', { method: 'POST' });
  } catch {
    setProgress(0, 'Launch failed — server not reachable.', false);
    isLaunching  = false;
    btn.disabled = false;
    return;
  }

  setProgress(22, 'Starting backend server (port 3001)…');
  setProgStep(1);
  await sleep(2200);

  setProgress(40, 'Starting frontend (Vite, port 5173)…');
  setProgStep(2);
  await sleep(1600);

  setProgress(55, 'Waiting for Vite to compile…');
  const ready = await waitForEstimator(90);

  if (!ready) {
    setProgress(55, 'Could not reach estimator — check the terminal for errors.', false);
    isLaunching  = false;
    btn.disabled = false;
    statusPollId = setInterval(pollStatus, 5000);
    return;
  }

  setProgress(88, 'Opening estimator in browser…');
  setProgStep(3);
  await sleep(600);
  window.open(estimatorUrl(), '_blank');

  setProgress(100, 'Estimator launched successfully! ✓', false);
  await sleep(2000);

  isLaunching = false;
  hideProgress();
  applyStatus(true);
  statusPollId = setInterval(pollStatus, 5000);
}

// ── Button click — always goes through registration first ─────────────────────
btn.addEventListener('click', () => {
  if (isLaunching) return;
  if (isEstimatorRunning) {
    requestEstimatorAccess('open');
  } else {
    requestEstimatorAccess('launch');
  }
});

// ── "Open app ↗" link also goes through registration ─────────────────────────
openLink.addEventListener('click', (e) => {
  e.preventDefault();
  requestEstimatorAccess('open');
});

// ── Hover polish ──────────────────────────────────────────────────────────────
document.querySelectorAll('.how-step, .feature-card').forEach(el => {
  el.addEventListener('mouseenter', () => el.style.setProperty('will-change', 'transform'));
  el.addEventListener('mouseleave', () => el.style.removeProperty('will-change'));
});
