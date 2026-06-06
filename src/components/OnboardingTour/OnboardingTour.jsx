import { useEffect } from 'react'
import './OnboardingTour.css'

const TOUR_STEPS = [
  {
    step: 1,
    title: "Welcome to TribePlan",
    text: "Welcome to TribePlan! This is your shared family command center.",
    badge: "📍 Navigation",
  },
  {
    step: 2,
    title: "Timeline Tab",
    text: "Here is your live daily schedule. Events automatically update in real-time and open directly in Google Maps when tapped!",
    badge: "📅 Schedule",
  },
  {
    step: 3,
    title: "Idea Bucket Tab",
    text: "Have a casual suggestion? Drop it in the sandbox here so your crew can upvote their favorite spots.",
    badge: "💡 Brainstorm",
  },
  {
    step: 4,
    title: "Split Bill Tab",
    text: "Track group costs seamlessly across IDR, USD, MYR, or SGD. The app automatically calculates who owes what.",
    badge: "💰 Expenses",
  },
]

export default function OnboardingTour({ activeStep, onNext, onBack, onSkip }) {
  const currentStep = TOUR_STEPS.find(s => s.step === activeStep) || TOUR_STEPS[0]

  useEffect(() => {
    // Disable body scroll while tour is active
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Onboarding Tour">
      <div className="tour-tooltip">
        <div className="tour-tooltip__header">
          <span className="tour-tooltip__badge">{currentStep.badge}</span>
          <span className="tour-tooltip__progress">Step {activeStep} of 4</span>
        </div>

        <h3 className="tour-tooltip__title">{currentStep.title}</h3>
        <p className="tour-tooltip__text">{currentStep.text}</p>

        {/* Embedded context-specific mock previews */}
        {activeStep === 2 && (
          <div className="tour-preview-container">
            <span className="tour-preview-label">Timeline Card Preview</span>
            <div className="tour-preview-card timeline-card" style={{ '--accent': 'var(--color-primary)' }}>
              <div className="timeline-card__body" style={{ margin: 0, padding: '12px' }}>
                <div className="timeline-card__time">14:00</div>
                <div className="timeline-card__content">
                  <div className="timeline-card__header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="timeline-card__category-icon" aria-hidden="true">🏨</span>
                      <span className="timeline-card__category-chip" style={{ '--chip-color': 'var(--color-primary)' }}>
                        accommodation
                      </span>
                    </div>
                  </div>
                  <h4 className="timeline-card__title" style={{ fontSize: '13.5px', margin: '4px 0', fontWeight: '700' }}>
                    ✨ Welcome check-in at Layar Villa
                  </h4>
                  <div className="timeline-card__location">
                    <span className="timeline-card__location-stacked" style={{ display: 'inline-flex', gap: '4px' }}>
                      <strong className="timeline-card__location-name" style={{ fontSize: '11px' }}>Layar Villa</strong>
                      <span className="timeline-card__location-address" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        - Jl. Drupadi, Seminyak, Bali
                      </span>
                    </span>
                  </div>
                  <p className="timeline-card__note" style={{ fontSize: '11px', marginTop: '6px', color: 'rgba(255,255,255,0.7)' }}>
                    Welcome to your trip command center! Click the location link above to navigate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="tour-preview-container">
            <span className="tour-preview-label">Idea Card Preview</span>
            <div className="tour-preview-card idea-card" style={{ padding: '12px', listStyle: 'none' }}>
              <div className="idea-card__rank">#1</div>
              <div className="idea-card__body" style={{ marginLeft: '12px', flex: 1 }}>
                <div className="idea-card__header" style={{ marginBottom: '4px' }}>
                  <h4 className="idea-card__title" style={{ fontSize: '13.5px', fontWeight: '700', margin: 0 }}>
                    Visit Secret Tegenungan Waterfall
                  </h4>
                  <span className="idea-card__author" style={{ fontSize: '11px' }}>by Aisyah</span>
                </div>
                <p className="idea-card__description" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  About 1 hr drive. Don't forget swimwear and cameras!
                </p>
                <div className="idea-card__footer" style={{ marginTop: '8px' }}>
                  <button type="button" className="idea-card__vote-btn active" style={{ padding: '4px 8px', fontSize: '11px', pointerEvents: 'none' }}>
                    👍 4 Upvotes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="tour-preview-container">
            <span className="tour-preview-label">Expense Card Preview</span>
            <div className="tour-preview-card ledger-row" style={{ padding: '12px', borderRadius: 'var(--radius-md)', listStyle: 'none' }}>
              <span className="ledger-row__icon" style={{ fontSize: '18px' }}>🏨</span>
              <div className="ledger-row__body" style={{ marginLeft: '10px', flex: 1 }}>
                <div className="ledger-row__desc" style={{ fontSize: '13px', fontWeight: '600' }}>Villa deposit payment</div>
                <div className="ledger-row__meta" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Paid by Dad • Split among 4
                </div>
              </div>
              <div className="ledger-row__amount-col" style={{ textAlign: 'right', marginLeft: '12px' }}>
                <div className="ledger-row__amount" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary-l)' }}>
                  $1,500.00
                </div>
                <div className="ledger-row__date" style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  2026-06-06
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="tour-tooltip__actions">
          <button
            type="button"
            className="tour-btn tour-btn--skip"
            onClick={onSkip}
          >
            {activeStep === 4 ? "Close" : "Skip"}
          </button>
          
          <div className="tour-tooltip__nav-btns">
            {activeStep > 1 && (
              <button
                type="button"
                className="tour-btn tour-btn--back"
                onClick={onBack}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="tour-btn tour-btn--next"
              onClick={onNext}
            >
              {activeStep === 4 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
