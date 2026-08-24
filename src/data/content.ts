import { supabase } from '../lib/supabase'

export interface Question {
  id: string
  title: string
  /** Maturity rubric, one entry per stage (Planting → Harvesting). */
  stageDescriptions: string[][]
}

export interface Category {
  id: string
  name: string
  icon: string
  questions: Question[]
}

const CATEGORY_ICONS: Record<string, string> = {
  'registration-and-governance': '⚖️',
  'human-resources': '👥',
  'strategic-planning': '📋',
  'finance-and-accounting': '💰',
  'commitment-to-people-and-place': '🌍',
  'infrastructure-and-equipment': '🏗️',
  'donor-engagement-and-fundraising': '🤝',
  'external-marketing-and-communications': '📢',
}

const PLANT_ICON_POOL = ['🌳', '🌿', '🌴', '🎋', '🌲', '🌵', '🍀']

/**
 * Assessment content lives in Supabase (content_categories / content_questions),
 * synced from the WCN Airtable base via the admin dashboard's "Sync from
 * Airtable" button or `npm run sync:content`.
 */
export async function loadContent(): Promise<Category[]> {
  const [cats, questions] = await Promise.all([
    supabase.from('content_categories').select('id, name').order('position'),
    supabase.from('content_questions').select('id, category_id, title, stage_descriptions').order('position'),
  ])
  if (cats.error) throw cats.error
  if (questions.error) throw questions.error
  return cats.data.map((c) => ({
    id: c.id,
    name: c.name,
    icon: CATEGORY_ICONS[c.id] ?? '📋',
    questions: questions.data
      .filter((q) => q.category_id === c.id)
      .map((q) => ({ id: q.id, title: q.title, stageDescriptions: q.stage_descriptions })),
  }))
}

export const plantIcon = (questionIndex: number): string =>
  PLANT_ICON_POOL[questionIndex % PLANT_ICON_POOL.length]

/** Partner organizations for the welcome page dropdown, synced from Airtable. */
export async function loadPartnerOrgs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('partner_organizations')
    .select('name')
    .order('position')
  if (error) throw error
  return data.map((r) => r.name)
}
