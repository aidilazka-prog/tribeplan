import { useState, useRef, useEffect } from 'react'
import * as db from '../../lib/db'
import './LandingPage.css'

export default function LandingPage({ onCreateTrip, onJoinTrip, onUpdateTrip, activeTripConfig, manageConfig }) {
  const [view, setView] = useState('home') // 'home' | 'create' | 'success' | 'join'
  const [pendingConfig, setPendingConfig] = useState(null)

  // When leader taps "Manage Trip", jump straight to the success view
  useEffect(() => {
    if (manageConfig) {
      setPendingConfig(manageConfig)
      setView('success')
    }
  }, [manageConfig])

  const handleSuccess = (config) => {
    setPendingConfig(config)
    setView('success')
  }

  return (
    <div className="landing">
      {/* Ambient background orbs */}
      <div className="landing__orb landing__orb--1" aria-hidden="true" />
      <div className="landing__orb landing__orb--2" aria-hidden="true" />
      <div className="landing__orb landing__orb--3" aria-hidden="true" />

      <div className="landing__inner">
        {view === 'home'    && <HomeScreen onCreate={() => setView('create')} onJoin={() => setView('join')} />}
        {view === 'create'  && <CreateForm onSubmit={handleSuccess} onBack={() => setView('home')} />}
        {view === 'success' && (
          <SuccessScreen
            config={pendingConfig}
            isManageMode={!!manageConfig}
            onDone={manageConfig ? onUpdateTrip : onCreateTrip}
          />
        )}
        {view === 'join'    && <JoinForm onBack={() => setView('home')} onJoin={onJoinTrip} tripConfig={activeTripConfig} />}
      </div>
    </div>
  )
}

