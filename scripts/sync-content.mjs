/**
 * Pulls assessment content from the WCN Airtable base and regenerates
 * src/data/questions.generated.json.
 *
 * Usage: AIRTABLE_TOKEN=pat... npm run sync:content
 * The token needs data.records:read scope on the base.
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const BASE_ID = 'apphdPdSXAihErhnR'
const TABLE_ID = 'tbl1KOtdMe83SixVr'
const OUT = fileURLToPath(new URL('../src/data/questions.generated.json', import.meta.url))

const FIELDS = {
  topic: 'Topic',
  category: 'Meta-Category',
  stages: ['Planting Text', 'Seedling Text', 'Growing Text', 'Harvesting Text'],
}

const CATEGORY_ORDER = [
  'Strategic Planning',
  'Registration and Governance',
  'Finance and Accounting',
  'Human Resources',
  'Donor Engagement and Fundraising',
  'External Marketing and Communications',
  'Infrastructure and Equipment',
  'Commitment to People and Place',
]

const token = process.env.AIRTABLE_TOKEN
if (!token) {
  console.error('Set AIRTABLE_TOKEN to an Airtable personal access token.')
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

async function fetchAllRecords() {
  const records = []
  let offset
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
    if (offset) url.searchParams.set('offset', offset)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Airtable API ${res.status}: ${await res.text()}`)
    const page = await res.json()
    records.push(...page.records)
    offset = page.offset
  } while (offset)
  return records
}

const records = await fetchAllRecords()

const questions = records
  .filter((r) => r.fields[FIELDS.topic])
  .map((r) => ({
    id: slugify(r.fields[FIELDS.topic]),
    title: r.fields[FIELDS.topic],
    category: r.fields[FIELDS.category] ?? 'Uncategorized',
    stageDescriptions: FIELDS.stages.map((f) => toBullets(r.fields[f] ?? '')),
  }))
  .sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category)
    const cb = CATEGORY_ORDER.indexOf(b.category)
    return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb) || a.title.localeCompare(b.title)
  })

await writeFile(OUT, JSON.stringify({ questions }, null, 2) + '\n')
console.log(`Wrote ${questions.length} questions to ${OUT}`)
