import { useState } from 'react'
import AddEventModal from '../AddEventModal/AddEventModal'
import AiPlannerModal from '../AiPlannerModal/AiPlannerModal'
import './TimelineTab.css'

const CATEGORY_ICONS = {
  accommodation: '🏨',
  food:          '🍽️',
  activity:      '🥾',
  culture:       '🛕',
  leisure:       '🌅',
  transport:     '🚗',
}

const CATEGORY_COLORS = {
  accommodation: 'var(--color-primary)',
  food:          'var(--color-accent)',
  activity:      '#60a5fa',
  culture:       '#c084fc',
  leisure:       '#fbbf24',
  transport:     '#94a3b8',
}

import { useEffect } from 'react'

export default function TimelineTab({ items, onAddEvent, onAddEventsBulk, onEditEvent, onToggleDone, selectableDays = [], tripName }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [now, setNow] = useState(new Date())

  // Keep now updated every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Map items to include parsed dateTime and isPast
  const enrichedItems = items.map(item => {
    const dtStr = `${item.date || '2026-07-10'}T${item.time || '00:00'}:00`
    const dateTime = new Date(dtStr)
    const isPast = now > dateTime
    return { ...item, dateTime, isPast }
  })

  // Find the closest upcoming uncompleted event
  const upcoming = enrichedItems.filter(item => !item.isPast && !item.isDone)
  upcoming.sort((a, b) => a.dateTime - b.dateTime)
  const closestUpcomingId = upcoming[0]?.id || null

  // Group enriched items by day, sorted keys ascending
  const days = enrichedItems.reduce((acc, item) => {
    const key = item.day
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const handleEditClick = (item) => {
    setEditingEvent(item)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingEvent(null)
  }

  const handleSubmit = (formData) => {
    if (editingEvent) {
      onEditEvent({ ...editingEvent, ...formData })
    } else {
      onAddEvent(formData)
    }
    handleClose()
  }

  return (
    <>
      {/* ── Scrollable timeline content ── */}
      <section className="timeline-tab" aria-label="Trip timeline">
        {Object.keys(days)
          .sort((a, b) => Number(a) - Number(b))
          .map(day => {
            const dayItems = days[day]
            return (
              <div key={day} className="timeline-day">
                <div className="timeline-day__header">
                  <span className="timeline-day__badge">Day {day}</span>
                  <span className="timeline-day__date">
                    - {formatDate(dayItems[0].date)}
                  </span>
                  <span className="timeline-day__count">
                    {dayItems.length} event{dayItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="timeline-day__items">
                  {dayItems.map((item, idx) => (
                    <TimelineCard
                      key={item.id}
                      item={item}
                      isLast={idx === dayItems.length - 1}
                      isNew={item.id.startsWith('tl-') && /^\d{13}$/.test(item.id.slice(3))}
                      isClosestUpcoming={item.id === closestUpcomingId}
                      now={now}
                      onEditClick={handleEditClick}
                      onToggleDone={onToggleDone}
                    />
                  ))}
                </div>
              </div>
            )
          })}
      </section>

      {/* ── FAB Group: rendered outside the scroll section, fixed to viewport ── */}
      <div className="fab-group">
        <button
          id="add-event-btn"
          className="add-event-fab"
          onClick={() => setModalOpen(true)}
          aria-label="Add new event to timeline"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Event
        </button>

        <button
          id="ai-planner-btn"
          className="ai-planner-fab"
          onClick={() => setAiModalOpen(true)}
          aria-label="Generate itinerary using AI"
        >
          <span>✨ AI Planner</span>
        </button>
      </div>

      {/* ── Modal ── */}
      <AddEventModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        selectableDays={selectableDays}
        initialValues={editingEvent}
        existingEvents={items}
      />

      {/* ── AI Planner Modal ── */}
      <AiPlannerModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSubmit={onAddEventsBulk}
        tripName={tripName}
        numDays={selectableDays.length}
      />
    </>
  )
}

function TimelineCard({ item, isLast, isNew, isClosestUpcoming, now, onEditClick, onToggleDone }) {
  const color = CATEGORY_COLORS[item.category] || 'var(--color-text-muted)'
  const icon  = CATEGORY_ICONS[item.category] || '📍'

  // Determine countdown text
  let countdownText = ''
  if (isClosestUpcoming && item.dateTime) {
    const diffMs = item.dateTime - now
    const diffMins = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMins / 60)
    const remMins = diffMins % 60
    if (diffMins <= 0) {
      countdownText = 'Starts now'
    } else if (diffHrs === 0) {
      countdownText = `Starts in ${diffMins}m`
    } else {
      countdownText = `Starts in ${diffHrs}h ${remMins}m`
    }
  }

  const isMock = item.id && item.id.toString().startsWith('tour-mock-')
  const cardClasses = [
    'timeline-card',
    isNew ? 'timeline-card--new' : '',
    item.isDone ? 'timeline-card--done' : '',
    item.isPast ? 'timeline-card--past' : '',
    isMock ? 'tour-highlight-mock' : '',
  ].filter(Boolean).join(' ')

  return (
    <article
      className={cardClasses}
      style={{ '--accent': color }}
      aria-label={item.title}
    >
      {/* Connector */}
      <div className="timeline-card__connector">
        <span className="timeline-card__dot" />
        {!isLast && <span className="timeline-card__line" />}
      </div>

      <div className="timeline-card__body">
        <div className="timeline-card__time">{item.time}</div>
        <div className="timeline-card__content">
          <div className="timeline-card__header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="timeline-card__category-icon" aria-hidden="true">{icon}</span>
              <span
                className="timeline-card__category-chip"
                style={{ '--chip-color': color }}
              >
                {item.category}
              </span>
            </div>
            
            {/* Actions & Countdown */}
            <div className="timeline-card__actions-row">
              {isClosestUpcoming && countdownText && (
                <span className="timeline-card__countdown">⏱️ {countdownText}</span>
              )}
              <div className="timeline-card__actions">
                {(() => {
                  const isMock = item.id && item.id.toString().startsWith('tour-mock-')
                  return (
                    <>
                      <button
                        type="button"
                        className={`timeline-card__action-btn timeline-card__action-btn--done${item.isDone ? ' active' : ''}`}
                        onClick={() => !isMock && onToggleDone(item.id, item.isDone)}
                        disabled={isMock}
                        title={isMock ? "Demo Event (Disabled)" : (item.isDone ? "Mark as active" : "Mark as done")}
                        style={isMock ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                          strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="timeline-card__action-btn timeline-card__action-btn--edit"
                        onClick={() => !isMock && onEditClick(item)}
                        disabled={isMock}
                        title={isMock ? "Demo Event (Disabled)" : "Edit event"}
                        style={isMock ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                          strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
          
          <h2 className="timeline-card__title">{item.title}</h2>
          
          <div className="timeline-card__location">
            {item.googleMapsUrl ? (
              <a
                href={item.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="timeline-card__location-link"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {(() => {
                  const parts = item.location.split(' - ')
                  if (parts.length > 1) {
                    const placeName = parts[0]
                    const address = parts.slice(1).join(' - ')
                    return (
                      <span className="timeline-card__location-stacked">
                        <strong className="timeline-card__location-name">{placeName}</strong>
                        <span className="timeline-card__location-address">{address}</span>
                      </span>
                    )
                  }
                  return <span>{item.location}</span>
                })()}
              </a>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {(() => {
                  const parts = item.location.split(' - ')
                  if (parts.length > 1) {
                    const placeName = parts[0]
                    const address = parts.slice(1).join(' - ')
                    return (
                      <span className="timeline-card__location-stacked">
                        <strong className="timeline-card__location-name">{placeName}</strong>
                        <span className="timeline-card__location-address">{address}</span>
                      </span>
                    )
                  }
                  return <span>{item.location}</span>
                })()}
              </>
            )}
          </div>
          {item.note && (
            <p className="timeline-card__note">{item.note}</p>
          )}
        </div>
      </div>
    </article>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}
