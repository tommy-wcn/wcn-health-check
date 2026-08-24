import { supabase } from '../lib/supabase'

export interface Question {
  id: string
  title: string
  /** Maturity rubric, one entry per stage (Planting → Harvesting). */
  stageDescriptions: string[][]
  /** Optional video guide URL from the Airtable "Video Guide" column. */
  videoGuide: string | null
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
    supabase.from('content_questions').select('id, category_id, title, stage_descriptions, video_guide').order('position'),
  ])
  if (cats.error) throw cats.error
  if (questions.error) throw questions.error
  return cats.data.map((c) => ({
    id: c.id,
    name: c.name,
    icon: CATEGORY_ICONS[c.id] ?? '📋',
    questions: questions.data
      .filter((q) => q.category_id === c.id)
      .map((q) => ({ id: q.id, title: q.title, stageDescriptions: q.stage_descriptions, videoGuide: q.video_guide ?? null })),
  }))
}

export const plantIcon = (questionIndex: number): string =>
  PLANT_ICON_POOL[questionIndex % PLANT_ICON_POOL.length]

/**
 * Embed URL for a YouTube link (youtu.be, watch, shorts, or embed form).
 * Returns null for anything else, in which case the caller should fall back
 * to a plain link.
 */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/'))
        id = u.pathname.split('/')[2]
    }
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
  } catch {
    return null
  }
}

/**
 * Key-value site text (e.g. 'landing-page-introduction'), synced from the
 * Airtable "Text" table. Keys are slugified row names.
 */
export async function loadSiteText(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('content_text').select('key, value')
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.key, r.value]))
}

/** Partner organizations for the welcome page dropdown, synced from Airtable. */
export async function loadPartnerOrgs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('partner_organizations')
    .select('name')
    .order('position')
  if (error) throw error
  return data.map((r) => r.name)
}
