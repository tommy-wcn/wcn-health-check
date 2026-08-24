import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GrowingTree } from './GrowingTree'
import { translations, languages, type Language } from './i18n'
import { loadContent, loadPartnerOrgs, loadSiteText, plantIcon, youtubeEmbedUrl, type Category } from './data/content'
import { supabase } from './lib/supabase'

const stageStyles = [
  { bgGradient: 'bg-gradient-to-br from-amber-950/30 to-stone-950/40' },
  { bgGradient: 'bg-gradient-to-br from-lime-950/30 to-green-950/40' },
  { bgGradient: 'bg-gradient-to-br from-emerald-950/30 to-teal-950/40' },
  { bgGradient: 'bg-gradient-to-br from-green-950/30 to-emerald-950/40' },
]

function App() {
  const [currentCategory, setCurrentCategory] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [lang, setLang] = useState<Language>('en')
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [content, setContent] = useState<Category[] | null>(null)
  const [partnerOrgs, setPartnerOrgs] = useState<string[]>([])
  const [contentError, setContentError] = useState(false)
  const [respondent, setRespondent] = useState<{ name: string; email: string; org: string } | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formOrg, setFormOrg] = useState('')

  const [siteText, setSiteText] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([loadContent(), loadPartnerOrgs(), loadSiteText()])
      .then(([cats, orgs, texts]) => {
        setContent(cats)
        setPartnerOrgs(orgs)
        setSiteText(texts)
      })
      .catch((err) => {
        console.error(err)
        setContentError(true)
      })
  }, [])

  const formValid = formName.trim() && /.+@.+\..+/.test(formEmail.trim()) && formOrg

  const t = translations[lang]

  if (contentError || content === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-3">{contentError ? '🥀' : '🌱'}</div>
          <p>{contentError ? 'Could not load the health check. Please refresh to try again.' : 'Loading…'}</p>
        </div>
      </div>
    )
  }

  const CATEGORIES = content
  const TOTAL_QUESTIONS = content.reduce((sum, c) => sum + c.questions.length, 0)
  const category = CATEGORIES[currentCategory]
  const totalQuestions = category.questions.length
  const answeredInCategory = category.questions.filter(q => answers[q.id]).length
  const categoryProgress = (answeredInCategory / totalQuestions) * 100
  const categoryScore = category.questions.reduce((sum, q) => sum + (answers[q.id] || 0), 0)
  const maxCategoryScore = totalQuestions * 4
  const categoryScorePercent = Math.round((categoryScore / maxCategoryScore) * 100)
  const allAnsweredInCategory = answeredInCategory === totalQuestions
  const categoryVideos = category.questions.filter((q) => q.videoGuide)

  const totalAnswered = Object.keys(answers).length
  const overallProgress = Math.round((totalAnswered / TOTAL_QUESTIONS) * 100)

  const handleSelect = (questionId: string, level: number) => {
    setAnswers({ ...answers, [questionId]: level })
  }

  const handleSubmit = async () => {
    if (!respondent) return
    setSubmitState('saving')
    const submissionId = crypto.randomUUID()
    const { error: submissionError } = await supabase
      .from('submissions')
      .insert({
        id: submissionId,
        org_name: respondent.org,
        respondent_name: respondent.name,
        respondent_email: respondent.email,
        language: lang,
      })
    if (submissionError) {
      console.error(submissionError)
      setSubmitState('error')
      return
    }
    const rows = Object.entries(answers).map(([questionId, level]) => ({
      submission_id: submissionId,
      question_id: questionId,
      level,
      note: notes[questionId]?.trim() || null,
    }))
    const { error: answersError } = await supabase.from('answers').insert(rows)
    if (answersError) {
      console.error(answersError)
      setSubmitState('error')
      return
    }
    setSubmitState('done')
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
          {respondent && (<>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-3">
            <span>{t.overall}: {overallProgress}% ({totalAnswered}/{TOTAL_QUESTIONS})</span>
            <div className="w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {CATEGORIES.map((cat, idx) => {
              const catAnswered = cat.questions.filter(q => answers[q.id]).length
              const catComplete = catAnswered === cat.questions.length
              return (
                <button key={cat.id} onClick={() => setCurrentCategory(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${idx === currentCategory ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' : catComplete ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400/80' : catAnswered > 0 ? 'bg-slate-800/80 border border-slate-600 text-slate-300' : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:bg-slate-700/60'}`}>
                  <span>{cat.icon}</span>
                  <span className="hidden md:inline">{cat.name}</span>
                  {catComplete && <span className="text-emerald-400">✓</span>}
                </button>
              )
            })}
          </div>
          </>)}
        </div>

        {!respondent && (
        /* Welcome landing */
        <div className="max-w-xl mx-auto mt-6">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
            <div className="mb-6">
              <div className="text-center">
                <div className="text-4xl mb-3" aria-hidden="true">🌱</div>
                <h2 className="text-2xl font-bold text-white mb-3">Welcome</h2>
              </div>
              {siteText['landing-page-introduction'] ? (
                <div className="space-y-3">
                  {siteText['landing-page-introduction'].split(/\n+/).map((paragraph, i) => (
                    <p key={i} className="text-slate-400 text-sm leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center">
                  This health check helps your organization reflect on its maturity across {CATEGORIES.length} key
                  dimensions. Tell us who you are to get started — responses are shared only with WCN staff.
                </p>
              )}
            </div>
            <label htmlFor="welcome-name" className="block text-xs text-slate-400 mb-1">Your name</label>
            <input
              id="welcome-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={200}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm"
            />
            <label htmlFor="welcome-email" className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              id="welcome-email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              maxLength={320}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm"
            />
            <label htmlFor="welcome-org" className="block text-xs text-slate-400 mb-1">Organization</label>
            <select
              id="welcome-org"
              value={formOrg}
              onChange={(e) => setFormOrg(e.target.value)}
              className="w-full mb-5 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm"
            >
              <option value="" disabled>Select your organization…</option>
              {partnerOrgs.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
            <button
              onClick={() => setRespondent({ name: formName.trim(), email: formEmail.trim(), org: formOrg })}
              disabled={!formValid}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                formValid
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02]'
                  : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
              }`}
            >
              Start the health check →
            </button>
          </div>
        </div>
        )}

        {respondent && (<>
        {/* Category */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-t-2xl p-4 border border-slate-700/50 border-b-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl shadow-lg">{category.icon}</div>
                <div>
                  <h2 className="text-lg font-bold text-white">{category.name}</h2>
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

          {categoryVideos.length > 0 && (
            <div className="bg-slate-900/60 backdrop-blur-xl px-4 pb-4 border-x border-slate-700/50 border-b border-slate-700/30">
              <div className={`grid gap-3 ${categoryVideos.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {categoryVideos.map((q) => {
                  const embedUrl = youtubeEmbedUrl(q.videoGuide!)
                  return (
                    <div key={q.id}>
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-300">
                        <span>🎬</span>
                        <span>{q.title}</span>
                      </div>
                      {embedUrl ? (
                        <div className="relative w-full rounded-xl overflow-hidden border border-slate-700/50" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            src={embedUrl}
                            title={q.title}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <a href={q.videoGuide!} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 underline break-all">
                          {q.videoGuide}
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-0">
            {category.questions.map((question, qIdx) => {
              const currentAnswer = answers[question.id] || 0
              return (
                <div key={question.id} className={`bg-slate-900/60 backdrop-blur-xl p-4 border-x border-slate-700/50 ${qIdx === totalQuestions - 1 ? '' : 'border-b border-slate-700/30'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{plantIcon(qIdx)}</span>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">{question.title}</span>
                    </div>
                    {currentAnswer > 0 && <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">{t.stages[currentAnswer - 1].name}</span>}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {t.stages.map((stage, idx) => {
                      const level = idx + 1
                      const style = stageStyles[idx]
                      const isSelected = currentAnswer === level
                      return (
                        <div key={level} onClick={() => handleSelect(question.id, level)} className={`relative cursor-pointer rounded-lg p-2 transition-all duration-200 ${style.bgGradient} border ${isSelected ? 'border-yellow-400 shadow-md shadow-yellow-500/20 scale-[1.03]' : 'border-slate-700/50 hover:border-slate-600'}`}>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-sm">{['🌱', '🌿', '🌳', '🍎'][idx]}</span>
                            <span className={`text-xs font-bold ${isSelected ? 'text-yellow-400' : 'text-white'}`}>{stage.name}</span>
                          </div>
                          <ul className="space-y-1">
                            {question.stageDescriptions[idx].map((item, i) => (
                              <li key={i} className="text-[10px] text-slate-300 leading-snug flex items-start gap-1">
                                <span className="text-slate-500 mt-px">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          {isSelected && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center"><svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                        </div>
                      )
                    })}
                    <div className="rounded-lg p-1 bg-slate-800/30 border border-slate-700/30 flex items-center justify-center">
                      <div className="scale-75 origin-center"><GrowingTree value={currentAnswer * 3} maxValue={12} /></div>
                    </div>
                  </div>
                  {currentAnswer > 0 && (
                    <textarea value={notes[question.id] || ''} onChange={(e) => setNotes({ ...notes, [question.id]: e.target.value })} placeholder={t.notesPlaceholder} rows={1} className="w-full mt-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/30 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none text-xs" />
                  )}
                </div>
              )
            })}
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl rounded-b-2xl p-4 border border-slate-700/50 border-t-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">{allAnsweredInCategory ? <span className="text-emerald-400">{t.categoryComplete}</span> : <span>{t.completeAll}</span>}</div>
              <div className="flex gap-2">
                {category.questions.map((q, qIdx) => (
                  <div key={q.id} className="text-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${answers[q.id] ? 'bg-emerald-500/20' : 'bg-slate-800/50'}`}>{plantIcon(qIdx)}</div>
                    <span className="text-[9px] text-slate-500">{answers[q.id] ? t.stages[answers[q.id] - 1].name : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <button onClick={() => setCurrentCategory(Math.max(0, currentCategory - 1))} disabled={currentCategory === 0} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentCategory === 0 ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'}`}>{t.previous}</button>
            <button onClick={() => setCurrentCategory(Math.min(CATEGORIES.length - 1, currentCategory + 1))} disabled={currentCategory === CATEGORIES.length - 1} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentCategory === CATEGORIES.length - 1 ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-105'}`}>{t.next}</button>
          </div>
        </div>

        {/* Submit */}
        <div className="max-w-5xl mx-auto mt-6">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/50">
            {submitState === 'done' ? (
              <div className="text-center py-2">
                <div className="text-3xl mb-2">🌳</div>
                <p className="text-emerald-400 font-semibold">Thank you! Your health check has been submitted.</p>
                <p className="text-slate-400 text-sm mt-1">{respondent.org} — {totalAnswered}/{TOTAL_QUESTIONS} questions answered</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 text-sm text-slate-400">
                  Submitting as <span className="text-white">{respondent.name}</span> ({respondent.email}) —{' '}
                  <span className="text-white">{respondent.org}</span>
                </div>
                <div className="flex items-center gap-3">
                  {submitState === 'error' && <span className="text-red-400 text-xs">Something went wrong — please try again.</span>}
                  <button
                    onClick={handleSubmit}
                    disabled={submitState === 'saving' || totalAnswered === 0}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      submitState !== 'saving' && totalAnswered > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-105'
                        : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {submitState === 'saving' ? 'Submitting…' : `Submit (${totalAnswered}/${TOTAL_QUESTIONS} answered)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </>)}

        <div className="max-w-5xl mx-auto mt-6 text-center">
          <p className="text-slate-600 text-sm">{t.footer}</p>
        </div>
      </div>
    </div>
  )
}

export default App
