import { useState } from 'react'
import AddEventModal from '../AddEventModal/AddEventModal'
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

export default function TimelineTab({ items, onAddEvent, selectableDays = [] }) {
  const [modalOpen, setModalOpen] = useState(false)

  // Group items by day, sorted keys ascending
  const days = items.reduce((acc, item) => {
    const key = item.day
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const handleSubmit = (formData) => {
    onAddEvent(formData)
    setModalOpen(false)
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
                    />
                  ))}
                </div>
              </div>
            )
          })}
      </section>

      {/* ── FAB: rendered outside the scroll section, fixed to viewport ── */}
      <button
        id="add-event-btn"
        className="add-event-fab"
        onClick={() => setModalOpen(true)}
        aria-label="Add new event to timeline"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Event
      </button>

      {/* ── Modal ── */}
      <AddEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        selectableDays={selectableDays}
      />
    </>
  )
}

function TimelineCard({ item, isLast, isNew }) {
  const color = CATEGORY_COLORS[item.category] || 'var(--color-text-muted)'
  const icon  = CATEGORY_ICONS[item.category] || '📍'

  return (
    <article
      className={`timeline-card${isNew ? ' timeline-card--new' : ''}`}
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
            <span className="timeline-card__category-icon" aria-hidden="true">{icon}</span>
            <span
              className="timeline-card__category-chip"
              style={{ '--chip-color': color }}
            >
              {item.category}
            </span>
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
                <span>{item.location}</span>
              </a>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{item.location}</span>
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
