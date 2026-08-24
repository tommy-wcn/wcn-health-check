import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

// Category definitions (same as main app)
const categories = [
  { id: 1, name: 'Registration & Governance', icon: '⚖️', questions: 5 },
  { id: 2, name: 'Human Resources', icon: '👥', questions: 6 },
  { id: 3, name: 'Strategic Planning', icon: '📋', questions: 4 },
  { id: 4, name: 'Finance & Accounting', icon: '💰', questions: 4 },
  { id: 5, name: 'Commitment to People', icon: '🌍', questions: 5 },
  { id: 6, name: 'Infrastructure', icon: '🏗️', questions: 4 },
  { id: 7, name: 'Donor Engagement', icon: '🤝', questions: 4 },
  { id: 8, name: 'External Comms', icon: '📢', questions: 4 },
]

// Mock response data - 12 organizations
const mockResponses = [
  { id: 1, org: 'Wildlife Conservation Kenya', country: 'Kenya', date: '2026-03-15', scores: [72, 58, 81, 65, 90, 55, 70, 62] },
  { id: 2, org: 'Amazon Rainforest Alliance', country: 'Brazil', date: '2026-03-14', scores: [85, 78, 92, 88, 75, 82, 90, 85] },
  { id: 3, org: 'Coral Reef Foundation', country: 'Indonesia', date: '2026-03-14', scores: [60, 45, 55, 70, 65, 40, 50, 55] },
  { id: 4, org: 'Mountain Tiger Initiative', country: 'Nepal', date: '2026-03-13', scores: [78, 82, 75, 68, 85, 72, 65, 70] },
  { id: 5, org: 'Sahara Green Project', country: 'Mali', date: '2026-03-12', scores: [45, 38, 50, 42, 55, 35, 40, 45] },
  { id: 6, org: 'Arctic Wildlife Trust', country: 'Norway', date: '2026-03-11', scores: [92, 88, 95, 90, 85, 88, 92, 90] },
  { id: 7, org: 'River Basin Conservation', country: 'Uganda', date: '2026-03-10', scores: [68, 62, 70, 58, 75, 60, 55, 65] },
  { id: 8, org: 'Forest Guardians Network', country: 'Philippines', date: '2026-03-09', scores: [55, 50, 62, 48, 58, 45, 52, 50] },
  { id: 9, org: 'Wetlands Protection Fund', country: 'Tanzania', date: '2026-03-08', scores: [75, 70, 78, 72, 80, 68, 72, 75] },
  { id: 10, org: 'Savanna Wildlife Alliance', country: 'Botswana', date: '2026-03-07', scores: [82, 75, 85, 78, 88, 72, 80, 78] },
  { id: 11, org: 'Coastal Conservation Initiative', country: 'Madagascar', date: '2026-03-06', scores: [50, 42, 48, 55, 60, 38, 45, 42] },
  { id: 12, org: 'Highland Ecosystem Trust', country: 'Rwanda', date: '2026-03-05', scores: [70, 65, 72, 68, 78, 62, 68, 70] },
]

// const COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b']

