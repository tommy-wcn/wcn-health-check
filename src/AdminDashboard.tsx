import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { supabase } from './lib/supabase'
import { loadContent } from './data/content'
import { languages } from './i18n'

interface CategoryMeta {
  id: string
  name: string
  fullName: string
  icon: string
  questions: { id: string; title: string }[]
}

interface Answer {
  submission_id: string
  question_id: string
  level: number
  note: string | null
}

const STAGE_NAMES = ['Planting', 'Seedling', 'Growing', 'Harvesting']

interface Response {
  id: string
  org: string
  respondentName: string | null
  respondentEmail: string | null
  language: string
  date: string
  createdAt: string
  /** Per-category score 0-100, in CATEGORIES order; null if no answers in that category */
  scores: (number | null)[]
  overall: number
}

function scoreResponses(
  categories: CategoryMeta[],
  submissions: { id: string; org_name: string; respondent_name: string | null; respondent_email: string | null; language: string; created_at: string }[],
  answers: Answer[],
): Response[] {
  const bySubmission = new Map<string, Answer[]>()
  for (const a of answers) {
    const list = bySubmission.get(a.submission_id) ?? []
    list.push(a)
    bySubmission.set(a.submission_id, list)
  }
  const questionIdsByCategory = new Map(categories.map((c) => [c.id, new Set(c.questions.map((q) => q.id))]))
  return submissions.map((s) => {
    const rows = bySubmission.get(s.id) ?? []
    const scores = categories.map((cat) => {
      const catRows = rows.filter((r) => questionIdsByCategory.get(cat.id)!.has(r.question_id))
      if (catRows.length === 0) return null
      return Math.round((catRows.reduce((sum, r) => sum + r.level, 0) / (catRows.length * 4)) * 100)
    })
    const answered = scores.filter((v): v is number => v !== null)
    return {
      id: s.id,
      org: s.org_name,
      respondentName: s.respondent_name,
      respondentEmail: s.respondent_email,
      language: s.language,
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: s.created_at,
      scores,
      overall: answered.length ? Math.round(answered.reduce((a, b) => a + b, 0) / answered.length) : 0,
    }
  })
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <form onSubmit={signIn} className="w-full max-w-sm bg-slate-900/60 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h1 className="text-xl font-bold text-white">WCN Staff Sign-In</h1>
          <p className="text-slate-400 text-sm mt-1">Admin access to health check responses</p>
        </div>
        <label className="block text-xs text-slate-400 mb-1" htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm" />
        <label className="block text-xs text-slate-400 mb-1" htmlFor="password">Password</label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm" />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button type="submit" disabled={busy}
          className="w-full py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02] transition-all disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a href="/" className="block text-center text-slate-500 text-xs mt-4 hover:text-slate-300">← Back to health check</a>
      </form>
    </div>
  )
}

