import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GrowingTree } from './GrowingTree'
import { translations, languages, categoryIcons, questionPlantIcons, type Language } from './i18n'

// Question IDs per category (static structure)
const questionIds = [
  [101, 102, 103, 104, 105],           // Registration & Governance
  [201, 202, 203, 204, 205, 206],      // Human Resources
  [301, 302, 303, 304],                // Strategic Planning
  [401, 402, 403, 404],                // Finance & Accounting
  [501, 502, 503, 504, 505],           // Commitment to People
  [601, 602, 603, 604],                // Infrastructure
  [701, 702, 703, 704],                // Donor Engagement
  [801, 802, 803, 804],                // External Marketing
]

const stageStyles = [
  { bgGradient: 'bg-gradient-to-br from-amber-950/30 to-stone-950/40' },
  { bgGradient: 'bg-gradient-to-br from-lime-950/30 to-green-950/40' },
  { bgGradient: 'bg-gradient-to-br from-emerald-950/30 to-teal-950/40' },
  { bgGradient: 'bg-gradient-to-br from-green-950/30 to-emerald-950/40' },
]

function App() {
  const [currentCategory, setCurrentCategory] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [lang, setLang] = useState<Language>('en')
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)

  const t = translations[lang]
  const qIds = questionIds[currentCategory]
  const categoryT = t.categories[currentCategory]
  const totalQuestions = qIds.length
  const answeredInCategory = qIds.filter(id => answers[id]).length
  const categoryProgress = (answeredInCategory / totalQuestions) * 100
  const categoryScore = qIds.reduce((sum, id) => sum + (answers[id] || 0), 0)
  const maxCategoryScore = totalQuestions * 4
  const categoryScorePercent = Math.round((categoryScore / maxCategoryScore) * 100)
  const allAnsweredInCategory = answeredInCategory === totalQuestions

  const totalAllQuestions = questionIds.reduce((sum, q) => sum + q.length, 0)
  const totalAnswered = Object.keys(answers).length
  const overallProgress = Math.round((totalAnswered / totalAllQuestions) * 100)

  const handleSelect = (questionId: number, level: number) => {
    setAnswers({ ...answers, [questionId]: level })
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
      </div>

      <div className="relative z-10 py-4 px-4 md:py-6">
        {/* Admin + Language */}
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
          <Link to="/admin" className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700/90 transition-colors backdrop-blur-sm shadow-lg flex items-center gap-1.5">
            <span>📊</span>
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <div className="relative">
            <button onClick={() => setLangDropdownOpen(!langDropdownOpen)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700/90 transition-colors backdrop-blur-sm shadow-lg">
              <span>{languages.find(l => l.code === lang)?.flag}</span>
              <svg className={`w-4 h-4 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 max-h-64 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700/50 shadow-xl">
                {languages.map((language) => (
                  <button key={language.code} onClick={() => { setLang(language.code); setLangDropdownOpen(false) }} className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-slate-700/50 transition-colors ${lang === language.code ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-300'}`}>
                    <span>{language.flag}</span><span>{language.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="max-w-5xl mx-auto mb-4 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2">
            {t.title} <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">{t.subtitle}</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-3">
            <span>{t.overall}: {overallProgress}% ({totalAnswered}/{totalAllQuestions})</span>
            <div className="w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {questionIds.map((qIdList, idx) => {
              const catT = t.categories[idx]
              const catAnswered = qIdList.filter(id => answers[id]).length
              const catComplete = catAnswered === qIdList.length
              return (
                <button key={idx} onClick={() => setCurrentCategory(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${idx === currentCategory ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' : catComplete ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400/80' : catAnswered > 0 ? 'bg-slate-800/80 border border-slate-600 text-slate-300' : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:bg-slate-700/60'}`}>
                  <span>{categoryIcons[idx]}</span>
                  <span className="hidden md:inline">{catT.name}</span>
                  {catComplete && <span className="text-emerald-400">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Category */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-t-2xl p-4 border border-slate-700/50 border-b-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl shadow-lg">{categoryIcons[currentCategory]}</div>
                <div>
                  <h2 className="text-lg font-bold text-white">{categoryT.name}</h2>
                  <p className="text-slate-400 text-xs">{answeredInCategory}/{totalQuestions} {t.completed}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{allAnsweredInCategory ? `${categoryScorePercent}%` : '--'}</div>
                <div className="text-xs text-slate-400">{t.score}</div>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${categoryProgress}%` }}></div>
            </div>
          </div>

          <div className="space-y-0">
            {qIds.map((questionId, qIdx) => {
              const questionT = categoryT.questions[qIdx]
              const plantIcon = questionPlantIcons[currentCategory][qIdx]
              const currentAnswer = answers[questionId] || 0
              return (
                <div key={questionId} className={`bg-slate-900/60 backdrop-blur-xl p-4 border-x border-slate-700/50 ${qIdx === qIds.length - 1 ? '' : 'border-b border-slate-700/30'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{plantIcon}</span>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">{questionT.title}</span>
                      <span className="text-slate-500 text-xs ml-2">— {questionT.desc}</span>
                    </div>
                    {currentAnswer > 0 && <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">{t.level} {currentAnswer}</span>}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {t.stages.map((stage, idx) => {
                      const level = idx + 1
                      const style = stageStyles[idx]
                      const isSelected = currentAnswer === level
                      return (
                        <div key={level} onClick={() => handleSelect(questionId, level)} className={`relative cursor-pointer rounded-lg p-2 transition-all duration-200 ${style.bgGradient} border ${isSelected ? 'border-yellow-400 shadow-md shadow-yellow-500/20 scale-[1.03]' : 'border-slate-700/50 hover:border-slate-600'}`}>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-sm">{['🌱', '🌿', '🌳', '🍎'][idx]}</span>
                            <span className={`text-xs font-bold ${isSelected ? 'text-yellow-400' : 'text-white'}`}>{level}</span>
                          </div>
                          <p className="text-[10px] font-medium text-white leading-tight">{stage.name}</p>
                          <p className="text-[9px] text-slate-400 leading-tight">{stage.title}</p>
                          {isSelected && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center"><svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                        </div>
                      )
                    })}
                    <div className="rounded-lg p-1 bg-slate-800/30 border border-slate-700/30 flex items-center justify-center">
                      <div className="scale-75 origin-center"><GrowingTree value={currentAnswer * 3} maxValue={12} /></div>
                    </div>
                  </div>
                  {currentAnswer > 0 && (
                    <textarea value={notes[questionId] || ''} onChange={(e) => setNotes({ ...notes, [questionId]: e.target.value })} placeholder={t.notesPlaceholder} rows={1} className="w-full mt-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/30 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none text-xs" />
                  )}
                </div>
              )
            })}
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl rounded-b-2xl p-4 border border-slate-700/50 border-t-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">{allAnsweredInCategory ? <span className="text-emerald-400">{t.categoryComplete}</span> : <span>{t.completeAll}</span>}</div>
              <div className="flex gap-2">
                {qIds.map((qId, qIdx) => (
                  <div key={qId} className="text-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${answers[qId] ? 'bg-emerald-500/20' : 'bg-slate-800/50'}`}>{questionPlantIcons[currentCategory][qIdx]}</div>
                    <span className="text-[9px] text-slate-500">{answers[qId] || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <button onClick={() => setCurrentCategory(Math.max(0, currentCategory - 1))} disabled={currentCategory === 0} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentCategory === 0 ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'}`}>{t.previous}</button>
            <button onClick={() => setCurrentCategory(Math.min(questionIds.length - 1, currentCategory + 1))} disabled={currentCategory === questionIds.length - 1} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentCategory === questionIds.length - 1 ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-105'}`}>{t.next}</button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 text-center">
          <p className="text-slate-600 text-sm">{t.footer}</p>
        </div>
      </div>
    </div>
  )
}

export default App