function AdminDashboard() {
  const [selectedResponse, setSelectedResponse] = useState<number | null>(null)
  const [view, setView] = useState<'overview' | 'responses' | 'trends'>('overview')

  // Calculate stats
  const totalResponses = mockResponses.length
  const avgOverall = Math.round(mockResponses.reduce((sum, r) => sum + r.scores.reduce((a, b) => a + b, 0) / r.scores.length, 0) / totalResponses)
  
  // Category averages across all responses
  const categoryAverages = categories.map((cat, idx) => ({
    name: cat.name.split(' ')[0], // Short name
    fullName: cat.name,
    icon: cat.icon,
    avg: Math.round(mockResponses.reduce((sum, r) => sum + r.scores[idx], 0) / totalResponses),
  }))

  // Score distribution (how many orgs in each tier)
  const scoreDistribution = [
    { name: 'Emerging (0-40%)', value: mockResponses.filter(r => r.scores.reduce((a, b) => a + b, 0) / r.scores.length < 40).length, color: '#ef4444' },
    { name: 'Developing (40-60%)', value: mockResponses.filter(r => { const avg = r.scores.reduce((a, b) => a + b, 0) / r.scores.length; return avg >= 40 && avg < 60 }).length, color: '#f59e0b' },
    { name: 'Established (60-80%)', value: mockResponses.filter(r => { const avg = r.scores.reduce((a, b) => a + b, 0) / r.scores.length; return avg >= 60 && avg < 80 }).length, color: '#10b981' },
    { name: 'Leading (80-100%)', value: mockResponses.filter(r => r.scores.reduce((a, b) => a + b, 0) / r.scores.length >= 80).length, color: '#06b6d4' },
  ]

  // Trend data (last 7 days)
  const trendData = [
    { date: 'Mar 5', responses: 1, avgScore: 70 },
    { date: 'Mar 6', responses: 1, avgScore: 48 },
    { date: 'Mar 7', responses: 1, avgScore: 80 },
    { date: 'Mar 8', responses: 1, avgScore: 74 },
    { date: 'Mar 9', responses: 1, avgScore: 53 },
    { date: 'Mar 10', responses: 1, avgScore: 64 },
    { date: 'Mar 11', responses: 1, avgScore: 90 },
    { date: 'Mar 12', responses: 1, avgScore: 44 },
    { date: 'Mar 13', responses: 1, avgScore: 75 },
    { date: 'Mar 14', responses: 2, avgScore: 66 },
    { date: 'Mar 15', responses: 1, avgScore: 69 },
  ]

  const selectedOrg = selectedResponse !== null ? mockResponses.find(r => r.id === selectedResponse) : null

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
            <div className="flex gap-2">
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {view === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-white">{totalResponses}</div>
                <div className="text-sm text-slate-400">Total Responses</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-emerald-400">{avgOverall}%</div>
                <div className="text-sm text-slate-400">Average Score</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-cyan-400">{categoryAverages.reduce((max, c) => c.avg > max.avg ? c : max).icon}</div>
                <div className="text-sm text-slate-400">Strongest Category</div>
                <div className="text-xs text-cyan-400">{categoryAverages.reduce((max, c) => c.avg > max.avg ? c : max).fullName}</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-amber-400">{categoryAverages.reduce((min, c) => c.avg < min.avg ? c : min).icon}</div>
                <div className="text-sm text-slate-400">Needs Attention</div>
                <div className="text-xs text-amber-400">{categoryAverages.reduce((min, c) => c.avg < min.avg ? c : min).fullName}</div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Category Averages Bar Chart */}
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Category Averages</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryAverages} layout="vertical">
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
                      data={scoreDistribution.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {scoreDistribution.map((entry, index) => (
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
                <RadarChart data={categoryAverages}>
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

        {view === 'responses' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Response List */}
            <div className="md:col-span-1 bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Responses</h3>
                <p className="text-sm text-slate-400">{totalResponses} organizations</p>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {mockResponses.map((response) => {
                  const avg = Math.round(response.scores.reduce((a, b) => a + b, 0) / response.scores.length)
                  return (
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
                          <div className="text-xs text-slate-400">{response.country} • {response.date}</div>
                        </div>
                        <div className={`text-lg font-bold ${
                          avg >= 80 ? 'text-cyan-400' : avg >= 60 ? 'text-emerald-400' : avg >= 40 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {avg}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Response Detail */}
            <div className="md:col-span-2">
              {selectedOrg ? (
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedOrg.org}</h2>
                      <p className="text-slate-400">{selectedOrg.country} • Submitted {selectedOrg.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-emerald-400">
                        {Math.round(selectedOrg.scores.reduce((a, b) => a + b, 0) / selectedOrg.scores.length)}%
                      </div>
                      <div className="text-sm text-slate-400">Overall Score</div>
                    </div>
                  </div>

                  {/* Radar for this org */}
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={categories.map((cat, idx) => ({
                        name: cat.name.split(' ')[0],
                        score: selectedOrg.scores[idx],
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
                          <div className="text-xs text-slate-400 truncate">{cat.name}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                style={{ width: `${selectedOrg.scores[idx]}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-white w-10 text-right">{selectedOrg.scores[idx]}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
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

        {view === 'trends' && (
          <div className="space-y-6">
            {/* Response Trend */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Submissions Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
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
                <LineChart data={trendData}>
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

            {/* Country Breakdown */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Responses by Country</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  mockResponses.reduce((acc, r) => {
                    acc[r.country] = (acc[r.country] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([country, count]) => (
                  <div key={country} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-white">{country}</span>
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
