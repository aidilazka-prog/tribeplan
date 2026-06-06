import { useState, useEffect, useRef } from 'react'
import './AddEventModal.css'

const CATEGORIES = [
  { value: 'activity',      label: '🥾 Activity' },
  { value: 'food',          label: '🍽️ Food & Drink' },
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'culture',       label: '🛕 Culture' },
  { value: 'leisure',       label: '🌅 Leisure' },
  { value: 'transport',     label: '🚗 Transport' },
]

const EMPTY_FORM = {
  day: 1,
  time: '09:00',
  title: '',
  location: '',
  category: 'activity',
  note: '',
}

export default function AddEventModal({ isOpen, onClose, onSubmit, selectableDays }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstInputRef = useRef(null)
  const overlayRef = useRef(null)
  const locationInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM)
      setErrors({})
      // Focus first field after animation settles
      setTimeout(() => firstInputRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Bind Google Places Autocomplete to location input field
  useEffect(() => {
    if (!isOpen) return

    let active = true

    function initAutocomplete() {
      if (!window.google?.maps?.places) {
        setTimeout(() => {
          if (active) initAutocomplete()
        }, 200)
        return
      }

      if (!locationInputRef.current) return

      const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        types: ['geocode', 'establishment'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        const address = place.formatted_address || place.name || ''
        setForm(prev => ({ ...prev, location: address }))
      })

      autocompleteRef.current = autocomplete
    }

    const timer = setTimeout(initAutocomplete, 100)

    return () => {
      active = false
      clearTimeout(timer)
      if (window.google?.maps?.event && autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isOpen])

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.title.trim())    errs.title    = 'Title is required'
    if (!form.location.trim()) errs.location = 'Location is required'
    if (!form.time)            errs.time     = 'Time is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsSubmitting(true)
    // Small artificial delay so the user sees the loading state (purely cosmetic)
    await new Promise(r => setTimeout(r, 300))
    onSubmit({ ...form, day: Number(form.day) })
    setIsSubmitting(false)
  }

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header__icon" aria-hidden="true">📅</div>
          <h2 id="modal-title" className="modal-header__title">Add New Event</h2>
          <button
            id="modal-close-btn"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form id="add-event-form" className="modal-form" onSubmit={handleSubmit} noValidate>

          {/* Row: Day + Time */}
          <div className="form-row">
            <div className="form-field form-field--half">
              <label htmlFor="ae-day" className="form-label">Day</label>
              <div className="form-select-wrapper">
                <select
                  id="ae-day"
                  className="form-select"
                  value={form.day}
                  onChange={set('day')}
                >
                  {selectableDays.map(d => (
                    <option key={d.day} value={d.day}>
                      {d.sub ? `${d.label} – ${d.sub}` : d.label}
                    </option>
                  ))}
                </select>
                <svg className="form-select-arrow" width="12" height="12"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <div className="form-field form-field--half">
              <label htmlFor="ae-time" className="form-label">
                Time
                {errors.time && <span className="form-error">{errors.time}</span>}
              </label>
              <input
                id="ae-time"
                type="time"
                className={`form-input${errors.time ? ' form-input--error' : ''}`}
                value={form.time}
                onChange={set('time')}
                aria-describedby={errors.time ? 'ae-time-err' : undefined}
              />
            </div>
          </div>

          {/* Title */}
          <div className="form-field">
            <label htmlFor="ae-title" className="form-label">
              Event Title
              {errors.title && <span className="form-error">{errors.title}</span>}
            </label>
            <input
              id="ae-title"
              ref={firstInputRef}
              type="text"
              className={`form-input${errors.title ? ' form-input--error' : ''}`}
              placeholder="e.g. Breakfast at Sari Organik"
              value={form.title}
              onChange={set('title')}
              maxLength={80}
              aria-describedby={errors.title ? 'ae-title-err' : undefined}
            />
          </div>

          {/* Location */}
          <div className="form-field">
            <label htmlFor="ae-location" className="form-label">
              Location / Address
              {errors.location && <span className="form-error">{errors.location}</span>}
            </label>
            <input
              id="ae-location"
              ref={locationInputRef}
              type="text"
              className={`form-input${errors.location ? ' form-input--error' : ''}`}
              placeholder="e.g. Jl. Subak Sok Wayah, Ubud"
              value={form.location}
              onChange={set('location')}
              maxLength={120}
              aria-describedby={errors.location ? 'ae-location-err' : undefined}
            />
          </div>

          {/* Category chips */}
          <div className="form-field">
            <span className="form-label">Category</span>
            <div className="category-chips" role="group" aria-label="Event category">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  id={`ae-cat-${cat.value}`}
                  className={`cat-chip${form.category === cat.value ? ' cat-chip--active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, category: cat.value }))}
                  aria-pressed={form.category === cat.value}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note (optional) */}
          <div className="form-field">
            <label htmlFor="ae-note" className="form-label">
              Note <span className="form-label--optional">(optional)</span>
            </label>
            <textarea
              id="ae-note"
              className="form-textarea"
              placeholder="Any helpful details for the group…"
              value={form.note}
              onChange={set('note')}
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              id="modal-cancel-btn"
              className="btn btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="modal-submit-btn"
              className={`btn btn--primary${isSubmitting ? ' btn--loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-spinner" aria-hidden="true" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              )}
              Add to Timeline
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
