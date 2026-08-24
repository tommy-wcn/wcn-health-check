// Syncs assessment content from the WCN Airtable base into the Supabase
// content tables. Invoked by the admin dashboard's "Sync from Airtable"
// button; only signed-in staff may trigger it.
//
// Deploy:  npx supabase functions deploy sync-airtable --project-ref <ref>
// Secrets: npx supabase secrets set AIRTABLE_TOKEN=pat... --project-ref <ref>
import { createClient } from 'npm:@supabase/supabase-js@2'

const BASE_ID = 'apphdPdSXAihErhnR'
const TABLE_ID = 'tbl1KOtdMe83SixVr'
const PARTNERS_TABLE_ID = 'tblrU8nJU3Y69fyFb'
const PARTNER_NAME_FIELD = 'Partner Organization'
const TEXT_TABLE_ID = 'tblnEU2vHN6VUI75P'
const TEXT_FIELDS = { name: 'Name', text: 'Text' }
const META_TABLE_ID = 'tbl8blE4tIr2iGEOU'
const META_FIELDS = { name: 'Name', introText: 'Intro Text', video: 'Video Overview' }

const FIELDS = {
  topic: 'Topic',
  categoryLink: 'Meta Category',
  // Legacy single-select; used while sub-category rows are still being linked.
  categoryFallback: 'Meta-Category',
  sortOrder: 'Sort Order',
  stages: ['Planting Text', 'Seedling Text', 'Growing Text', 'Harvesting Text'],
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '')

const toBullets = (text: string) =>
  text
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z"(])/))
    .map((b) => b.trim())
    .filter(Boolean)

async function fetchAllRecords(token: string, tableId: string) {
  const records: { id: string; fields: Record<string, unknown> }[] = []
  let offset: string | undefined
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`)
    if (offset) url.searchParams.set('offset', offset)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Airtable API ${res.status}: ${await res.text()}`)
    const page = await res.json()
    records.push(...page.records)
    offset = page.offset
  } while (offset)
  return records
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Only signed-in staff may sync (the anon key alone is not enough).
  const authed = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  )
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Sign in required' }, 401)

  const airtableToken = Deno.env.get('AIRTABLE_TOKEN')
  if (!airtableToken) return json({ error: 'AIRTABLE_TOKEN secret is not configured' }, 500)

  try {
    const records = await fetchAllRecords(airtableToken, TABLE_ID)
    const partnerRecords = await fetchAllRecords(airtableToken, PARTNERS_TABLE_ID)

    const partners = partnerRecords
      .map((r) => r.fields[PARTNER_NAME_FIELD] as string)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))

    const textRecords = await fetchAllRecords(airtableToken, TEXT_TABLE_ID)
    const texts = textRecords
      .filter((r) => r.fields[TEXT_FIELDS.name] && r.fields[TEXT_FIELDS.text])
      .map((r) => ({
        key: slugify(r.fields[TEXT_FIELDS.name] as string),
        value: (r.fields[TEXT_FIELDS.text] as string).trim(),
      }))

    // Meta Category records keyed by record id, for resolving linked records.
    const metaRecords = await fetchAllRecords(airtableToken, META_TABLE_ID)
    const metaById = new Map(
      metaRecords
        .filter((r) => r.fields[META_FIELDS.name])
        .map((r) => [r.id, {
          name: (r.fields[META_FIELDS.name] as string).trim(),
          introText: (r.fields[META_FIELDS.introText] as string | undefined)?.trim() || null,
          videoGuide: (r.fields[META_FIELDS.video] as string | undefined)?.trim() || null,
        }]),
    )
    const metaByName = new Map([...metaById.values()].map((m) => [m.name, m]))

    const questions = records
      .filter((r) => r.fields[FIELDS.topic])
      .map((r) => ({
        id: slugify(r.fields[FIELDS.topic] as string),
        title: r.fields[FIELDS.topic] as string,
        category:
          metaById.get((r.fields[FIELDS.categoryLink] as string[] | undefined)?.[0] ?? '')?.name ??
          (r.fields[FIELDS.categoryFallback] as string) ??
          'Uncategorized',
        sortOrder: (r.fields[FIELDS.sortOrder] as number) ?? Number.MAX_SAFE_INTEGER,
        stageDescriptions: FIELDS.stages.map((f) => toBullets((r.fields[f] as string) ?? '')),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const categoryNames = [...new Set(questions.map((q) => q.category))]

    // Service role bypasses RLS; content tables have no client write policies.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Full replace: content is small and Airtable is the source of truth.
    // Deleting categories cascades to questions.
    const del = await admin.from('content_categories').delete().neq('id', '')
    if (del.error) throw del.error

    const catInsert = await admin.from('content_categories').insert(
      categoryNames.map((name, position) => ({
        id: slugify(name),
        name,
        position,
        intro_text: metaByName.get(name)?.introText ?? null,
        video_guide: metaByName.get(name)?.videoGuide ?? null,
      })),
    )
    if (catInsert.error) throw catInsert.error

    const qInsert = await admin.from('content_questions').insert(
      questions.map((q, position) => ({
        id: q.id,
        category_id: slugify(q.category),
        title: q.title,
        position,
        stage_descriptions: q.stageDescriptions,
      })),
    )
    if (qInsert.error) throw qInsert.error

    const pDel = await admin.from('partner_organizations').delete().neq('id', '')
    if (pDel.error) throw pDel.error
    const pInsert = await admin.from('partner_organizations').insert(
      partners.map((name, position) => ({ id: slugify(name), name, position })),
    )
    if (pInsert.error) throw pInsert.error

    const tDel = await admin.from('content_text').delete().neq('key', '')
    if (tDel.error) throw tDel.error
    if (texts.length > 0) {
      const tInsert = await admin.from('content_text').insert(texts)
      if (tInsert.error) throw tInsert.error
    }

    return json({ ok: true, categories: categoryNames.length, questions: questions.length, partners: partners.length, texts: texts.length })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
