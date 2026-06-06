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

  useEffect(() => {
    if (activeStep === 1) return

    const timer = setTimeout(() => {
      const mockCard = document.querySelector('.tour-highlight-mock')
      if (mockCard) {
        mockCard.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [activeStep])

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Onboarding Tour">
      {/* Visual cutout spotlight based on the active step */}
      <div className={`tour-spotlight tour-spotlight--step${activeStep}`} aria-hidden="true" />

      <div className={`tour-tooltip tour-tooltip--step${activeStep}`}>
        <div className="tour-tooltip__header">
          <span className="tour-tooltip__badge">{currentStep.badge}</span>
          <span className="tour-tooltip__progress">Step {activeStep} of 4</span>
        </div>

        <h3 className="tour-tooltip__title">{currentStep.title}</h3>
        <p className="tour-tooltip__text">{currentStep.text}</p>

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
