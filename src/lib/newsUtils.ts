// Shared between the /news/ build-time frontmatter and its client script —
// keep this file free of Node-only imports.

export type NewsItem = {
  title: string
  link: string
  ts: number
  excerpt: string
  sourceId: string
}

// Class strings shared by the SSR markup (NewsCard.astro) and the client
// re-renderer. This file is scanned by UnoCSS, so utilities used only here
// still get generated.
export const BADGE_BASE =
  'text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap '
export const TAB_BASE =
  'text-[11px] font-mono tracking-wider px-2.5 py-1 rounded border transition-colors duration-200 cursor-pointer '
export const TAB_ACTIVE =
  TAB_BASE + 'text-green-400 border-green-500/60 bg-green-500/10'
export const TAB_INACTIVE =
  TAB_BASE +
  'text-neutral-400 border-neutral-700 bg-transparent hover:text-green-400 hover:border-green-500/50'

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function excerptOf(raw: string, max: number = 240): string {
  const text = stripHtml(raw)
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…'
}

export function timeAgo(ts: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - ts) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
  })
}

export function fullDate(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dayLabel(ts: number, now: number): string {
  const d = new Date(ts)
  const n = new Date(now)
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(n) - startOfDay(d)) / 86400000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric',
  })
}

export function isFresh(ts: number, now: number): boolean {
  return now - ts < 24 * 60 * 60 * 1000
}

// Dedupe key: same story syndicated with different tracking params should collapse.
export function normalizeLink(link: string): string {
  try {
    const u = new URL(link)
    u.hash = ''
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
        u.searchParams.delete(key)
      }
    }
    return u.toString().replace(/\/$/, '').toLowerCase()
  } catch {
    return link.trim().toLowerCase()
  }
}
