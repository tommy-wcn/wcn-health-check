/**
 * Pulls assessment content from the WCN Airtable base and writes it into the
 * Supabase content tables (content_categories / content_questions).
 *
 * Usage: node --env-file=.env scripts/sync-content.mjs
 * Requires AIRTABLE_TOKEN (data.records:read) and SUPABASE_DB_URL in .env.
 *
 * The admin dashboard's "Sync from Airtable" button runs the same logic via
 * the sync-airtable edge function (supabase/functions/sync-airtable).
 */
import pg from 'pg'

const BASE_ID = 'apphdPdSXAihErhnR'
const TABLE_ID = 'tbl1KOtdMe83SixVr'
const PARTNERS_TABLE_ID = 'tblrU8nJU3Y69fyFb'
const PARTNER_NAME_FIELD = 'Partner Organization'
const TEXT_TABLE_ID = 'tblnEU2vHN6VUI75P'
const TEXT_FIELDS = { name: 'Name', text: 'Text' }

const FIELDS = {
  topic: 'Topic',
  category: 'Meta-Category',
  sortOrder: 'Sort Order',
  videoGuide: 'Video Guide',
  stages: ['Planting Text', 'Seedling Text', 'Growing Text', 'Harvesting Text'],
}

const airtableToken = process.env.AIRTABLE_TOKEN
const dbUrl = process.env.SUPABASE_DB_URL
if (!airtableToken || !dbUrl) {
  console.error('Set AIRTABLE_TOKEN and SUPABASE_DB_URL in .env.')
  process.exit(1)
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '')

const toBullets = (text) =>
  text
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z"(])/))
    .map((b) => b.trim())
    .filter(Boolean)

async function fetchAllRecords(tableId) {
  const records = []
  let offset
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`)
    if (offset) url.searchParams.set('offset', offset)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${airtableToken}` } })
    if (!res.ok) throw new Error(`Airtable API ${res.status}: ${await res.text()}`)
    const page = await res.json()
    records.push(...page.records)
    offset = page.offset
  } while (offset)
  return records
}

const records = await fetchAllRecords(TABLE_ID)
const partnerRecords = await fetchAllRecords(PARTNERS_TABLE_ID)

const partners = partnerRecords
  .map((r) => r.fields[PARTNER_NAME_FIELD])
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b))

const textRecords = await fetchAllRecords(TEXT_TABLE_ID)
const texts = textRecords
  .filter((r) => r.fields[TEXT_FIELDS.name] && r.fields[TEXT_FIELDS.text])
  .map((r) => ({ key: slugify(r.fields[TEXT_FIELDS.name]), value: r.fields[TEXT_FIELDS.text].trim() }))

const questions = records
  .filter((r) => r.fields[FIELDS.topic])
  .map((r) => ({
    id: slugify(r.fields[FIELDS.topic]),
    title: r.fields[FIELDS.topic],
    category: r.fields[FIELDS.category] ?? 'Uncategorized',
    sortOrder: r.fields[FIELDS.sortOrder] ?? Number.MAX_SAFE_INTEGER,
    videoGuide: r.fields[FIELDS.videoGuide]?.trim() || null,
    stageDescriptions: FIELDS.stages.map((f) => toBullets(r.fields[f] ?? '')),
  }))
  .sort((a, b) => a.sortOrder - b.sortOrder)

const categoryNames = [...new Set(questions.map((q) => q.category))]

const client = new pg.Client({ connectionString: dbUrl })
await client.connect()
try {
  await client.query('begin')
  // Full replace: content is small and Airtable is the source of truth.
  await client.query('delete from content_categories')
  for (const [pos, name] of categoryNames.entries()) {
    await client.query('insert into content_categories (id, name, position) values ($1, $2, $3)', [
      slugify(name), name, pos,
    ])
  }
  for (const [pos, q] of questions.entries()) {
    await client.query(
      'insert into content_questions (id, category_id, title, position, stage_descriptions, video_guide) values ($1, $2, $3, $4, $5, $6)',
      [q.id, slugify(q.category), q.title, pos, JSON.stringify(q.stageDescriptions), q.videoGuide],
    )
  }
  await client.query('delete from partner_organizations')
  for (const [pos, name] of partners.entries()) {
    await client.query('insert into partner_organizations (id, name, position) values ($1, $2, $3)', [
      slugify(name), name, pos,
    ])
  }
  await client.query('delete from content_text')
  for (const t of texts) {
    await client.query('insert into content_text (key, value) values ($1, $2)', [t.key, t.value])
  }
  await client.query('commit')
} catch (err) {
  await client.query('rollback')
  throw err
} finally {
  await client.end()
}
console.log(`Synced ${questions.length} questions in ${categoryNames.length} categories, ${partners.length} partner organizations, and ${texts.length} text entries to Supabase`)
