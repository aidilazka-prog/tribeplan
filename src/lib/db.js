/**
 * db.js  –  All Supabase query functions for TribePlan.
 *
 * Table map (PRD schema):
 *   trips            → tripConfig
 *   members          → tripConfig.members
 *   timeline_events  → timelineItems
 *   idea_bucket      → ideaItems
 *
 * NOTE: The PRD has no `expenses` table; expenses stay in local React state.
 */
import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function assert(data, error, context) {
  if (error) throw new Error(`[db/${context}] ${error.message}`)
  return data
}

// ─────────────────────────────────────────────────────────────
// TRIPS
// ─────────────────────────────────────────────────────────────

/**
 * Create a new trip + its initial member roster.
 * Returns { tripRow, memberRows }
 */
export async function createTrip({ tripName, leaderName, password, members, startDate, endDate }) {
  // 1. Insert the trip row
  const { data: tripRows, error: tripErr } = await supabase
    .from('trips')
    .insert({
      trip_name:     tripName,
      leader_name:   leaderName,
      join_password: password,
      start_date:    startDate || null,
    })
    .select()

  const tripRow = assert(tripRows, tripErr, 'createTrip')[0]

  // 2. Bulk-insert members (leader is always first in the list)
  const memberInserts = members.map(name => ({
    trip_id: tripRow.id,
    name,
  }))

  const { data: memberRows, error: membersErr } = await supabase
    .from('members')
    .insert(memberInserts)
    .select()

  assert(memberRows, membersErr, 'createTrip/members')

  return { tripRow, memberRows }
}

/**
 * Fetch a trip row by its UUID.
 */
export async function fetchTrip(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  return assert(data, error, 'fetchTrip')
}

// ─────────────────────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all member names for a trip (ordered insert order).
 * Returns string[] of names.
 */
export async function fetchMembers(tripId) {
  const { data, error } = await supabase
    .from('members')
    .select('id, name')
    .eq('trip_id', tripId)
    .order('id', { ascending: true })

  const rows = assert(data, error, 'fetchMembers')
  return rows  // [{ id, name }, ...]
}

/**
 * Add a single member to an existing trip.
 * Returns the new member row.
 */
export async function addMember(tripId, name) {
  const { data, error } = await supabase
    .from('members')
    .insert({ trip_id: tripId, name })
    .select()
    .single()

  return assert(data, error, 'addMember')
}

/**
 * Remove a member row by its UUID.
 */
export async function removeMember(memberId) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId)

  if (error) throw new Error(`[db/removeMember] ${error.message}`)
}

// ─────────────────────────────────────────────────────────────
// TIMELINE EVENTS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all timeline events for a trip, sorted by day then time.
 */
export async function fetchTimelineEvents(tripId) {
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('time_slot',  { ascending: true })

  return assert(data, error, 'fetchTimelineEvents')
}

/**
 * Add a new event to the timeline.
 * Returns the inserted row.
 */
export async function addTimelineEvent(tripId, { day, time, title, note, googleMapsUrl }) {
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({
      trip_id:          tripId,
      day_number:       day,
      time_slot:        time,
      title,
      notes:            note || null,
      google_maps_url:  googleMapsUrl || null,
    })
    .select()
    .single()

  return assert(data, error, 'addTimelineEvent')
}

/**
 * Bulk-insert multiple events to the timeline.
 * Returns the inserted rows.
 */
export async function addTimelineEventsBulk(events) {
  const { data, error } = await supabase
    .from('timeline_events')
    .insert(events)
    .select()

  return assert(data, error, 'addTimelineEventsBulk')
}

/**
 * Delete a timeline event by its UUID.
 */
export async function deleteTimelineEvent(eventId) {
  const { error } = await supabase
    .from('timeline_events')
    .delete()
    .eq('id', eventId)

  if (error) throw new Error(`[db/deleteTimelineEvent] ${error.message}`)
}

/**
 * Update a timeline event.
 */
export async function updateTimelineEvent(eventId, { day_number, time_slot, title, notes, google_maps_url }) {
  const { data, error } = await supabase
    .from('timeline_events')
    .update({
      day_number,
      time_slot,
      title,
      notes,
      google_maps_url,
    })
    .eq('id', eventId)
    .select()
    .single()

  return assert(data, error, 'updateTimelineEvent')
}

