import { useState, useEffect, useCallback } from 'react'
import * as db from './lib/db'
import { EXPENSE_ITEMS } from './data/mockData'
import LandingPage    from './components/LandingPage/LandingPage'
import BottomNav      from './components/BottomNav/BottomNav'
import TripHeader     from './components/TripHeader/TripHeader'
import TimelineTab    from './components/TimelineTab/TimelineTab'
import IdeaBucketTab  from './components/IdeaBucketTab/IdeaBucketTab'
import ExpensesTab    from './components/ExpensesTab/ExpensesTab'
import './App.css'

const TABS = {
  TIMELINE: 'timeline',
  IDEAS:    'ideas',
  EXPENSES: 'expenses',
}

// ── Map DB rows → app shape ───────────────────────────────────
function toTimelineItem(row) {
  let location = ''
  let note = ''
  let category = 'activity'
  try {
    if (row.notes && row.notes.trim().startsWith('{')) {
      const parsed = JSON.parse(row.notes)
      location = parsed.location || ''
      note = parsed.note || ''
      category = parsed.category || 'activity'
    } else {
      location = row.notes || ''
      note = ''
    }
  } catch {
    location = row.notes || ''
    note = ''
  }
  return {
    id:            row.id,
    day:           row.day_number,
    date:          null,               // derived from startDate in render
    time:          row.time_slot,
    title:         row.title,
    location,
    note,
    category,
    googleMapsUrl: row.google_maps_url ?? '',
    isDone:        row.is_done ?? false,
  }
}

function toIdeaItem(row) {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description ?? '',   // local-only field
    addedBy:     row.addedBy     ?? '',   // local-only field
    upvotes:     row.upvotes,
    upvotedBy:   row.upvotedBy   ?? [],   // local-only field (no DB column)
  }
}

