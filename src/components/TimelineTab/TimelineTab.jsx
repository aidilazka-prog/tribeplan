import { useState, useEffect, Fragment } from 'react'
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

export default function TimelineTab({
  items,
  onAddEvent,
  onAddEventsBulk,
  onEditEvent,
  onToggleDone,
  selectableDays = [],
  tripName,
  currentUser,
  isLeader,
  ideaItems = [],
  timelineVotes = [],
  onAttachAlternative,
  onVoteAlternative,
  onLockWinningActivity,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [now, setNow] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(1)
  const [travelTimes, setTravelTimes] = useState({})

  // Transit estimation fallback
  function estimateTransitTimeFallback(locA, locB) {
    if (!locA || !locB) return null
    const str = locA + locB
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const mins = 10 + Math.abs(hash % 36) // 10 to 45 mins
    return `${mins} mins`
  }

  // Calculate driving transits
  useEffect(() => {
    const newTravelTimes = { ...travelTimes }
    let changed = false

    const days = {}
    items.forEach(item => {
      if (!days[item.day]) days[item.day] = []
      days[item.day].push(item)
    })

    Object.keys(days).forEach(day => {
      const dayEvents = days[day].sort((a, b) => a.time.localeCompare(b.time))
      for (let i = 0; i < dayEvents.length - 1; i++) {
        const current = dayEvents[i]
        const next = dayEvents[i + 1]
        const pairKey = `${current.id}-${next.id}`

        if (!travelTimes[pairKey]) {
          const origin = current.location || current.title
          const dest = next.location || next.title

          if (origin && dest && origin !== 'TBD' && dest !== 'TBD') {
            const fallbackTime = estimateTransitTimeFallback(origin, dest)
            newTravelTimes[pairKey] = fallbackTime
            changed = true

            if (window.google?.maps?.DistanceMatrixService) {
              const service = new window.google.maps.DistanceMatrixService()
              service.getDistanceMatrix(
                {
                  origins: [origin],
                  destinations: [dest],
                  travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (response, status) => {
                  if (status === 'OK' && response.rows[0]?.elements[0]?.duration) {
                    const text = response.rows[0].elements[0].duration.text
                    setTravelTimes(prev => ({
                      ...prev,
                      [pairKey]: text
                    }))
                  }
                }
              )
            }
          }
        }
      }
    })

    if (changed) {
      setTravelTimes(newTravelTimes)
    }
  }, [items])

  // Keep now updated every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleWhatsAppShare = () => {
    const dayItem = selectableDays.find(d => d.day === selectedDay)
    const dateStr = dayItem ? formatDate(dayItem.date) : ''
    
    // Get events for this day
    const dayEvents = items.filter(item => item.day === selectedDay)
    
    // Build the string
    let text = `🌴 *${(tripName || 'OUR TRIP').toUpperCase()} ITINERARY - DAY ${selectedDay}* 🌴\n`
    if (dateStr) {
      text += `📅 ${dateStr}\n`
    }
    text += `\n`
    
    if (dayEvents.length === 0) {
      text += `No activities planned for this day yet.\n`
    } else {
      // Sort dayEvents by time slot
      const sortedEvents = [...dayEvents].sort((a, b) => a.time.localeCompare(b.time))
      
      sortedEvents.forEach(item => {
        // category icon
        const icon = CATEGORY_ICONS[item.category] || '📍'
        text += `• *${item.time}* - ${item.title} ${icon}\n`
        
        if (item.location) {
          text += `📍 Location: ${item.location}\n`
        }
        if (item.note) {
          text += `📝 Note: ${item.note}\n`
        }
        text += `\n`
      })
    }
    
    text += `_Shared via TribePlan_`
    
    const encoded = encodeURIComponent(text)
    const url = `https://api.whatsapp.com/send?text=${encoded}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

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
        {/* Top Header Actions (Day Selector & WhatsApp Share) */}
        <div className="timeline-header-actions">
          <div className="day-selector-scroll">
            {selectableDays.map(d => (
              <button
                key={d.day}
                type="button"
                className={`day-chip${selectedDay === d.day ? ' day-chip--active' : ''}`}
                onClick={() => setSelectedDay(d.day)}
              >
                <span className="day-chip__num">Day {d.day}</span>
                <span className="day-chip__date">{d.sub}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="whatsapp-share-btn"
            onClick={handleWhatsAppShare}
            aria-label={`Share Day ${selectedDay} to WhatsApp`}
          >
            <svg className="whatsapp-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.785 1.059 3.548 1.621 5.361 1.622 5.405 0 9.805-4.379 9.808-9.76.002-2.607-1.015-5.059-2.864-6.91C17.054 2.253 14.6 1.238 12.002 1.238c-5.41 0-9.809 4.38-9.813 9.76-.002 2.056.544 4.062 1.584 5.86l-.997 3.646 3.871-.978zM17.47 15.39c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
            Share Day {selectedDay}
          </button>
        </div>

        {(() => {
          const dayItem = selectableDays.find(d => d.day === selectedDay)
          const dateStr = dayItem ? formatDate(dayItem.date) : ''
          const dayEvents = enrichedItems
            .filter(item => item.day === selectedDay)
            .sort((a, b) => a.time.localeCompare(b.time))

          return (
            <div className="timeline-day">
              <div className="timeline-day__header">
                <span className="timeline-day__badge">Day {selectedDay}</span>
                <span className="timeline-day__date">
                  {dateStr && `- ${dateStr}`}
                </span>
                <span className="timeline-day__count">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="timeline-day__items">
                {dayEvents.length === 0 ? (
                  <div className="timeline-day__empty-state">
                    <div className="timeline-day__empty-icon">🥾</div>
                    <h3 className="timeline-day__empty-title">No events for Day {selectedDay}</h3>
                    <p className="timeline-day__empty-desc">Click "Add Event" or use "✨ AI Planner" below to start scheduling!</p>
                  </div>
                ) : (
                  dayEvents.map((item, idx) => {
                    const nextItem = dayEvents[idx + 1]
                    const travelTimeText = nextItem ? travelTimes[`${item.id}-${nextItem.id}`] : null
                    return (
                      <Fragment key={item.id}>
                        <TimelineCard
                          item={item}
                          isLast={idx === dayEvents.length - 1}
                          isNew={item.id.startsWith('tl-') && /^\d{13}$/.test(item.id.slice(3))}
                          isClosestUpcoming={item.id === closestUpcomingId}
                          now={now}
                          onEditClick={handleEditClick}
                          onToggleDone={onToggleDone}
                          currentUser={currentUser}
                          isLeader={isLeader}
                          ideaItems={ideaItems}
                          timelineVotes={timelineVotes}
                          onAttachAlternative={onAttachAlternative}
                          onVoteAlternative={onVoteAlternative}
                          onLockWinningActivity={onLockWinningActivity}
                        />
                        {travelTimeText && (
                          <div className="timeline-transit-row">
                            <div className="timeline-transit-connector">
                              <div className="timeline-transit-line-dotted"></div>
                            </div>
                            <div className="timeline-transit-badge">
                              <span className="timeline-transit-icon">🚘</span>
                              <span className="timeline-transit-text">~{travelTimeText} drive to next stop</span>
                            </div>
                          </div>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </div>
            </div>
          )
        })()}
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
        isLeader={isLeader}
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

function TimelineCard({
  item,
  isLast,
  isNew,
  isClosestUpcoming,
  now,
  onEditClick,
  onToggleDone,
  currentUser,
  isLeader,
  ideaItems,
  timelineVotes,
  onAttachAlternative,
  onVoteAlternative,
  onLockWinningActivity,
}) {
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
    item.is_voting_slot ? 'timeline-card--voting' : '',
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
              {item.is_voting_slot && (
                <span className="timeline-card__voting-badge">🗳️ Voting Slot</span>
              )}
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

          {item.is_voting_slot && (
            <VotingSlotSection
              item={item}
              currentUser={currentUser}
              isLeader={isLeader}
              ideaItems={ideaItems}
              timelineVotes={timelineVotes}
              onAttachAlternative={onAttachAlternative}
              onVoteAlternative={onVoteAlternative}
              onLockWinningActivity={onLockWinningActivity}
            />
          )}
        </div>
      </div>
    </article>
  )
}

function VotingSlotSection({
  item,
  currentUser,
  isLeader,
  ideaItems,
  timelineVotes,
  onAttachAlternative,
  onVoteAlternative,
  onLockWinningActivity,
}) {
  const [showSelector, setShowSelector] = useState(false)

  // Get votes for this event
  const eventVotes = timelineVotes.filter(v => v.event_id === item.id)

  // Group alternative ideas
  const alternativeIdeas = (item.alternativeIdeaIds || [])
    .map(id => ideaItems.find(idea => idea.id === id))
    .filter(Boolean)

  // Compute votes count for each alternative
  const voteCounts = {}
  alternativeIdeas.forEach(idea => {
    voteCounts[idea.id] = eventVotes.filter(v => v.idea_id === idea.id).length
  })

  // Find highest vote count
  let highestVoteCount = -1
  alternativeIdeas.forEach(idea => {
    const count = voteCounts[idea.id] || 0
    if (count > highestVoteCount) {
      highestVoteCount = count
    }
  })

  // Determine active choices
  const isVoted = (ideaId) => {
    return eventVotes.some(v => v.idea_id === ideaId && v.member_name === currentUser)
  }

  // Get available ideas to link (not already linked)
  const availableIdeas = ideaItems.filter(idea => 
    !(item.alternativeIdeaIds || []).includes(idea.id)
  )

  return (
    <div className="timeline-card__voting-section">
      <span className="voting-section-title">Alternatives</span>
      
      {alternativeIdeas.length === 0 ? (
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0' }}>
          No alternatives attached yet.
        </p>
      ) : (
        <ul className="timeline-card__alternatives">
          {alternativeIdeas.map(idea => {
            const count = voteCounts[idea.id] || 0
            const hasVoted = isVoted(idea.id)
            const isHighest = count > 0 && count === highestVoteCount

            return (
              <li 
                key={idea.id} 
                className={`alternative-item${isHighest ? ' alternative-item--highest-voted' : ''}`}
              >
                <span className="alternative-item__title" title={idea.title}>
                  💡 {idea.title}
                </span>

                <div className="alternative-actions">
                  <button
                    type="button"
                    className={`alt-vote-btn${hasVoted ? ' alt-vote-btn--active' : ''}`}
                    onClick={() => onVoteAlternative(item.id, idea.id)}
                    aria-label={`Vote for ${idea.title}`}
                  >
                    👍 <span className="alt-vote-count">{count}</span>
                  </button>

                  {isLeader && isHighest && (
                    <button
                      type="button"
                      className="btn-lock-winner"
                      onClick={() => onLockWinningActivity(item.id, idea.id)}
                      title="Lock this activity as the final plan"
                    >
                      🔒 Lock
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {isLeader && (item.alternativeIdeaIds || []).length < 3 && (
        <>
          {!showSelector ? (
            <button
              type="button"
              className="btn-attach-alt"
              onClick={() => setShowSelector(true)}
            >
              + Attach Alternatives from Idea Bucket
            </button>
          ) : (
            <div className="alternative-selector">
              <select
                className="form-select select-alternative"
                onChange={(e) => {
                  if (e.target.value) {
                    onAttachAlternative(item.id, e.target.value)
                    setShowSelector(false)
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>-- Select an Idea --</option>
                {availableIdeas.map(idea => (
                  <option key={idea.id} value={idea.id}>
                    💡 {idea.title}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="btn-cancel-select" 
                onClick={() => setShowSelector(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
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