/**
 * Toggle the done state of a timeline event.
 */
export async function toggleEventDone(eventId, isDone) {
  const { data, error } = await supabase
    .from('timeline_events')
    .update({ is_done: isDone })
    .eq('id', eventId)
    .select()
    .single()

  return assert(data, error, 'toggleEventDone')
}

// ─────────────────────────────────────────────────────────────
// IDEA BUCKET
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all ideas for a trip, highest upvotes first.
 */
export async function fetchIdeas(tripId) {
  const { data, error } = await supabase
    .from('idea_bucket')
    .select('*')
    .eq('trip_id', tripId)
    .order('upvotes', { ascending: false })
    .order('id',      { ascending: true })

  return assert(data, error, 'fetchIdeas')
}

/**
 * Add a new idea to the bucket.
 * Returns the inserted row.
 */
export async function addIdea(tripId, { title, description, addedBy }) {
  const { data, error } = await supabase
    .from('idea_bucket')
    .insert({
      trip_id: tripId,
      title,
      // description & addedBy have no DB column in PRD schema;
      // they are stored locally in the row object for display only.
    })
    .select()
    .single()

  const row = assert(data, error, 'addIdea')

  // Merge non-persisted display fields back onto the returned object
  return { ...row, description: description || '', addedBy: addedBy || '', upvotedBy: [] }
}

/**
 * Delete an idea by its UUID.
 */
export async function deleteIdea(ideaId) {
  const { error } = await supabase
    .from('idea_bucket')
    .delete()
    .eq('id', ideaId)

  if (error) throw new Error(`[db/deleteIdea] ${error.message}`)
}

/**
 * Increment or decrement the upvote counter.
 * delta: +1 or -1
 * Uses a Postgres RPC or a simple read-modify-write via JS.
 */
export async function adjustUpvote(ideaId, currentUpvotes, delta) {
  const next = Math.max(0, currentUpvotes + delta)
  const { data, error } = await supabase
    .from('idea_bucket')
    .update({ upvotes: next })
    .eq('id', ideaId)
    .select('upvotes')
    .single()

  return assert(data, error, 'adjustUpvote').upvotes
}

/**
 * Move an idea to the timeline:
 *   1. Insert a new timeline_events row.
 *   2. Delete the idea_bucket row.
 * Returns the new timeline event row.
 */
export async function promoteIdeaToTimeline(ideaId, tripId, { day, time, title, note, googleMapsUrl }) {
  const [{ data: evtRows, error: evtErr }] = await Promise.all([
    supabase
      .from('timeline_events')
      .insert({
        trip_id:          tripId,
        day_number:       day,
        time_slot:        time,
        title,
        notes:            note || null,
        google_maps_url:  googleMapsUrl || null,
      })
      .select(),
  ])

  assert(evtRows, evtErr, 'promoteIdeaToTimeline/insert')

  const { error: delErr } = await supabase
    .from('idea_bucket')
    .delete()
    .eq('id', ideaId)

  if (delErr) throw new Error(`[db/promoteIdeaToTimeline/delete] ${delErr.message}`)

  return evtRows[0]
}

// ─────────────────────────────────────────────────────────────
// PACKING ITEMS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all packing items for a trip.
 */
export async function fetchPackingItems(tripId) {
  const { data, error } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('id', { ascending: true })

  return assert(data, error, 'fetchPackingItems')
}

/**
 * Add a new item to the packing list.
 */
export async function addPackingItem(tripId, { itemName, category, assignedTo }) {
  const { data, error } = await supabase
    .from('packing_items')
    .insert({
      trip_id: tripId,
      item_name: itemName,
      category,
      assigned_to: assignedTo || null,
      is_packed: false,
    })
    .select()
    .single()

  return assert(data, error, 'addPackingItem')
}

/**
 * Toggle the packed status of a packing item.
 */
export async function togglePackingItem(itemId, isPacked) {
  const { data, error } = await supabase
    .from('packing_items')
    .update({ is_packed: isPacked })
    .eq('id', itemId)
    .select()
    .single()

  return assert(data, error, 'togglePackingItem')
}

/**
 * Delete a packing item.
 */
export async function deletePackingItem(itemId) {
  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(`[db/deletePackingItem] ${error.message}`)
}