// ─────────────────────────────────────────────────────────────
export default function App() {
  // ── Session ───────────────────────────────────────────────
  const [tripConfig,   setTripConfig]   = useState(null)   // null → landing
  const [currentUser,  setCurrentUser]  = useState(null)   // null → landing
  const [manageConfig, setManageConfig] = useState(null)

  // ── Tab ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(TABS.TIMELINE)

  // ── Remote data ───────────────────────────────────────────
  const [timelineItems, setTimelineItems] = useState([])
  const [ideaItems,     setIdeaItems]     = useState([])

  // ── Local-only (no DB column in PRD schema) ───────────────
  const [expenseItems,  setExpenseItems]  = useState(EXPENSE_ITEMS)

  // ── UI state ──────────────────────────────────────────────
  const [loading,      setLoading]      = useState(false)
  const [dbError,      setDbError]      = useState(null)
  const [urlLoading,   setUrlLoading]   = useState(false)   // fetching trip from /join/:id URL
  const [deepLinkView, setDeepLinkView] = useState(null)    // 'join' when arriving via share link

  // ── Load data when a trip is active ───────────────────────
  const loadTripData = useCallback(async (tripId) => {
    setLoading(true)
    setDbError(null)
    try {
      const [events, ideas] = await Promise.all([
        db.fetchTimelineEvents(tripId),
        db.fetchIdeas(tripId),
      ])
      setTimelineItems(events.map(toTimelineItem))
      setIdeaItems(ideas.map(toIdeaItem))
    } catch (err) {
      console.error(err)
      setDbError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tripConfig?.id) {
      loadTripData(tripConfig.id)
    }
  }, [tripConfig?.id, loadTripData])

  // ── Load Google Maps JavaScript API (Places library) ────────
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return

    const scriptId = 'google-maps-script'
    if (document.getElementById(scriptId)) return

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  // ── Deep-link: read /join/:tripId from the URL on first load
  useEffect(() => {
    const match = window.location.pathname.match(/^\/join\/([^/]+)$/)
    if (!match) return

    const tripId = match[1]
    setUrlLoading(true)

    Promise.all([
      db.fetchTrip(tripId),
      db.fetchMembers(tripId),
    ])
      .then(([tripRow, memberRows]) => {
        setTripConfig({
          id:         tripRow.id,
          tripName:   tripRow.trip_name,
          leaderName: tripRow.leader_name,
          password:   tripRow.join_password,
          members:    memberRows.map(r => r.name),
          memberRows,
          startDate:  tripRow.start_date || null,
          endDate:    null,
          joinCode:   tripRow.id.slice(0, 6).toUpperCase(),
        })
        setDeepLinkView('join')
        // Clean the UUID out of the address bar (no reload)
        window.history.replaceState({}, '', '/')
      })
      .catch(err => {
        console.error('[deep-link]', err)
        setDbError('Could not load the trip from this link. It may no longer exist.')
      })
      .finally(() => setUrlLoading(false))
  }, []) // runs once on mount only

  // ── Create trip (leader) ───────────────────────────────────
  const handleCreateTrip = async (config) => {
    // config comes from LandingPage after Supabase insert;
    // it already has id + members from the DB.
    setTripConfig(config)
    setCurrentUser(config.leaderName)
    setActiveTab(TABS.TIMELINE)
    setExpenseItems(EXPENSE_ITEMS)
    setTimelineItems([])
    setIdeaItems([])
  }

  // ── Join trip ──────────────────────────────────────────────
  const handleJoinTrip = (memberName) => {
    setCurrentUser(memberName)
    setManageConfig(null)
    setActiveTab(TABS.TIMELINE)
  }

  // ── Leader: open manage screen ────────────────────────────
  const handleManageTrip = () => {
    setManageConfig(tripConfig)
    setCurrentUser(null)
  }

  // ── Leader: save manage-screen changes ────────────────────
  const handleUpdateTrip = async (updatedConfig) => {
    setTripConfig(updatedConfig)
    setManageConfig(null)
    setCurrentUser(updatedConfig.leaderName)
  }

  // ── Leave (keep tripConfig in memory for next join) ────────
  const handleLeave = () => {
    setManageConfig(null)
    setCurrentUser(null)
  }

  // ── Full-screen loader while resolving a /join/:id deep link
  if (urlLoading) {
    return (
      <div className="app-shell" style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>🌴</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading trip…</p>
      </div>
    )
  }

  // ── Show landing when nobody is logged in ─────────────────
  if (!currentUser) {
    return (
      <LandingPage
        onCreateTrip={handleCreateTrip}
        onJoinTrip={handleJoinTrip}
        onUpdateTrip={handleUpdateTrip}
        activeTripConfig={tripConfig}
        manageConfig={manageConfig}
        initialView={deepLinkView}
      />
    )
  }

  // ── Dashboard ─────────────────────────────────────────────
  const isLeader  = currentUser === tripConfig.leaderName
  const members   = tripConfig.members   // string[]
  const selectableDays = getSelectableDays(tripConfig.startDate, tripConfig.endDate)
  const DAY_DATES = {}
  selectableDays.forEach(d => {
    DAY_DATES[d.day] = d.date
  })
  const enrichedTimelineItems = timelineItems.map(item => ({
    ...item,
    date: DAY_DATES[item.day] || DAY_DATES[1],
  }))

  // ── Timeline handlers ──────────────────────────────────────
  const handleAddEvent = async ({ day, time, title, location, category, note, googleMapsUrl }) => {
    // Optimistic: add placeholder immediately
    const tempId = `tmp-${Date.now()}`
    const optimistic = {
      id: tempId, day, date: DAY_DATES[day] ?? DAY_DATES[1],
      time, title, location: location || '', note: note || '', category,
      googleMapsUrl: googleMapsUrl || '',
      isDone: false,
    }
    setTimelineItems(prev =>
      [...prev, optimistic].sort((a, b) =>
        a.day !== b.day ? a.day - b.day : a.time.localeCompare(b.time)
      )
    )

    try {
      const notesJson = JSON.stringify({
        location: location || '',
        note: note || '',
        category: category || 'activity'
      })
      const row = await db.addTimelineEvent(tripConfig.id, {
        day, time, title, note: notesJson, googleMapsUrl
      })
      const real = { ...toTimelineItem(row), date: DAY_DATES[day] ?? DAY_DATES[1] }
      setTimelineItems(prev =>
        prev.map(i => i.id === tempId ? real : i)
          .sort((a, b) => a.day !== b.day ? a.day - b.day : a.time.localeCompare(b.time))
      )
    } catch (err) {
      console.error(err)
      setTimelineItems(prev => prev.filter(i => i.id !== tempId))
      setDbError(err.message)
    }
  }

  const handleEditEvent = async (updatedEvent) => {
    // Optimistic state update
    setTimelineItems(prev =>
      prev.map(i => i.id === updatedEvent.id ? { ...i, ...updatedEvent, day: Number(updatedEvent.day) } : i)
        .sort((a, b) => a.day !== b.day ? a.day - b.day : a.time.localeCompare(b.time))
    )

    try {
      const notesJson = JSON.stringify({
        location: updatedEvent.location || '',
        note: updatedEvent.note || '',
        category: updatedEvent.category || 'activity',
      })
      await db.updateTimelineEvent(updatedEvent.id, {
        day_number: Number(updatedEvent.day),
        time_slot: updatedEvent.time,
        title: updatedEvent.title,
        notes: notesJson,
        google_maps_url: updatedEvent.googleMapsUrl || null,
      })
    } catch (err) {
      console.error(err)
      setDbError(err.message)
      loadTripData(tripConfig.id)
    }
  }

  const handleToggleDone = async (eventId, currentIsDone) => {
    const nextVal = !currentIsDone
    setTimelineItems(prev =>
      prev.map(i => i.id === eventId ? { ...i, isDone: nextVal } : i)
    )

    try {
      await db.toggleEventDone(eventId, nextVal)
    } catch (err) {
      console.error(err)
      setDbError(err.message)
      setTimelineItems(prev =>
        prev.map(i => i.id === eventId ? { ...i, isDone: currentIsDone } : i)
      )
    }
  }

  // ── Idea handlers ──────────────────────────────────────────
  const handleAddIdea = async ({ title, description, addedBy }) => {
    const tempId = `tmp-${Date.now()}`
    const optimistic = { id: tempId, title, description, addedBy, upvotes: 0, upvotedBy: [] }
    setIdeaItems(prev => [optimistic, ...prev])

    try {
      const row = await db.addIdea(tripConfig.id, { title, description, addedBy })
      setIdeaItems(prev => prev.map(i => i.id === tempId ? { ...row, description, addedBy } : i))
    } catch (err) {
      console.error(err)
      setIdeaItems(prev => prev.filter(i => i.id !== tempId))
      setDbError(err.message)
    }
  }

  const handleUpvoteIdea = async (ideaId, member) => {
    // Optimistic local toggle
    setIdeaItems(prev => prev.map(item => {
      if (item.id !== ideaId) return item
      const alreadyVoted = item.upvotedBy.includes(member)
      const delta = alreadyVoted ? -1 : 1
      return {
        ...item,
        upvotes:   item.upvotes + delta,
        upvotedBy: alreadyVoted
          ? item.upvotedBy.filter(m => m !== member)
          : [...item.upvotedBy, member],
        _delta: delta,
      }
    }))

    // Persist to DB
    const item = ideaItems.find(i => i.id === ideaId)
    if (!item) return
    const alreadyVoted = item.upvotedBy.includes(member)
    const delta = alreadyVoted ? -1 : 1

    try {
      await db.adjustUpvote(ideaId, item.upvotes, delta)
    } catch (err) {
      console.error(err)
      // Revert on failure
      setIdeaItems(prev => prev.map(i => i.id === ideaId ? item : i))
      setDbError(err.message)
    }
  }

  const handleMoveToTimeline = async (ideaId, { day, time }) => {
    const idea = ideaItems.find(i => i.id === ideaId)
    if (!idea) return

    // Extract location from idea description if present (e.g. 📍 Location: Ubud, Bali)
    let googleMapsUrl = ''
    let locationText = 'To be confirmed'
    const locMatch = idea.description.match(/📍 Location:\s*(.*)/)
    if (locMatch) {
      locationText = locMatch[1].trim()
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`
    }

    // Optimistic: remove from ideas, add to timeline
    setIdeaItems(prev => prev.filter(i => i.id !== ideaId))
    const tempId = `tmp-${Date.now()}`
    const optimistic = {
      id: tempId, day, date: DAY_DATES[day] ?? DAY_DATES[1],
      time, title: idea.title, location: locationText,
      note: idea.description, category: 'activity',
      googleMapsUrl,
    }
    setTimelineItems(prev =>
      [...prev, optimistic].sort((a, b) =>
        a.day !== b.day ? a.day - b.day : a.time.localeCompare(b.time)
      )
    )

    try {
      const notesJson = JSON.stringify({
        location: locationText,
        note: idea.description || '',
        category: 'activity'
      })
      const row = await db.promoteIdeaToTimeline(ideaId, tripConfig.id, {
        day, time, title: idea.title, note: notesJson, googleMapsUrl,
      })
      const real = { ...toTimelineItem(row), date: DAY_DATES[day] ?? DAY_DATES[1] }
      setTimelineItems(prev =>
        prev.map(i => i.id === tempId ? real : i)
          .sort((a, b) => a.day !== b.day ? a.day - b.day : a.time.localeCompare(b.time))
      )
    } catch (err) {
      console.error(err)
      // Revert both
      setIdeaItems(prev => [idea, ...prev])
      setTimelineItems(prev => prev.filter(i => i.id !== tempId))
      setDbError(err.message)
    }
  }

  // ── Expense handlers (local only, no DB) ───────────────────
  const handleAddExpense = ({ description, amount, paidBy, splitAmong, category }) => {
    setExpenseItems(prev => [{
      id: `exp-${Date.now()}`,
      description,
      amount:      parseFloat(amount),
      currency:    'USD',
      paidBy,      splitAmong,
      category:    category || 'other',
      date:        new Date().toISOString().split('T')[0],
    }, ...prev])
  }

  const handleDeleteExpense = (expId) => {
    setExpenseItems(prev => prev.filter(e => e.id !== expId))
  }

  // ── Error toast (simple) ───────────────────────────────────
  const ErrorBanner = dbError ? (
    <div role="alert" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#f87171', color: '#1a1a1a',
      padding: '10px 16px', fontSize: '13px', fontWeight: 600,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>⚠️ {dbError}</span>
      <button onClick={() => setDbError(null)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
        ✕
      </button>
    </div>
  ) : null

  // ── Loading overlay ────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 36 }}>🌴</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading trip data…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {ErrorBanner}

      <TripHeader
        trip={tripConfig}
        currentUser={currentUser}
        isLeader={isLeader}
        activeTab={activeTab}
        onLeave={handleLeave}
        onManage={isLeader ? handleManageTrip : undefined}
      />

      <main className="tab-content" role="main">
        {activeTab === TABS.TIMELINE && (
          <TimelineTab
            items={enrichedTimelineItems}
            onAddEvent={handleAddEvent}
            onEditEvent={handleEditEvent}
            onToggleDone={handleToggleDone}
            selectableDays={selectableDays}
          />
        )}
        {activeTab === TABS.IDEAS && (
          <IdeaBucketTab
            items={ideaItems}
            onUpvote={handleUpvoteIdea}
            onMoveToTimeline={handleMoveToTimeline}
            onAddIdea={handleAddIdea}
            currentUser={currentUser}
            members={members}
            timelineItems={enrichedTimelineItems}
            selectableDays={selectableDays}
          />
        )}
        {activeTab === TABS.EXPENSES && (
          <ExpensesTab
            items={expenseItems}
            members={members}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} tabs={TABS} />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function getSelectableDays(startDate, endDate) {
  const base = startDate ? new Date(startDate) : new Date('2026-07-10')
  
  // Calculate duration. If endDate is set, use it. Otherwise, default to 30 days.
  let numDays = 30
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end - start
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    if (diffDays > 0) numDays = diffDays
  }
  
  const days = []
  for (let i = 0; i < numDays; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    
    const formattedDate = d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    
    days.push({
      day: i + 1,
      date: dateStr,
      label: `Day ${i + 1}`,
      sub: formattedDate,
    })
  }
  return days
}