function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [categories, setCategories] = useState<CategoryMeta[] | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [responses, setResponses] = useState<Response[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)
  const [view, setView] = useState<'overview' | 'responses' | 'trends'>('overview')
  const [syncState, setSyncState] = useState<{ status: 'idle' | 'syncing' | 'done' | 'error'; message?: string }>({ status: 'idle' })

  const syncFromAirtable = async () => {
    setSyncState({ status: 'syncing' })
    const { data, error } = await supabase.functions.invoke('sync-airtable')
    if (error || data?.error) {
      setSyncState({ status: 'error', message: error?.message ?? data.error })
      return
    }
    setSyncState({ status: 'done', message: `${data.questions} questions in ${data.categories} categories` })
    // Reload so the refreshed content flows through scoring and charts
    window.location.reload()
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      const [content, subs, ans] = await Promise.all([
        loadContent(),
        supabase.from('submissions').select('id, org_name, respondent_name, respondent_email, language, created_at').order('created_at', { ascending: false }),
        supabase.from('answers').select('submission_id, question_id, level, note'),
      ]).catch((err) => {
        throw new Error(err.message ?? String(err))
      })
      if (cancelled) return
      if (subs.error || ans.error) {
        setLoadError((subs.error ?? ans.error)!.message)
        return
      }
      const cats = content.map((c) => ({
        id: c.id,
        name: c.name.split(' ')[0],
        fullName: c.name,
        icon: c.icon,
        questions: c.questions.map((q) => ({ id: q.id, title: q.title })),
      }))
      setCategories(cats)
      setAnswers(ans.data)
      setResponses(scoreResponses(cats, subs.data, ans.data))
    })().catch((err) => {
      if (!cancelled) setLoadError(err.message)
    })
    return () => {
      cancelled = true
    }
  }, [session])

  const stats = useMemo(() => {
    if (!responses || responses.length === 0 || !categories) return null
    const totalResponses = responses.length
    const avgOverall = Math.round(responses.reduce((sum, r) => sum + r.overall, 0) / totalResponses)
    const categoryAverages = categories.map((cat, idx) => {
      const vals = responses.map((r) => r.scores[idx]).filter((v): v is number => v !== null)
      return {
        name: cat.name,
        fullName: cat.fullName,
        icon: cat.icon,
        avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
      }
    })
    const scoreDistribution = [
      { name: 'Emerging (0-40%)', value: responses.filter((r) => r.overall < 40).length, color: '#ef4444' },
      { name: 'Developing (40-60%)', value: responses.filter((r) => r.overall >= 40 && r.overall < 60).length, color: '#f59e0b' },
      { name: 'Established (60-80%)', value: responses.filter((r) => r.overall >= 60 && r.overall < 80).length, color: '#10b981' },
      { name: 'Leading (80-100%)', value: responses.filter((r) => r.overall >= 80).length, color: '#06b6d4' },
    ]
    const byDate = new Map<string, { responses: number; totalScore: number }>()
    for (const r of [...responses].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const day = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const entry = byDate.get(day) ?? { responses: 0, totalScore: 0 }
      entry.responses += 1
      entry.totalScore += r.overall
      byDate.set(day, entry)
    }
    const trendData = [...byDate.entries()].map(([date, e]) => ({
      date,
      responses: e.responses,
      avgScore: Math.round(e.totalScore / e.responses),
    }))
    return { totalResponses, avgOverall, categoryAverages, scoreDistribution, trendData }
  }, [responses, categories])

  if (!authReady) return null
  if (!session) return <Login />

  const selectedOrg = selectedResponse !== null ? responses?.find((r) => r.id === selectedResponse) : null
  const languageName = (code: string) => languages.find((l) => l.code === code)?.name ?? code

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-slate-400 hover:text-white transition-colors">← Back</a>
              <div className="h-6 w-px bg-slate-700"></div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <div className="flex gap-2 items-center">
              {(['overview', 'responses', 'trends'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === v
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-slate-700/50'
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
              <button
                onClick={syncFromAirtable}
                disabled={syncState.status === 'syncing'}
                title={syncState.status === 'error' ? syncState.message : 'Pull the latest questions and rubric text from Airtable'}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  syncState.status === 'error'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border-slate-700/50'
                } disabled:opacity-60`}
              >
                {syncState.status === 'syncing' ? 'Syncing…' : syncState.status === 'error' ? 'Sync failed — retry' : '⟳ Sync from Airtable'}
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-slate-700/50 transition-all"
                title={session.user.email}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loadError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">
            Failed to load responses: {loadError}
          </div>
        )}
        {!loadError && responses === null && (
          <div className="text-center text-slate-400 py-20">Loading responses…</div>
        )}
        {responses !== null && !stats && (
          <div className="text-center text-slate-400 py-20">
            <div className="text-4xl mb-3">🌱</div>
            <p className="font-medium text-white">No submissions yet</p>
            <p className="text-sm mt-1">Responses will appear here as organizations complete the health check.</p>
          </div>
        )}

        {stats && view === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-white">{stats.totalResponses}</div>
                <div className="text-sm text-slate-400">Total Responses</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-emerald-400">{stats.avgOverall}%</div>
                <div className="text-sm text-slate-400">Average Score</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-cyan-400">{stats.categoryAverages.reduce((max, c) => c.avg > max.avg ? c : max).icon}</div>
                <div className="text-sm text-slate-400">Strongest Category</div>
                <div className="text-xs text-cyan-400">{stats.categoryAverages.reduce((max, c) => c.avg > max.avg ? c : max).fullName}</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-amber-400">{stats.categoryAverages.reduce((min, c) => c.avg < min.avg ? c : min).icon}</div>
                <div className="text-sm text-slate-400">Needs Attention</div>
                <div className="text-xs text-amber-400">{stats.categoryAverages.reduce((min, c) => c.avg < min.avg ? c : min).fullName}</div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Category Averages Bar Chart */}
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Category Averages</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.categoryAverages} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Bar dataKey="avg" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Score Distribution Pie */}
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Organization Health Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.scoreDistribution.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.scoreDistribution.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart - Overall Pattern */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Overall Organizational Pattern (All Respondents)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={stats.categoryAverages}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Radar name="Average" dataKey="avg" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {stats && responses && categories && view === 'responses' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Response List */}
            <div className="md:col-span-1 bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Responses</h3>
                <p className="text-sm text-slate-400">{stats.totalResponses} organizations</p>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    onClick={() => setSelectedResponse(response.id)}
                    className={`p-4 border-b border-slate-700/30 cursor-pointer transition-colors ${
                      selectedResponse === response.id ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">{response.org}</div>
                        <div className="text-xs text-slate-400">{languageName(response.language)} • {response.date}</div>
                      </div>
                      <div className={`text-lg font-bold ${
                        response.overall >= 80 ? 'text-cyan-400' : response.overall >= 60 ? 'text-emerald-400' : response.overall >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {response.overall}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Detail */}
            <div className="md:col-span-2">
              {selectedOrg ? (
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedOrg.org}</h2>
                      <p className="text-slate-400">{languageName(selectedOrg.language)} • Submitted {selectedOrg.date}</p>
                      {selectedOrg.respondentName && (
                        <p className="text-slate-500 text-sm mt-0.5">
                          Completed by {selectedOrg.respondentName}
                          {selectedOrg.respondentEmail && <> · <a className="hover:text-slate-300 underline" href={`mailto:${selectedOrg.respondentEmail}`}>{selectedOrg.respondentEmail}</a></>}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-emerald-400">{selectedOrg.overall}%</div>
                      <div className="text-sm text-slate-400">Overall Score</div>
                    </div>
                  </div>

                  {/* Radar for this org */}
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={categories.map((cat, idx) => ({
                        name: cat.name,
                        score: selectedOrg.scores[idx] ?? 0,
                      }))}>
                        <PolarGrid stroke="#475569" />
                        <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((cat, idx) => (
                      <div key={cat.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-xl">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-400 truncate">{cat.fullName}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                style={{ width: `${selectedOrg.scores[idx] ?? 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-white w-10 text-right">
                              {selectedOrg.scores[idx] !== null ? `${selectedOrg.scores[idx]}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Individual Answers */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Answers</h3>
                    <div className="space-y-4">
                      {categories.map((cat) => {
                        const catAnswers = cat.questions
                          .map((q) => ({ question: q, answer: answers.find((a) => a.submission_id === selectedOrg.id && a.question_id === q.id) }))
                          .filter((row) => row.answer)
                        if (catAnswers.length === 0) return null
                        return (
                          <div key={cat.id}>
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                              {cat.icon} {cat.fullName}
                            </div>
                            <div className="space-y-1.5">
                              {catAnswers.map(({ question, answer }) => (
                                <div key={question.id} className="bg-slate-800/50 rounded-lg px-3 py-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-white">{question.title}</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                                      answer!.level >= 4 ? 'bg-cyan-500/10 text-cyan-400' : answer!.level >= 3 ? 'bg-emerald-500/10 text-emerald-400' : answer!.level >= 2 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                                    }`}>
                                      {STAGE_NAMES[answer!.level - 1]}
                                    </span>
                                  </div>
                                  {answer!.note && (
                                    <p className="text-xs text-slate-400 italic mt-1 border-l-2 border-slate-600 pl-2">{answer!.note}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/50 flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center text-slate-400">
                    <div className="text-4xl mb-2">📊</div>
                    <div>Select a response to view details</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {stats && responses && view === 'trends' && (
          <div className="space-y-6">
            {/* Response Trend */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Submissions Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="responses" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Average Score Trend */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Average Score Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Language Breakdown */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Responses by Language</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  responses.reduce((acc, r) => {
                    const name = languageName(r.language)
                    acc[name] = (acc[name] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([language, count]) => (
                  <div key={language} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-white">{language}</span>
                    <span className="text-sm font-medium text-emerald-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
