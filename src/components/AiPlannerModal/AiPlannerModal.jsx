import { useState, useRef, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import './AiPlannerModal.css'

export default function AiPlannerModal({ isOpen, onClose, onSubmit, tripName, numDays }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      setError(null)
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setError('Gemini API key is not configured. Please define VITE_GEMINI_API_KEY in your local environment settings.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            description: 'List of itinerary events',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Enthralling and specific title for the event' },
                dayNumber: { type: 'INTEGER', description: `Day of the trip (1 to ${numDays})` },
                timeSlot: { type: 'STRING', description: 'Start time in 24h format HH:MM' },
                locationName: { type: 'STRING', description: 'Name of the attraction, venue, or site' },
                physicalAddress: { type: 'STRING', description: 'Physical address if known' },
                category: { type: 'STRING', description: 'accommodation, food, activity, culture, leisure, or transport' },
                note: { type: 'STRING', description: 'Helpful details, suggestions, tips, or notes' }
              },
              required: ['title', 'dayNumber', 'timeSlot', 'category', 'locationName']
            }
          }
        },
        systemInstruction: `You are a local travel guide expert.
Generate realistic time slots, realistic restaurant/attraction names, and helpful descriptions for the notes field.
The trip destination or name is: ${tripName}.
The total duration is ${numDays} days.
Make sure the dayNumber for every event is an integer strictly between 1 and ${numDays} inclusive. Do not generate events for days outside this range.`
      }, { apiVersion: 'v1beta' })

      const fullPrompt = `Please plan an itinerary for a trip named "${tripName}".
The user request or preference is: "${prompt}".
Generate a list of recommended events for this ${numDays}-day trip.`

      const result = await model.generateContent(fullPrompt)
      const responseText = result.response.text()
      
      const parsedData = JSON.parse(responseText)
      if (!Array.isArray(parsedData)) {
        throw new Error('AI returned an invalid format. Expected an array of events.')
      }

      await onSubmit(parsedData)
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred while generating the itinerary.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container ai-planner-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">✨ AI Itinerary Planner</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p className="modal-help-text">
            Let Gemini plan your {numDays}-day trip to <strong>{tripName}</strong>! 
            Describe your preferred travel style (e.g., "Relaxed sightseeing", "Culinary exploration", "Thrill-seeking activities").
          </p>

          <div className="form-field">
            <label htmlFor="ai-prompt-input" className="form-label">What kind of trip do you want to plan?</label>
            <textarea
              id="ai-prompt-input"
              ref={textareaRef}
              className="form-textarea"
              placeholder='e.g., "Mainly local Indonesian foods, checking out beautiful beach clubs for sunset, and cultural temple walks..."'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="modal-error-banner" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn--ai-primary${loading ? ' btn--loading' : ''}`}
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Generating Itinerary...
                </>
              ) : (
                <>
                  ✨ Generate Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
