// Sends email notifications when a health check submission is completed:
// a results summary to the admins (Airtable "Admins" table, synced to
// notification_admins) with a link to the admin dashboard, and the same
// summary to the respondent. Invoked by the app right after a submission
// is saved; submissions.notified_at guarantees at-most-once sending.
//
// Deploy:  npx supabase functions deploy notify-submission --remote=<ref>
// Secrets: RESEND_API_KEY  — Resend API key
//          APP_URL         — public URL of the deployed app (for the admin link)
//          FROM_EMAIL      — verified sender, e.g. "WCN Health Check <healthcheck@wcn.org>"
import { createClient } from 'npm:@supabase/supabase-js@2'

const STAGE_NAMES = ['Planting', 'Seedling', 'Growing', 'Harvesting']
const STAGE_EMOJI = ['🌱', '🌿', '🌳', '🍎']

// The WCN team inbox is always notified, in addition to any admins synced
// from the Airtable "Admins" table.
const WCN_TEAM_EMAIL = 'org-health-check@wildnet.org'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface CategorySummary {
  name: string
  answered: number
  total: number
  scorePercent: number | null
}

function summaryTable(categories: CategorySummary[], overallPercent: number | null): string {
  const rows = categories
    .map((c) => {
      const score = c.scorePercent === null ? '—' : `${c.scorePercent}%`
      return `<tr>
        <td style="padding:6px 12px 6px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(c.name)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${c.answered}/${c.total}</td>
        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${score}</td>
      </tr>`
    })
    .join('')
  const overall = overallPercent === null ? '—' : `${overallPercent}%`
  return `<table style="border-collapse:collapse;width:100%;max-width:480px;font-size:14px;color:#1e293b;">
    <tr>
      <th style="text-align:left;padding:6px 12px 6px 0;border-bottom:2px solid #94a3b8;">Category</th>
      <th style="text-align:center;padding:6px 12px;border-bottom:2px solid #94a3b8;">Answered</th>
      <th style="text-align:right;padding:6px 0;border-bottom:2px solid #94a3b8;">Score</th>
    </tr>
    ${rows}
    <tr>
      <td style="padding:8px 12px 0 0;font-weight:700;">Overall</td>
      <td></td>
      <td style="padding:8px 0 0;text-align:right;font-weight:700;">${overall}</td>
    </tr>
  </table>`
}

async function sendEmail(apiKey: string, from: string, to: string[], subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return json({ error: 'RESEND_API_KEY secret is not configured' }, 500)
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
  const from = Deno.env.get('FROM_EMAIL') ?? 'WCN Health Check <onboarding@resend.dev>'

  let submissionId: unknown
  try {
    ;({ submissionId } = await req.json())
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (typeof submissionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
    return json({ error: 'submissionId must be a UUID' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Claim the submission; if it's already been notified this returns no rows,
    // so repeat calls (or abuse) can never send duplicate emails.
    const claim = await admin
      .from('submissions')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', submissionId)
      .is('notified_at', null)
      .select('id, org_name, respondent_name, respondent_email, created_at')
    if (claim.error) throw claim.error
    if (!claim.data || claim.data.length === 0) {
      return json({ ok: true, skipped: 'already notified or unknown submission' })
    }
    const submission = claim.data[0]

    const [answersRes, catsRes, questionsRes, adminsRes] = await Promise.all([
      admin.from('answers').select('question_id, level, note').eq('submission_id', submissionId),
      admin.from('content_categories').select('id, name').order('position'),
      admin.from('content_questions').select('id, category_id').order('position'),
      admin.from('notification_admins').select('email').order('position'),
    ])
    for (const r of [answersRes, catsRes, questionsRes, adminsRes]) {
      if (r.error) throw r.error
    }

    const levelByQuestion = new Map(answersRes.data!.map((a) => [a.question_id, a.level]))
    const notesCount = answersRes.data!.filter((a) => a.note).length

    const categories: CategorySummary[] = catsRes.data!.map((c) => {
      const qs = questionsRes.data!.filter((q) => q.category_id === c.id)
      const levels = qs.map((q) => levelByQuestion.get(q.id)).filter((l): l is number => l !== undefined)
      const scorePercent = levels.length === qs.length && qs.length > 0
        ? Math.round((levels.reduce((s, l) => s + l, 0) / (qs.length * 4)) * 100)
        : null
      return { name: c.name, answered: levels.length, total: qs.length, scorePercent }
    })

    const totalQuestions = questionsRes.data!.length
    const totalAnswered = levelByQuestion.size
    const allLevels = [...levelByQuestion.values()]
    const overallPercent = totalAnswered === totalQuestions && totalQuestions > 0
      ? Math.round((allLevels.reduce((s, l) => s + l, 0) / (totalQuestions * 4)) * 100)
      : null
    const avgLevel = allLevels.length
      ? allLevels.reduce((s, l) => s + l, 0) / allLevels.length
      : 0
    const stageIdx = Math.min(3, Math.max(0, Math.round(avgLevel) - 1))
    const overallStage = allLevels.length ? `${STAGE_EMOJI[stageIdx]} ${STAGE_NAMES[stageIdx]}` : ''

    const orgName = escapeHtml(submission.org_name)
    const respondentName = escapeHtml(submission.respondent_name ?? 'Unknown')
    const table = summaryTable(categories, overallPercent)

    const adminEmails = [...new Set([WCN_TEAM_EMAIL, ...adminsRes.data!.map((a) => a.email)])]
    const results: Record<string, string> = {}

    {
      const adminLink = appUrl
        ? `<p style="margin:20px 0;"><a href="${appUrl}/admin" style="background:#10b981;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">View in the admin dashboard</a></p>`
        : ''
      const html = `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
          <h2 style="margin:0 0 4px;">New health check submission 🌱</h2>
          <p style="margin:0 0 16px;color:#475569;">
            A new response to WCN's Organizational Health Check has been submitted by
            <strong>${escapeHtml(submission.respondent_email ?? 'unknown email')}</strong>
            (${respondentName}, <strong>${orgName}</strong>).<br/>
            ${totalAnswered}/${totalQuestions} questions answered${notesCount ? `, ${notesCount} note${notesCount === 1 ? '' : 's'}` : ''}${overallStage ? ` · overall stage: ${overallStage}` : ''}
          </p>
          ${table}
          ${adminLink}
        </div>`
      await sendEmail(apiKey, from, adminEmails, `New Organizational Health Check response: ${submission.org_name}`, html)
      results.admins = `sent to ${adminEmails.length}`
    }

    if (submission.respondent_email) {
      const html = `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
          <h2 style="margin:0 0 4px;">Thank you for completing the Organizational Health Check 🌱</h2>
          <p style="margin:0 0 16px;color:#475569;">
            Here is a summary of the results for <strong>${orgName}</strong>.
            The WCN team has received your submission and will follow up with you.
          </p>
          ${table}
          <p style="margin:20px 0 0;color:#475569;">With thanks,<br/>Wildlife Conservation Network</p>
        </div>`
      try {
        await sendEmail(apiKey, from, [submission.respondent_email], 'Your Organizational Health Check results', html)
        results.respondent = 'sent'
      } catch (err) {
        // Don't fail the whole call if only the respondent copy bounces
        // (e.g. unverified Resend domain can only email the account owner).
        console.error('respondent email failed:', err)
        results.respondent = `failed: ${err instanceof Error ? err.message : String(err)}`
      }
    } else {
      results.respondent = 'no respondent email on submission'
    }

    return json({ ok: true, ...results })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
