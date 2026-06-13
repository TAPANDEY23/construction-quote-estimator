import { useState, useEffect, useRef } from 'react';

function isValidEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw || '').trim());
}

function isValidAuMobile(raw) {
  const d = String(raw || '').replace(/[\s\-().]/g, '').replace(/^\+/, '');
  return /^(614\d{8}|04\d{8})$/.test(d);
}

export default function RegistrationForm({ onComplete }) {
  // Feature flags — fetched from backend on mount so .env controls everything
  const [verifyConfig, setVerifyConfig] = useState({ emailVerification: true, phoneVerification: true });

  useEffect(() => {
    fetch('/api/verification-config')
      .then(r => r.json())
      .then(data => setVerifyConfig(data))
      .catch(() => {}); // keep defaults on network error
  }, []);

  const [form, setForm] = useState({
    firstName:     '',
    lastName:      '',
    email:         '',
    company:       '',
    phone:         '',
    termsAccepted: false,
  });
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [welcomeBack, setWelcomeBack] = useState(null);

  // ── Email verification ───────────────────────────────────────────────────────
  const [emailSending,      setEmailSending]      = useState(false);
  const [emailSendError,    setEmailSendError]    = useState('');
  const [emailCodeSent,     setEmailCodeSent]     = useState(false);
  const [emailCountdown,    setEmailCountdown]    = useState(0);
  const [emailOtp,          setEmailOtp]          = useState('');
  const [emailVerifying,    setEmailVerifying]    = useState(false);
  const [emailVerifyError,  setEmailVerifyError]  = useState('');
  const [emailVerified,     setEmailVerified]     = useState(false);

  // ── Phone verification ───────────────────────────────────────────────────────
  const [phoneSending,      setPhoneSending]      = useState(false);
  const [phoneSendError,    setPhoneSendError]    = useState('');
  const [phoneCodeSent,     setPhoneCodeSent]     = useState(false);
  const [phoneCountdown,    setPhoneCountdown]    = useState(0);
  const [phoneOtp,          setPhoneOtp]          = useState('');
  const [phoneVerifying,    setPhoneVerifying]    = useState(false);
  const [phoneVerifyError,  setPhoneVerifyError]  = useState('');
  const [phoneVerified,     setPhoneVerified]     = useState(false);

  // Countdown ticks
  useEffect(() => {
    if (emailCountdown <= 0) return;
    const t = setTimeout(() => setEmailCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCountdown]);

  useEffect(() => {
    if (phoneCountdown <= 0) return;
    const t = setTimeout(() => setPhoneCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCountdown]);

  // Welcome-back auto-redirect
  useEffect(() => {
    if (!welcomeBack) return;
    const t = setTimeout(() => onComplete(welcomeBack.payload), 2500);
    return () => clearTimeout(t);
  }, [welcomeBack]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function resetEmailVerification() {
    setEmailCodeSent(false);
    setEmailVerified(false);
    setEmailOtp('');
    setEmailSendError('');
    setEmailVerifyError('');
    setEmailCountdown(0);
  }

  function resetPhoneVerification() {
    setPhoneCodeSent(false);
    setPhoneVerified(false);
    setPhoneOtp('');
    setPhoneSendError('');
    setPhoneVerifyError('');
    setPhoneCountdown(0);
  }

  // ── Email send / verify ──────────────────────────────────────────────────────
  async function handleSendEmailCode() {
    setEmailSending(true);
    setEmailSendError('');
    try {
      const res  = await fetch('/api/send-email-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server error (${res.status}). Please try again.`);
      setEmailCodeSent(true);
      setEmailOtp('');
      setEmailVerifyError('');
      setEmailCountdown(60);
    } catch (err) {
      setEmailSendError(err.message);
    } finally {
      setEmailSending(false);
    }
  }

  async function handleVerifyEmailCode(codeOverride) {
    const code = codeOverride ?? emailOtp;
    if (code.length !== 4) return;
    setEmailVerifying(true);
    setEmailVerifyError('');
    try {
      const res  = await fetch('/api/verify-email-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server error (${res.status}). Please try again.`);
      setEmailVerified(true);
    } catch (err) {
      setEmailVerifyError(err.message);
      if (err.message.includes('expired') || err.message.includes('Too many')) {
        setEmailCodeSent(false);
        setEmailOtp('');
      }
    } finally {
      setEmailVerifying(false);
    }
  }

  // ── Phone send / verify ──────────────────────────────────────────────────────
  async function handleSendPhoneCode() {
    setPhoneSending(true);
    setPhoneSendError('');
    try {
      const res  = await fetch('/api/send-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: form.phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server error (${res.status}). Please try again.`);
      setPhoneCodeSent(true);
      setPhoneOtp('');
      setPhoneVerifyError('');
      setPhoneCountdown(60);
    } catch (err) {
      setPhoneSendError(err.message);
    } finally {
      setPhoneSending(false);
    }
  }

  async function handleVerifyPhoneCode(codeOverride) {
    const code = codeOverride ?? phoneOtp;
    if (code.length !== 4) return;
    setPhoneVerifying(true);
    setPhoneVerifyError('');
    try {
      const res  = await fetch('/api/verify-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: form.phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server error (${res.status}). Please try again.`);
      setPhoneVerified(true);
    } catch (err) {
      setPhoneVerifyError(err.message);
      if (err.message.includes('expired') || err.message.includes('Too many')) {
        setPhoneCodeSent(false);
        setPhoneOtp('');
      }
    } finally {
      setPhoneVerifying(false);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim()  &&
    form.email.trim()     &&
    form.termsAccepted    &&
    (!verifyConfig.emailVerification || emailVerified) &&
    (!verifyConfig.phoneVerification || phoneVerified);

  const submitHint =
    verifyConfig.emailVerification && !emailVerified ? 'Verify your email address above to continue' :
    verifyConfig.phoneVerification && !phoneVerified ? 'Verify your mobile number above to continue' :
    null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          company:   form.company.trim() || undefined,
          phone:     form.phone.trim()   || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Registration failed');
      if (data.alreadyRegistered) {
        setWelcomeBack({ name: data.name, payload: { userId: data.userId, name: data.name, email: form.email.trim() } });
      } else {
        onComplete({ userId: data.userId, name: data.name, email: form.email.trim() });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="registration-wrap">
      <div className="registration-card card">

        <div className="registration-header">
          <span className="registration-icon">🏗️</span>
          <h2>Welcome to the Construction Cost Estimator</h2>
          <p>Tell us a little about yourself — we'll save your estimate so you can reference it later.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Name ──────────────────────────────────────────────────────── */}
          <div className="form-row">
            <div className="form-group">
              <label>First Name <span className="reg-required">*</span></label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => update('firstName', e.target.value)}
                placeholder="e.g. Sarah"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Last Name <span className="reg-required">*</span></label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => update('lastName', e.target.value)}
                placeholder="e.g. Thompson"
              />
            </div>
          </div>

          {/* ── Email + verification ───────────────────────────────────────── */}
          <div className="form-group">
            <label>Email Address <span className="reg-required">*</span></label>
            {verifyConfig.emailVerification ? (
              <>
                <div className="phone-verify-row">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => { update('email', e.target.value); resetEmailVerification(); }}
                    placeholder="e.g. sarah@example.com"
                    disabled={emailVerified}
                    className={emailVerified ? 'input-verified' : ''}
                  />
                  {emailVerified ? (
                    <span className="phone-verified-badge">✓ Verified</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-send-code"
                      onClick={handleSendEmailCode}
                      disabled={!isValidEmail(form.email) || emailSending || emailCountdown > 0}
                    >
                      {emailSending
                        ? 'Sending…'
                        : emailCountdown > 0
                          ? `Resend in ${emailCountdown}s`
                          : emailCodeSent
                            ? 'Resend Code'
                            : 'Send Code'}
                    </button>
                  )}
                </div>
                {emailSendError && <p className="reg-field-error">{emailSendError}</p>}
                {!emailCodeSent && !emailVerified && (
                  <p className="reg-field-hint">We'll email you a 4-digit code to verify your address.</p>
                )}
              </>
            ) : (
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="e.g. sarah@example.com"
              />
            )}
          </div>

          {/* Email OTP */}
          {verifyConfig.emailVerification && emailCodeSent && !emailVerified && (
            <div className="form-group otp-section otp-section--email">
              <label>
                Email Verification Code
                <span className="otp-expiry"> — expires in 5 min</span>
              </label>
              <div className="otp-input-row">
                <OtpBoxes
                  value={emailOtp}
                  onChange={val => {
                    setEmailOtp(val);
                    setEmailVerifyError('');
                    if (val.length === 4) handleVerifyEmailCode(val);
                  }}
                  disabled={emailVerifying}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => handleVerifyEmailCode()}
                  disabled={emailOtp.length !== 4 || emailVerifying}
                >
                  {emailVerifying ? 'Checking…' : 'Verify'}
                </button>
              </div>
              {emailVerifyError && <p className="reg-field-error">{emailVerifyError}</p>}
            </div>
          )}

          {/* ── Company ───────────────────────────────────────────────────── */}
          <div className="form-group">
            <label>Company / Organisation <span className="reg-optional">(optional)</span></label>
            <input
              type="text"
              value={form.company}
              onChange={e => update('company', e.target.value)}
              placeholder="e.g. Thompson Builds"
            />
          </div>

          {/* ── Mobile + verification ─────────────────────────────────────── */}
          <div className="form-group">
            <label>
              Mobile Number
              {verifyConfig.phoneVerification
                ? <span className="reg-required"> *</span>
                : <span className="reg-optional"> (optional)</span>}
            </label>
            {verifyConfig.phoneVerification ? (
              <>
                <div className="phone-verify-row">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => { update('phone', e.target.value); resetPhoneVerification(); }}
                    placeholder="e.g. 0400 123 456"
                    disabled={phoneVerified}
                    className={phoneVerified ? 'input-verified' : ''}
                  />
                  {phoneVerified ? (
                    <span className="phone-verified-badge">✓ Verified</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-send-code"
                      onClick={handleSendPhoneCode}
                      disabled={!isValidAuMobile(form.phone) || phoneSending || phoneCountdown > 0}
                    >
                      {phoneSending
                        ? 'Sending…'
                        : phoneCountdown > 0
                          ? `Resend in ${phoneCountdown}s`
                          : phoneCodeSent
                            ? 'Resend Code'
                            : 'Send Code'}
                    </button>
                  )}
                </div>
                {phoneSendError && <p className="reg-field-error">{phoneSendError}</p>}
                {!phoneCodeSent && !phoneVerified && (
                  <p className="reg-field-hint">Australian mobile only — we'll send a 4-digit code to verify.</p>
                )}
              </>
            ) : (
              <input
                type="tel"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="e.g. 0400 123 456"
              />
            )}
          </div>

          {/* Phone OTP */}
          {verifyConfig.phoneVerification && phoneCodeSent && !phoneVerified && (
            <div className="form-group otp-section">
              <label>
                Mobile Verification Code
                <span className="otp-expiry"> — expires in 5 min</span>
              </label>
              <div className="otp-input-row">
                <OtpBoxes
                  value={phoneOtp}
                  onChange={val => {
                    setPhoneOtp(val);
                    setPhoneVerifyError('');
                    if (val.length === 4) handleVerifyPhoneCode(val);
                  }}
                  disabled={phoneVerifying}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => handleVerifyPhoneCode()}
                  disabled={phoneOtp.length !== 4 || phoneVerifying}
                >
                  {phoneVerifying ? 'Checking…' : 'Verify'}
                </button>
              </div>
              {phoneVerifyError && <p className="reg-field-error">{phoneVerifyError}</p>}
            </div>
          )}

          {/* ── T&C ───────────────────────────────────────────────────────── */}
          <div className="reg-tc-wrap">
            <label className="reg-tc-label">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={e => update('termsAccepted', e.target.checked)}
              />
              <span className="reg-tc-checkbox" />
              <span className="reg-tc-text">
                I agree to share my contact details with verified building vendors and construction
                companies, who may reach out to me with quotes, proposals, and project-relevant
                information.
              </span>
            </label>
          </div>

          {welcomeBack && (
            <div className="reg-welcome-back">
              <span className="reg-welcome-icon">👋</span>
              <div>
                <strong>Welcome back, {welcomeBack.name.split(' ')[0]}!</strong>
                <p>You're already registered. Taking you to the estimator…</p>
              </div>
            </div>
          )}

          {error && <div className="reg-error">{error}</div>}

          <div className="reg-submit">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={!canSubmit || submitting || !!welcomeBack}
            >
              {submitting ? 'Saving…' : 'Get My Free Estimate →'}
            </button>
            {submitHint && <p className="reg-submit-hint">{submitHint}</p>}
          </div>

        </form>
      </div>
    </div>
  );
}

/* ── 4-box OTP input ──────────────────────────────────────────────────────── */
function OtpBoxes({ value, onChange, disabled }) {
  const refs = useRef([]);

  function handleChange(i, raw) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[i]    = digit;
    const next  = chars.join('').replace(/\s/g, '');
    onChange(next.slice(0, 4));
    if (digit && i < 3) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      if (value[i]) {
        const chars = value.split('');
        chars[i] = '';
        onChange(chars.join(''));
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 3)]?.focus();
  }

  return (
    <div className="otp-boxes" onPaste={handlePaste}>
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className="otp-box"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
        />
      ))}
    </div>
  );
}
