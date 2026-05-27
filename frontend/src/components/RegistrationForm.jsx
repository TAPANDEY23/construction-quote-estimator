import { useState } from 'react';

export default function RegistrationForm({ onComplete }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    company:   '',
    phone:     '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Registration failed');
      // Pass email back so App can store it for future pre-fill
      onComplete({ userId: data.userId, name: data.name, email: form.email.trim() });
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
          <p>
            Tell us a little about yourself — we'll save your estimate so you can
            reference it later.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label>
                First Name <span className="reg-required">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => update('firstName', e.target.value)}
                placeholder="e.g. Sarah"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>
                Last Name <span className="reg-required">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => update('lastName', e.target.value)}
                placeholder="e.g. Thompson"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Email Address <span className="reg-required">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="e.g. sarah@example.com"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Company / Organisation{' '}
                <span className="reg-optional">(optional)</span>
              </label>
              <input
                type="text"
                value={form.company}
                onChange={e => update('company', e.target.value)}
                placeholder="e.g. Thompson Builds"
              />
            </div>
            <div className="form-group">
              <label>
                Phone <span className="reg-optional">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="e.g. 0400 123 456"
              />
            </div>
          </div>

          {error && <div className="reg-error">{error}</div>}

          <div className="reg-submit">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Saving...' : 'Get My Free Estimate →'}
            </button>
            <p className="reg-privacy">
              🔒 Your details are stored locally and never shared with third parties.
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}
