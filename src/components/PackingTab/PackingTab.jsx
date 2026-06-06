import { useState, useEffect } from 'react'
import * as db from '../../lib/db'
import { supabase } from '../../lib/supabase'
import './PackingTab.css'

const CATEGORIES = [
  { value: 'Clothing', label: '👕 Clothing' },
  { value: 'Electronics', label: '🔌 Electronics' },
  { value: 'Toiletries', label: '🧼 Toiletries' },
  { value: 'Documents', label: '📄 Documents' },
  { value: 'Medicine', label: '💊 Medicine/First Aid' },
]

export default function PackingTab({ tripId, members = [] }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ itemName: '', category: 'Clothing', assignedTo: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchItems = async () => {
    try {
      const data = await db.fetchPackingItems(tripId)
      setItems(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load packing items.')
    }
  }

  // Load items and subscribe to real-time updates
  useEffect(() => {
    fetchItems()

    const channel = supabase
      .channel(`public:packing_items:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_items',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload
          if (eventType === 'INSERT') {
            setItems(prev => {
              if (prev.some(i => i.id === newRow.id)) return prev
              return [...prev, newRow]
            })
          } else if (eventType === 'UPDATE') {
            setItems(prev => prev.map(i => i.id === newRow.id ? newRow : i))
          } else if (eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== oldRow.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])

  const handleInputChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!form.itemName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const newItem = await db.addPackingItem(tripId, {
        itemName: form.itemName.trim(),
        category: form.category,
        assignedTo: form.assignedTo,
      })
      // Local state is updated by the realtime subscription,
      // but we append it optimistically for instant response
      setItems(prev => {
        if (prev.some(i => i.id === newItem.id)) return prev
        return [...prev, newItem]
      })
      setForm(prev => ({ ...prev, itemName: '' }))
    } catch (err) {
      console.error(err)
      setError('Failed to add packing item.')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePacked = async (item) => {
    const nextVal = !item.is_packed
    // Optimistic local update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_packed: nextVal } : i))

    try {
      await db.togglePackingItem(item.id, nextVal)
    } catch (err) {
      console.error(err)
      // Revert on error
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_packed: item.is_packed } : i))
      setError('Failed to update item.')
    }
  }

  const handleDeleteItem = async (itemId) => {
    // Optimistic local update
    setItems(prev => prev.filter(i => i.id !== itemId))

    try {
      await db.deletePackingItem(itemId)
    } catch (err) {
      console.error(err)
      // Revert/refresh on error
      fetchItems()
      setError('Failed to delete item.')
    }
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="packing-tab">
      <div className="packing-header">
        <h2 className="packing-title">📦 Family Packing List</h2>
        <p className="packing-subtitle">Coordinate who brings what for the trip.</p>
      </div>

      {/* Item Input Form */}
      <form onSubmit={handleAddItem} className="packing-form">
        <div className="form-row">
          <div className="form-field flex-2">
            <input
              type="text"
              className="form-input"
              placeholder="What needs to be packed? (e.g. Sunscreen)"
              value={form.itemName}
              onChange={handleInputChange('itemName')}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field flex-1">
            <select
              className="form-select"
              value={form.category}
              onChange={handleInputChange('category')}
              disabled={loading}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field flex-1">
            <select
              className="form-select"
              value={form.assignedTo}
              onChange={handleInputChange('assignedTo')}
              disabled={loading}
            >
              <option value="">👤 Anyone</option>
              {members.map(name => (
                <option key={name} value={name}>
                  👤 {name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn--primary add-item-btn"
            disabled={loading || !form.itemName.trim()}
          >
            + Add Item
          </button>
        </div>
      </form>

      {error && (
        <div className="packing-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Main Body List Section */}
      <div className="packing-content">
        {items.length === 0 ? (
          <div className="packing-empty-state">
            <span className="packing-empty-icon">🎒</span>
            <h3>Packing List is Empty</h3>
            <p>Add some items above to coordinate your family packing list!</p>
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const catItems = groupedItems[cat.value] || []
            if (catItems.length === 0) return null

            return (
              <div key={cat.value} className="packing-group">
                <h3 className="packing-group-title">{cat.label}</h3>
                <ul className="packing-list" role="list">
                  {catItems.map(item => {
                    const isPacked = item.is_packed
                    return (
                      <li
                        key={item.id}
                        className={`packing-item-row${isPacked ? ' packing-item-row--packed' : ''}`}
                        role="listitem"
                      >
                        <div className="packing-item-left">
                          <button
                            type="button"
                            className={`packing-checkbox${isPacked ? ' packing-checkbox--checked' : ''}`}
                            onClick={() => handleTogglePacked(item)}
                            aria-label={isPacked ? `Mark ${item.item_name} as unpacked` : `Mark ${item.item_name} as packed`}
                          >
                            {isPacked && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                                strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <span className="packing-item-name">{item.item_name}</span>
                        </div>

                        <div className="packing-item-right">
                          {item.assigned_to && (
                            <span className="packing-member-chip">
                              {item.assigned_to}
                            </span>
                          )}
                          <button
                            type="button"
                            className="packing-delete-btn"
                            onClick={() => handleDeleteItem(item.id)}
                            aria-label={`Delete ${item.item_name}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                              strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