// ── Home screen ───────────────────────────────────────────────
function HomeScreen({ onCreate, onJoin }) {
  return (
    <div className="home-screen">
      {/* Logo / wordmark */}
      <div className="home-screen__logo" aria-label="TribePlan logo">
        <div className="home-screen__logo-icon" aria-hidden="true">🌴</div>
        <span className="home-screen__wordmark">TribePlan</span>
      </div>

      <div className="home-screen__hero">
        <h1 className="home-screen__heading">
          Plan together,<br />
          <span className="home-screen__heading-accent">stress less.</span>
        </h1>
        <p className="home-screen__subheading">
          One shared space for your group's itinerary, ideas, and expenses.
          No sign-up needed.
        </p>
      </div>

      <div className="home-screen__actions">
        <button
          id="create-trip-btn"
          className="landing-btn landing-btn--primary"
          onClick={onCreate}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New Trip
        </button>

        <button
          id="join-trip-btn"
          className="landing-btn landing-btn--ghost"
          onClick={onJoin}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Join with Password
        </button>
      </div>

      <div className="home-screen__features" aria-label="Key features">
        {[
          { icon: '📅', label: 'Shared Timeline' },
          { icon: '💡', label: 'Idea Bucket' },
          { icon: '💰', label: 'Expense Split' },
        ].map(f => (
          <div key={f.label} className="feature-pill">
            <span aria-hidden="true">{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Create trip form ──────────────────────────────────────────
const EMPTY_CREATE = {
  tripName: '',
  leaderName: '',
  password: '',
  passwordConfirm: '',
  startDate: '',
  endDate: '',
}

function CreateForm({ onSubmit, onBack }) {
  const [form, setForm] = useState(EMPTY_CREATE)
  const [members, setMembers] = useState([''])
  const [errors, setErrors] = useState({})
  const [pwVisible, setPwVisible] = useState(false)
  const [step, setStep] = useState(1) // 1 = trip details, 2 = members & password
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const firstRef = useRef(null)

  useEffect(() => { firstRef.current?.focus() }, [step])

  const set = (key) => (e) => {
    setForm(p => ({ ...p, [key]: e.target.value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const updateMember = (i, val) =>
    setMembers(prev => prev.map((m, idx) => idx === i ? val : m))

  const addMemberSlot = () => setMembers(prev => [...prev, ''])

  const removeMember = (i) =>
    setMembers(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const validateStep1 = () => {
    const e = {}
    if (!form.tripName.trim())   e.tripName   = 'Trip name is required'
    if (!form.leaderName.trim()) e.leaderName = 'Leader name is required'
    return e
  }

  const validateStep2 = () => {
    const e = {}
    if (!/^\d{4}$/.test(form.password))
      e.password = 'Must be exactly 4 digits'
    if (form.password !== form.passwordConfirm)
      e.passwordConfirm = 'Passwords do not match'
    return e
  }

  const handleNext = () => {
    const e = validateStep1()
    if (Object.keys(e).length) { setErrors(e); return }
    setStep(2)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = validateStep2()
    if (Object.keys(e).length) { setErrors(e); return }

    // Clean member list: deduplicate, remove blanks, always include leader
    const cleanMembers = [
      form.leaderName.trim(),
      ...members
        .map(m => m.trim())
        .filter(m => m && m.toLowerCase() !== form.leaderName.trim().toLowerCase()),
    ]

    setSaving(true)
    setSaveErr('')
    try {
      const { tripRow, memberRows } = await db.createTrip({
        tripName:   form.tripName.trim(),
        leaderName: form.leaderName.trim(),
        password:   form.password,
        members:    cleanMembers,
        startDate:  form.startDate || null,
        endDate:    form.endDate   || null,
      })

      // Build the config object the rest of the app expects
      onSubmit({
        id:          tripRow.id,             // real Supabase UUID
        tripName:    tripRow.trip_name,
        leaderName:  tripRow.leader_name,
        password:    tripRow.join_password,
        members:     memberRows.map(r => r.name),
        memberRows,                          // keep rows for manage-mode diffing
        startDate:   form.startDate || null,
        endDate:     form.endDate   || null,
        joinCode:    tripRow.id.slice(0, 6).toUpperCase(), // short display code
      })
    } catch (err) {
      console.error(err)
      setSaveErr(err.message || 'Could not save trip. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-screen">
      {/* Back */}
      <button className="form-screen__back" onClick={step === 1 ? onBack : () => setStep(1)} aria-label="Go back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {step === 1 ? 'Back' : 'Trip Details'}
      </button>

      <div className="form-screen__header">
        <span className="form-screen__emoji" aria-hidden="true">{step === 1 ? '🗺️' : '🔐'}</span>
        <h1 className="form-screen__title">
          {step === 1 ? 'New Trip' : 'Members & Password'}
        </h1>
        <p className="form-screen__subtitle">
          {step === 1 ? 'Tell us about your adventure' : 'Who\'s coming? Set a 4-digit join code'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="step-dots" aria-label="Step 1 of 2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2}>
        <span className={`step-dot${step >= 1 ? ' step-dot--active' : ''}`} />
        <span className={`step-dot${step >= 2 ? ' step-dot--active' : ''}`} />
      </div>

      <form id="create-trip-form" className="trip-form" onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext() } : handleSubmit} noValidate>
        {step === 1 ? (
          <>
            {/* Trip Name */}
            <div className="trip-field">
              <label htmlFor="trip-name" className="trip-label">
                Trip Name
                {errors.tripName && <span className="trip-err">{errors.tripName}</span>}
              </label>
              <input
                id="trip-name"
                ref={firstRef}
                type="text"
                className={`trip-input${errors.tripName ? ' trip-input--err' : ''}`}
                placeholder="e.g. Family Trip to Bali 🌴"
                value={form.tripName}
                maxLength={60}
                onChange={set('tripName')}
              />
            </div>

            {/* Leader Name */}
            <div className="trip-field">
              <label htmlFor="leader-name" className="trip-label">
                Your Name (Trip Leader)
                {errors.leaderName && <span className="trip-err">{errors.leaderName}</span>}
              </label>
              <input
                id="leader-name"
                type="text"
                className={`trip-input${errors.leaderName ? ' trip-input--err' : ''}`}
                placeholder="e.g. Aisyah"
                value={form.leaderName}
                maxLength={40}
                onChange={set('leaderName')}
              />
            </div>

            {/* Dates (optional) */}
            <div className="trip-row">
              <div className="trip-field">
                <label htmlFor="start-date" className="trip-label">Start Date <span className="trip-optional">(opt.)</span></label>
                <input
                  id="start-date"
                  type="date"
                  className="trip-input"
                  value={form.startDate}
                  onChange={set('startDate')}
                />
              </div>
              <div className="trip-field">
                <label htmlFor="end-date" className="trip-label">End Date <span className="trip-optional">(opt.)</span></label>
                <input
                  id="end-date"
                  type="date"
                  className="trip-input"
                  value={form.endDate}
                  onChange={set('endDate')}
                />
              </div>
            </div>

            <button type="submit" id="create-next-btn" className="landing-btn landing-btn--primary landing-btn--full">
              Next: Members & Password
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        ) : (
          <>
            {/* Member list */}
            <div className="trip-field">
              <span className="trip-label">Group Members</span>
              <div className="trip-leader-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {form.leaderName} (you — Leader)
              </div>
              <div className="member-list">
                {members.map((m, i) => (
                  <div key={i} className="member-row">
                    <input
                      id={`member-${i}`}
                      type="text"
                      className="trip-input trip-input--member"
                      placeholder={`Member ${i + 1} name`}
                      value={m}
                      maxLength={30}
                      onChange={e => updateMember(i, e.target.value)}
                      ref={i === 0 && step === 2 ? firstRef : null}
                    />
                    {members.length > 1 && (
                      <button
                        type="button"
                        className="member-remove"
                        onClick={() => removeMember(i)}
                        aria-label={`Remove member ${i + 1}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                          strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                id="add-member-btn"
                className="add-member-btn"
                onClick={addMemberSlot}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add another member
              </button>
            </div>

            {/* 4-digit password */}
            <div className="trip-field">
              <label htmlFor="trip-password" className="trip-label">
                4-Digit Join Password
                {errors.password && <span className="trip-err">{errors.password}</span>}
              </label>
              <div className="pw-wrap">
                <input
                  id="trip-password"
                  type={pwVisible ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  className={`trip-input trip-input--pw${errors.password ? ' trip-input--err' : ''}`}
                  placeholder="e.g. 1234"
                  value={form.password}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setForm(p => ({ ...p, password: v }))
                    setErrors(p => ({ ...p, password: '', passwordConfirm: '' }))
                  }}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setPwVisible(v => !v)}
                  aria-label={pwVisible ? 'Hide password' : 'Show password'}
                >
                  {pwVisible
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {/* PIN dots visual */}
              <div className="pin-dots" aria-hidden="true">
                {[0,1,2,3].map(i => (
                  <span key={i} className={`pin-dot${form.password.length > i ? ' pin-dot--filled' : ''}`} />
                ))}
              </div>
            </div>

            {/* Confirm */}
            <div className="trip-field">
              <label htmlFor="trip-password-confirm" className="trip-label">
                Confirm Password
                {errors.passwordConfirm && <span className="trip-err">{errors.passwordConfirm}</span>}
              </label>
              <input
                id="trip-password-confirm"
                type={pwVisible ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                className={`trip-input trip-input--pw${errors.passwordConfirm ? ' trip-input--err' : ''}`}
                placeholder="Re-enter 4 digits"
                value={form.passwordConfirm}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setForm(p => ({ ...p, passwordConfirm: v }))
                  setErrors(p => ({ ...p, passwordConfirm: '' }))
                }}
              />
            </div>

            {saveErr && (
              <p style={{ color: '#f87171', fontSize: 12, fontWeight: 600, textAlign: 'center' }}
                role="alert">{saveErr}</p>
            )}

            <button
              type="submit"
              id="create-trip-submit-btn"
              className="landing-btn landing-btn--primary landing-btn--full"
              disabled={saving}
            >
              {saving ? (
                <span aria-live="polite">Saving…</span>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Create Trip &amp; Start Planning
                </>
              )}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

// ── Join trip form ────────────────────────────────────────────
function JoinForm({ onBack, onJoin, tripConfig }) {
  const [selectedName, setSelectedName] = useState(null)
  const [digits, setDigits]             = useState(['', '', '', ''])
  const [shaking, setShaking]           = useState(false)
  const [wrongPw, setWrongPw]           = useState(false)
  const [nameErr, setNameErr]           = useState(false)
  const digitRefs                       = [useRef(), useRef(), useRef(), useRef()]

  // ── OTP input handlers ────────────────────────────────────────
  const handleDigitChange = (i, val) => {
    const d = val.replace(/\D/g, '').slice(-1) // one digit only
    const next = [...digits]
    next[i] = d
    setDigits(next)
    setWrongPw(false)
    if (d && i < 3) digitRefs[i + 1].current?.focus()
  }

  const handleDigitKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      digitRefs[i - 1].current?.focus()
    }
  }

  const handleDigitPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    const next = ['', '', '', '']
    pasted.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    digitRefs[Math.min(pasted.length, 3)].current?.focus()
  }

  const enteredPin = digits.join('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedName) { setNameErr(true); return }
    if (!tripConfig)   { return }
    if (enteredPin === tripConfig.password) {
      onJoin(selectedName)
    } else {
      // Wrong password — shake animation
      setWrongPw(true)
      setShaking(true)
      setDigits(['', '', '', ''])
      setTimeout(() => {
        setShaking(false)
        digitRefs[0].current?.focus()
      }, 600)
    }
  }

  // ── No active trip on device ───────────────────────────────────
  if (!tripConfig) {
    return (
      <div className="form-screen">
        <button className="form-screen__back" onClick={onBack} aria-label="Back to home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div className="form-screen__header">
          <span className="form-screen__emoji" aria-hidden="true">🔗</span>
          <h1 className="form-screen__title">Join a Trip</h1>
        </div>
        <div className="join-no-trip">
          <div className="join-no-trip__icon" aria-hidden="true">🏝️</div>
          <p className="join-no-trip__title">No active trip on this device</p>
          <p className="join-no-trip__hint">
            Ask your Trip Leader to open TribePlan and create the trip first,
            then hand you the device to join — or share their screen.
          </p>
          <button
            type="button"
            className="landing-btn landing-btn--ghost landing-btn--full"
            onClick={onBack}
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // ── Active trip found — show join form ────────────────────────
  return (
    <div className="form-screen">
      <button className="form-screen__back" onClick={onBack} aria-label="Back to home">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>

      {/* Trip info card */}
      <div className="join-trip-card">
        <div className="join-trip-card__emoji" aria-hidden="true">🌴</div>
        <div>
          <div className="join-trip-card__name">{tripConfig.tripName}</div>
          <div className="join-trip-card__leader">Led by {tripConfig.leaderName} · {tripConfig.members.length} members</div>
        </div>
      </div>

      <form id="join-trip-form" className="trip-form" onSubmit={handleSubmit} noValidate>
        {/* ── Name picker ── */}
        <div className="trip-field">
          <span className={`trip-label${nameErr ? ' trip-label--err' : ''}`}>
            Who are you?
            {nameErr && <span className="trip-err">Select your name</span>}
          </span>
          <div className="join-member-grid" role="group" aria-label="Select your name">
            {tripConfig.members.map(m => (
              <button
                key={m}
                type="button"
                id={`join-member-${m}`}
                className={`join-member-btn${
                  selectedName === m ? ' join-member-btn--active' : ''
                }${m === tripConfig.leaderName ? ' join-member-btn--leader' : ''}`}
                onClick={() => { setSelectedName(m); setNameErr(false) }}
                aria-pressed={selectedName === m}
              >
                {m === tripConfig.leaderName && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-label="Leader">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                )}
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* ── OTP password input ── */}
        <div className="trip-field">
          <span className={`trip-label${wrongPw ? ' trip-label--err' : ''}`}>
            4-Digit Join Password
            {wrongPw && <span className="trip-err">Wrong password</span>}
          </span>
          <div
            className={`otp-row${shaking ? ' otp-row--shake' : ''}${wrongPw ? ' otp-row--wrong' : ''}`}
            role="group"
            aria-label="Enter 4-digit join password"
          >
            {digits.map((d, i) => (
              <input
                key={i}
                id={`otp-digit-${i}`}
                ref={digitRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                className="otp-digit"
                value={d}
                aria-label={`Digit ${i + 1}`}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleDigitKeyDown(i, e)}
                onPaste={i === 0 ? handleDigitPaste : undefined}
                autoComplete="off"
              />
            ))}
          </div>
          {wrongPw && (
            <p className="otp-wrong-msg" role="alert" aria-live="assertive">
              ❌ Wrong password — try again
            </p>
          )}
        </div>

        <button
          type="submit"
          id="join-trip-submit-btn"
          className="landing-btn landing-btn--primary landing-btn--full"
          disabled={!selectedName || enteredPin.length < 4}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Join Trip
        </button>

        <div className="join-v1-notice">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>V1: All members share one device. The leader hands the device over after joining.</span>
        </div>
      </form>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────
const BASE_URL = 'tribeplan.app/join'

function SuccessScreen({ config, isManageMode, onDone }) {
  // members: string[] for display; memberRows: [{ id, name }] from DB
  const [members,     setMembers]     = useState(config.members)
  const [memberRows,  setMemberRows]  = useState(config.memberRows ?? [])
  const [inputVal,    setInputVal]    = useState('')
  const [inputErr,    setInputErr]    = useState('')
  const [copied,      setCopied]      = useState(false)
  const [pwRevealed,  setPwRevealed]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveErr,     setSaveErr]     = useState('')
  const inputRef = useRef(null)

  const shareUrl = `${BASE_URL}/${config.joinCode.toLowerCase()}`

  const addMember = () => {
    const name = inputVal.trim()
    if (!name) { setInputErr('Enter a name first'); return }
    if (members.map(m => m.toLowerCase()).includes(name.toLowerCase())) {
      setInputErr('Already in the list'); return
    }
    setMembers(prev => [...prev, name])
    // memberRows entry will be created on save (handleDone)
    setInputVal('')
    setInputErr('')
    inputRef.current?.focus()
  }

  const removeMember = (name) => {
    if (name === config.leaderName) return // leader can't be removed
    setMembers(prev => prev.filter(m => m !== name))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addMember() }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`)
    } catch {
      // fallback for non-https / older browsers
      const ta = document.createElement('textarea')
      ta.value = `https://${shareUrl}`
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDone = async () => {
    if (!isManageMode) {
      // New trip creation: members already in DB, just propagate config
      onDone({ ...config, members })
      return
    }

    // Manage mode: diff and sync to DB
    setSaving(true)
    setSaveErr('')
    try {
      const originalNames = (config.memberRows ?? []).map(r => r.name)
      const added   = members.filter(m => !originalNames.includes(m))
      const removed = (config.memberRows ?? []).filter(r => !members.includes(r.name))

      // Run adds + removes concurrently
      const [newRows] = await Promise.all([
        Promise.all(added.map(name => db.addMember(config.id, name))),
        Promise.all(removed.map(r   => db.removeMember(r.id))),
      ])

      // Build updated memberRows
      const keptRows    = (config.memberRows ?? []).filter(r => members.includes(r.name))
      const updatedRows = [...keptRows, ...newRows]

      onDone({
        ...config,
        members:    updatedRows.map(r => r.name),
        memberRows: updatedRows,
      })
    } catch (err) {
      console.error(err)
      setSaveErr(err.message || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="success-screen">
      {/* ── Header: manage mode vs create mode ── */}
      {isManageMode ? (
        <div className="success-manage-header">
          <div className="success-manage-header__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <div>
            <h1 className="success-manage-header__title">Manage Trip</h1>
            <p className="success-manage-header__sub">{config.tripName}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Confetti burst icon */}
          <div className="success-screen__burst" aria-hidden="true">
            <span className="success-screen__burst-emoji">🎉</span>
            <div className="success-screen__burst-ring" />
          </div>
          <div className="success-screen__header">
            <h1 className="success-screen__title">Trip Created!</h1>
            <p className="success-screen__trip-name">{config.tripName}</p>
            <p className="success-screen__subtitle">
              Led by <strong>{config.leaderName}</strong> · {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}

      {/* ── Member adder ── */}
      <div className="success-section">
        <span className="success-label">Invite Your Crew</span>

        <div className="success-add-row">
          <input
            id="success-member-input"
            ref={inputRef}
            type="text"
            className={`trip-input success-member-input${inputErr ? ' trip-input--err' : ''}`}
            placeholder="Enter a name (e.g. Mum, Dad, Irfan)"
            value={inputVal}
            maxLength={30}
            onChange={e => { setInputVal(e.target.value); setInputErr('') }}
            onKeyDown={handleKeyDown}
            aria-label="Add a member"
          />
          <button
            id="success-add-member-btn"
            type="button"
            className="success-add-btn"
            onClick={addMember}
            aria-label="Add member"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add
          </button>
        </div>
        {inputErr && <p className="success-input-err" role="alert">{inputErr}</p>}

        {/* Member chips */}
        <div className="success-member-chips" role="list" aria-label="Trip members">
          {members.map(m => {
            const isLeader = m === config.leaderName
            return (
              <span
                key={m}
                className={`success-member-chip${isLeader ? ' success-member-chip--leader' : ''}`}
                role="listitem"
              >
                {isLeader && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                )}
                {m}
                {!isLeader && (
                  <button
                    type="button"
                    className="success-member-chip__remove"
                    onClick={() => removeMember(m)}
                    aria-label={`Remove ${m}`}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Shareable Link ── */}
      <div className="success-section">
        <span className="success-label">Shareable Link</span>
        <div className="share-link-box">
          <div className="share-link-box__url" aria-label={`Trip link: https://${shareUrl}`}>
            <span className="share-link-box__protocol">https://</span>
            <span className="share-link-box__path">{shareUrl}</span>
          </div>
          <button
            id="copy-link-btn"
            type="button"
            className={`copy-btn${copied ? ' copy-btn--copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? 'Link copied!' : 'Copy shareable link'}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Join password display */}
        <div className="share-pw-row">
          <span className="share-pw-row__label">Join password:</span>
          <div className="share-pw-row__digits">
            {config.password.split('').map((d, i) => (
              <span key={i} className={`share-pw-digit${pwRevealed ? ' share-pw-digit--visible' : ''}`}>
                {pwRevealed ? d : '•'}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="share-pw-toggle"
            onClick={() => setPwRevealed(v => !v)}
            aria-label={pwRevealed ? 'Hide password' : 'Reveal password'}
          >
            {pwRevealed
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>

        <p className="share-hint">
          Share this link + password with your travel crew.
          They'll enter the code to join your trip dashboard.
        </p>
      </div>

      {saveErr && (
        <p style={{ color: '#f87171', fontSize: 12, fontWeight: 600, textAlign: 'center' }}
          role="alert">{saveErr}</p>
      )}

      {/* ── Done / return button ── */}
      <button
        id="go-to-dashboard-btn"
        type="button"
        className="landing-btn landing-btn--primary landing-btn--full"
        onClick={handleDone}
        disabled={saving}
      >
        {saving ? (
          <span aria-live="polite">Saving…</span>
        ) : isManageMode ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Save &amp; Return to Dashboard
          </>
        ) : (
          <>
            Go to Dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </>
        )}
      </button>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
