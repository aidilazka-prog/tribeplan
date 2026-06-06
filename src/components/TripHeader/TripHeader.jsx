import './TripHeader.css'

export default function TripHeader({ trip, currentUser, isLeader, activeTab, onLeave, onManage, onStartTour }) {
  const tabTitles = {
    timeline: '📅 Timeline',
    ideas:    '💡 Idea Bucket',
    expenses: '💰 Expenses',
  }

  const dateRange = trip.startDate && trip.endDate
    ? `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`
    : trip.startDate ? `From ${formatDate(trip.startDate)}` : null

  return (
    <header className="trip-header" role="banner">
      <div className="trip-header__top">
        <div className="trip-header__info">
          <div className="trip-header__meta">
            <span className="trip-header__leader-badge">⭐ {trip.leaderName}</span>
            {dateRange && <span className="trip-header__dates">{dateRange}</span>}
          </div>
          <h1 className="trip-header__title">{trip.tripName}</h1>
        </div>

        <div className="trip-header__actions">
          {/* Manage Trip — leader only */}
          {isLeader && onManage && (
            <button
              id="manage-trip-btn"
              className="trip-header__action-btn trip-header__action-btn--manage"
              onClick={onManage}
              aria-label="Manage trip: add members or share link"
              title="Manage Trip"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </button>
          )}

          {/* Manual App Tour */}
          {onStartTour && (
            <button
              id="start-tour-btn"
              className="trip-header__action-btn trip-header__action-btn--tour"
              onClick={onStartTour}
              aria-label="Take App Tour"
              title="Take App Tour"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .5 2.2 1.5 3.1.7.8 1.3 1.5 1.5 2.4" />
                <line x1="9" y1="18" x2="15" y2="18" />
                <line x1="10" y1="22" x2="14" y2="22" />
              </svg>
            </button>
          )}

          {/* Switch user / Leave */}
          <button
            id="leave-trip-btn"
            className="trip-header__action-btn"
            onClick={onLeave}
            aria-label="Switch user"
            title="Switch User"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="trip-header__bottom">
        <div className="trip-header__tab-label">{tabTitles[activeTab]}</div>
        <div className={`trip-header__user-badge${isLeader ? ' trip-header__user-badge--leader' : ''}`}>
          {isLeader ? '⭐' : '👤'} {currentUser}
        </div>
      </div>
    </header>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}
