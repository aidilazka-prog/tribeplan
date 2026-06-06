import { useState, useEffect, useRef } from 'react'
import './IdeaBucketTab.css'



/** Convert "HH:MM" to total minutes for comparison */
function toMins(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Check clash: within ±45 min of any existing event on that day */
function getClash(timelineItems, day, newTime) {
  const events = timelineItems.filter(e => e.day === day)
  const newMins = toMins(newTime)
  return events.find(e => Math.abs(toMins(e.time) - newMins) < 45) || null
}

// ─────────────────────────────────────────────────────────────
export default function IdeaBucketTab({
  items,
  onUpvote,
  currentUser,
  onMoveToTimeline,
  onAddIdea,
  members,
  timelineItems,
  selectableDays = [],
}) {
  const [movingIdeaId, setMovingIdeaId] = useState(null)
  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const movingIdea = items.find(i => i.id === movingIdeaId) || null

  const sorted = [...items].sort((a, b) => b.upvotes - a.upvotes)

  return (
    <>
      <section className="idea-tab" aria-label="Idea bucket">
        {/* Header */}
        <div className="idea-header">
          <div className="idea-header__counts">
            <span className="idea-header__total">{items.length} idea{items.length !== 1 ? 's' : ''}</span>
            <span className="idea-header__dot" />
            <span className="idea-header__sub">sorted by votes</span>
          </div>
          <p className="idea-header__hint">
            💡 Tap <strong>Move →</strong> to schedule · <strong>+ Add Idea</strong> to brainstorm
          </p>
        </div>

        {items.length === 0 ? (
          <div className="idea-empty">
            <div className="idea-empty__icon">🎉</div>
            <p className="idea-empty__text">All ideas have been added to the timeline!</p>
            <button
              className="idea-empty__add-btn"
              onClick={() => setAddPanelOpen(true)}
            >
              + Add a new idea
            </button>
          </div>
        ) : (
          <ul className="idea-grid" role="list">
            {sorted.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onUpvote={onUpvote}
                currentUser={currentUser}
                onMoveClick={() => setMovingIdeaId(idea.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Fixed violet FAB — only visible on Ideas tab */}
      <button
        id="add-idea-fab"
        className="idea-fab"
        onClick={() => setAddPanelOpen(true)}
        aria-label="Add a new idea to the bucket"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        Add Idea
      </button>

      {/* Add Idea bottom sheet */}
      {addPanelOpen && (
        <AddIdeaPanel
          members={members}
          currentUser={currentUser}
          onSubmit={(data) => {
            onAddIdea(data)
            setAddPanelOpen(false)
          }}
          onClose={() => setAddPanelOpen(false)}
        />
      )}

      {/* Move-to-Timeline bottom sheet */}
      {movingIdea && (
        <MovePanel
          idea={movingIdea}
          timelineItems={timelineItems}
          selectableDays={selectableDays}
          onConfirm={(day, time) => {
            onMoveToTimeline(movingIdea.id, { day, time })
            setMovingIdeaId(null)
          }}
          onClose={() => setMovingIdeaId(null)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
function IdeaCard({ idea, onUpvote, currentUser, onMoveClick }) {
  const hasVoted = idea.upvotedBy.includes(currentUser)

  return (
    <li
      className={`idea-card${hasVoted ? ' idea-card--voted' : ''}`}
      role="listitem"
    >
      {/* Rank badge based on upvotes */}
      <div className="idea-card__votes-bar">
        <button
          id={`upvote-${idea.id}`}
          className={`upvote-btn${hasVoted ? ' upvote-btn--active' : ''}`}
          onClick={() => onUpvote(idea.id, currentUser)}
          aria-pressed={hasVoted}
          aria-label={`${hasVoted ? 'Remove vote' : 'Upvote'}: ${idea.title}`}
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24"
            fill={hasVoted ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="upvote-btn__count">{idea.upvotes}</span>
        </button>
      </div>

      {/* Card content */}
      <div className="idea-card__content">
        <h2 className="idea-card__title">{idea.title}</h2>
        <p className="idea-card__desc">{idea.description}</p>
        <div className="idea-card__footer">
          <span className="idea-card__author">✍️ {idea.addedBy}</span>
          <button
            id={`move-${idea.id}`}
            className="move-btn"
            onClick={onMoveClick}
            aria-label={`Move "${idea.title}" to timeline`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Move →
          </button>
        </div>
      </div>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────
const EMPTY_IDEA_FORM = { title: '', description: '' }

function AddIdeaPanel({ members, currentUser, onSubmit, onClose }) {
  const [form, setForm] = useState(EMPTY_IDEA_FORM)
  const [addedBy, setAddedBy] = useState(currentUser)
  const [titleError, setTitleError] = useState('')
  const overlayRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80)
  }, [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.title.trim()) { setTitleError('Title is required'); return }
    onSubmit({ title: form.title, description: form.description, addedBy })
  }

  return (
    <div
      className="move-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-idea-title"
    >
      <div className="move-panel">
        <div className="move-panel__handle" aria-hidden="true" />

        {/* Header */}
        <div className="move-panel__header">
          <div className="move-panel__header-text">
            <span className="move-panel__emoji" aria-hidden="true">💡</span>
            <div>
              <h2 id="add-idea-title" className="move-panel__title">Add New Idea</h2>
              <p className="move-panel__subtitle">Pitch it to the group — they can upvote!</p>
            </div>
          </div>
          <button
            id="add-idea-close"
            className="move-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form
          id="add-idea-form"
          className="move-panel__body"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Title */}
          <div className="move-field">
            <label htmlFor="idea-title" className="move-label">
              Idea Title
              {titleError && <span className="idea-field-error">{titleError}</span>}
            </label>
            <input
              id="idea-title"
              ref={titleRef}
              type="text"
              className={`idea-input${titleError ? ' idea-input--error' : ''}`}
              placeholder="e.g. Visit the Secret Waterfall"
              value={form.title}
              maxLength={80}
              onChange={e => {
                setForm(p => ({ ...p, title: e.target.value }))
                if (titleError) setTitleError('')
              }}
            />
          </div>

          {/* Description */}
          <div className="move-field">
            <label htmlFor="idea-desc" className="move-label">
              Description <span className="idea-optional">(optional)</span>
            </label>
            <textarea
              id="idea-desc"
              className="idea-textarea"
              placeholder="Any details to help the group decide…"
              value={form.description}
              maxLength={200}
              rows={3}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Added by */}
          <div className="move-field">
            <span className="move-label">Adding as</span>
            <div className="member-chips" role="group" aria-label="Who is adding this idea">
              {members.map(member => (
                <button
                  key={member}
                  type="button"
                  id={`member-chip-${member}`}
                  className={`member-chip${addedBy === member ? ' member-chip--active' : ''}`}
                  onClick={() => setAddedBy(member)}
                  aria-pressed={addedBy === member}
                >
                  {member}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="move-panel__actions">
            <button
              type="button"
              id="add-idea-cancel"
              className="move-action-btn move-action-btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="add-idea-submit"
              className="move-action-btn move-action-btn--idea"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add to Bucket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  accommodation: '🏨', food: '🍽️', activity: '🥾',
  culture: '🛕', leisure: '🌅', transport: '🚗',
}

function MovePanel({ idea, timelineItems, selectableDays, onConfirm, onClose }) {
  const [selectedDay, setSelectedDay] = useState(1)
  const [selectedTime, setSelectedTime] = useState('10:00')
  const overlayRef = useRef(null)

  // Events on the selected day, sorted by time
  const dayEvents = timelineItems
    .filter(e => e.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time))

  // Clash detection
  const clashEvent = getClash(timelineItems, selectedDay, selectedTime)
  const isExact = clashEvent && clashEvent.time === selectedTime

  // Merge existing + proposed for the availability timeline
  const proposed = { time: selectedTime, title: idea.title, isNew: true }
  const allSlots = [...dayEvents.map(e => ({ ...e, isNew: false })), proposed]
    .sort((a, b) => a.time.localeCompare(b.time))

  // Keyboard close
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="move-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-panel-title"
    >
      <div className="move-panel">
        {/* Drag handle */}
        <div className="move-panel__handle" aria-hidden="true" />

        {/* Header */}
        <div className="move-panel__header">
          <div className="move-panel__header-text">
            <span className="move-panel__emoji" aria-hidden="true">📅</span>
            <div>
              <h2 id="move-panel-title" className="move-panel__title">Schedule to Timeline</h2>
              <p className="move-panel__subtitle">"{idea.title}"</p>
            </div>
          </div>
          <button
            id="move-panel-close"
            className="move-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="move-panel__body">
          {/* Day selector */}
          <div className="move-field">
            <span className="move-label">Pick a Day</span>
            <div className="day-tabs" role="group" aria-label="Select day">
              {selectableDays.map(d => (
                <button
                  key={d.day}
                  id={`day-tab-${d.day}`}
                  className={`day-tab${selectedDay === d.day ? ' day-tab--active' : ''}`}
                  onClick={() => setSelectedDay(d.day)}
                  aria-pressed={selectedDay === d.day}
                >
                  <span className="day-tab__label">{d.label}</span>
                  <span className="day-tab__sub">{d.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time picker */}
          <div className="move-field">
            <label htmlFor="move-time" className="move-label">Set Time</label>
            <input
              id="move-time"
              type="time"
              className="move-time-input"
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
            />
          </div>

          {/* ── Availability view ── */}
          <div className="move-field">
            <span className="move-label">
              Day {selectedDay} Schedule
              <span className="move-label__events-count">
                {dayEvents.length} booked
              </span>
            </span>

            {allSlots.length === 0 ? (
              <p className="avail-empty">No events yet — you're free all day!</p>
            ) : (
              <ul className="avail-list" role="list" aria-label="Day schedule">
                {allSlots.map((slot, i) => {
                  const clash = !slot.isNew && clashEvent && clashEvent.id === slot.id
                  return (
                    <li
                      key={slot.isNew ? '__new__' : slot.id}
                      className={[
                        'avail-item',
                        slot.isNew ? 'avail-item--new' : 'avail-item--existing',
                        clash ? 'avail-item--clash' : '',
                      ].join(' ').trim()}
                      aria-label={`${slot.time} – ${slot.title}${slot.isNew ? ' (your new event)' : ''}${clash ? ' – timing conflict' : ''}`}
                    >
                      <span className="avail-item__time">{slot.time}</span>
                      <span className="avail-item__icon" aria-hidden="true">
                        {slot.isNew ? '✨' : (CATEGORY_ICONS[slot.category] || '📍')}
                      </span>
                      <span className="avail-item__title">{slot.title}</span>
                      {slot.isNew && (
                        <span className="avail-item__badge avail-item__badge--new">NEW</span>
                      )}
                      {clash && (
                        <span className="avail-item__badge avail-item__badge--clash">CLASH</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Conflict status banner */}
            {clashEvent ? (
              <div className={`conflict-banner conflict-banner--${isExact ? 'error' : 'warn'}`}>
                <span aria-hidden="true">{isExact ? '🚫' : '⚠️'}</span>
                <span>
                  {isExact
                    ? `Exact clash with "${clashEvent.title}" at ${clashEvent.time}`
                    : `Within 45 min of "${clashEvent.title}" at ${clashEvent.time}. You can still proceed.`}
                </span>
              </div>
            ) : (
              <div className="conflict-banner conflict-banner--ok">
                <span aria-hidden="true">✅</span>
                <span>Time slot looks good — no conflicts!</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="move-panel__actions">
          <button
            id="move-panel-cancel"
            className="move-action-btn move-action-btn--ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            id="move-panel-confirm"
            className={`move-action-btn move-action-btn--confirm${isExact ? ' move-action-btn--warn' : ''}`}
            onClick={() => onConfirm(selectedDay, selectedTime)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {isExact ? 'Confirm Anyway' : 'Add to Timeline'}
          </button>
        </div>
      </div>
    </div>
  )
}
