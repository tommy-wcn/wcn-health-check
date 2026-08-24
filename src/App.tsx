import { useEffect, useRef, useState } from 'react'
import { QUESTIONS, STAGES } from './data/questions'

function App() {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const confettiTimer = useRef<number | undefined>(undefined)

  const question = QUESTIONS[questionIndex]
  const selected = answers[question.id] ?? null
  const isLastQuestion = questionIndex === QUESTIONS.length - 1
  const answeredCount = Object.keys(answers).length
  const progress = (answeredCount / QUESTIONS.length) * 100

  useEffect(() => () => window.clearTimeout(confettiTimer.current), [])

  const handleSelect = (level: number) => {
    setAnswers((prev) => ({ ...prev, [question.id]: level }))
    if (level === 4) {
      window.clearTimeout(confettiTimer.current)
      setShowConfetti(true)
      confettiTimer.current = window.setTimeout(() => setShowConfetti(false), 2000)
    }
  }

  const handleContinue = () => {
    if (isLastQuestion) {
      setFinished(true)
    } else {
      setQuestionIndex(questionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Wildlife Conservation Network
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Organizational Health Check
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Assess your organization's maturity across key dimensions.
          Select the stage that best describes where you are today.
        </p>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>
            {finished
              ? 'Complete'
              : `Question ${questionIndex + 1} of ${QUESTIONS.length}`}
          </span>
          <span>{selected ? `Stage ${selected} selected` : 'Select a stage'}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 md:p-12 border border-slate-700">
          {finished ? (
            /* Results */
            <div className="text-center">
              <div className="text-5xl mb-4" aria-hidden="true">🌾</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                Health check complete
              </h2>
              <ul className="max-w-md mx-auto space-y-3 text-left">
                {QUESTIONS.map((q) => {
                  const stage = STAGES.find((s) => s.level === answers[q.id])
                  return (
                    <li
                      key={q.id}
                      className="flex items-center justify-between rounded-xl bg-slate-700/50 px-4 py-3"
                    >
                      <span className="text-slate-300">{q.title}</span>
                      <span className="text-white font-medium">
                        <span aria-hidden="true">{stage?.icon} </span>
                        {stage?.name}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                onClick={() => setFinished(false)}
                className="mt-8 px-6 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
              >
                ← Back to questions
              </button>
            </div>
          ) : (
            <>
              {/* Question */}
              <div className="mb-8">
                <p className="text-sm font-medium uppercase tracking-wide text-emerald-400 mb-2">
                  {question.category}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">{question.icon}</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{question.title}</h2>
                </div>
              </div>

              {/* Stage Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STAGES.map((stage, stageIdx) => (
                  <button
                    key={stage.level}
                    type="button"
                    onClick={() => handleSelect(stage.level)}
                    aria-pressed={selected === stage.level}
                    className={`stage-card bg-gradient-to-br ${stage.gradient} ${
                      selected === stage.level ? 'selected' : ''
                    }`}
                  >
                    {/* Level Badge */}
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white font-bold">
                      {stage.level}
                    </div>

                    <div className="text-5xl mb-4" aria-hidden="true">{stage.icon}</div>

                    <h3 className="text-xl font-bold text-white mb-1">{stage.name}</h3>
                    <p className="text-white/70 text-sm mb-4">{stage.subtitle}</p>

                    {/* Description */}
                    <ul className="space-y-2">
                      {question.stageDescriptions[stageIdx].map((item, i) => (
                        <li key={i} className="text-white/90 text-xs flex items-start gap-2">
                          <span className="text-white/50 mt-0.5" aria-hidden="true">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Selected indicator */}
                    {selected === stage.level && (
                      <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-slate-900"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-10">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={questionIndex === 0}
                  className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                    questionIndex === 0
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!selected}
                  className={`px-8 py-3 rounded-xl font-medium transition-all ${
                    selected
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isLastQuestion ? 'Finish →' : 'Continue →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-6xl animate-bounce" aria-hidden="true">🎉</div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12 text-center text-slate-500 text-sm">
        <p>Built with 💚 for conservation</p>
      </div>
    </div>
  )
}

export default App
