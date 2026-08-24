import generated from './questions.generated.json'

export interface StageMeta {
  level: 1 | 2 | 3 | 4
  name: string
  subtitle: string
  icon: string
  gradient: string
}

export const STAGES: StageMeta[] = [
  {
    level: 1,
    name: 'Planting',
    subtitle: 'Seeds of Potential',
    icon: '🌱',
    gradient: 'from-stage-planting to-amber-800',
  },
  {
    level: 2,
    name: 'Seedling',
    subtitle: 'Taking Root',
    icon: '🌿',
    gradient: 'from-stage-seedling to-orange-600',
  },
  {
    level: 3,
    name: 'Growing',
    subtitle: 'Branching Out',
    icon: '🌳',
    gradient: 'from-stage-growing to-orange-500',
  },
  {
    level: 4,
    name: 'Harvesting',
    subtitle: 'Full Bloom',
    icon: '🌾',
    gradient: 'from-stage-harvesting to-amber-500',
  },
]

export interface Question {
  id: string
  title: string
  category: string
  icon: string
  /** One entry per stage, in STAGES order (level 1 → 4). */
  stageDescriptions: string[][]
}

const CATEGORY_ICONS: Record<string, string> = {
  'Strategic Planning': '📋',
  'Registration and Governance': '🏛️',
  'Finance and Accounting': '💰',
  'Human Resources': '👥',
  'Donor Engagement and Fundraising': '🤝',
  'External Marketing and Communications': '📣',
  'Infrastructure and Equipment': '🏗️',
  'Commitment to People and Place': '🌍',
}

/**
 * Content is synced from the WCN Airtable base ("Source Material" table).
 * Run `npm run sync:content` to refresh questions.generated.json.
 */
export const QUESTIONS: Question[] = generated.questions.map((q) => ({
  ...q,
  icon: CATEGORY_ICONS[q.category] ?? '📋',
}))
