export type Site = {
  TITLE: string
  DESCRIPTION: string
  EMAIL: string
  NUM_POSTS_ON_HOMEPAGE: number
  POSTS_PER_PAGE: number
  SITEURL: string
}

export type Link = {
  href: string
  label: string
}

export const SITE: Site = {
  TITLE: 'crash0v3rr1d3.com',
  DESCRIPTION:
    'sec researcher.',
  EMAIL: 'crash0v3rr1d3@icloud.com',
  NUM_POSTS_ON_HOMEPAGE: 2,
  POSTS_PER_PAGE: 4,
  SITEURL: 'https://crash0v3rr1d3.com',
}

export const NAV_LINKS: Link[] = [
  { href: '/', label: 'home' },
  { href: '/blog', label: 'blog' },
  { href: '/writeups', label: 'writeups' },
  { href: '/news', label: 'news' },
  { href: '/cves', label: 'cves' },
  { href: '/pocs', label: 'PoCs' },
  { href: '/certs', label: 'CERTs' },
  { href: '/groups', label: 'APTs' },
  // { href: '/authors', label: 'authors' },
  // { href: '/about', label: 'about' },
  // { href: '/tags', label: 'tags' },
]

export const SOCIAL_LINKS: Link[] = [
  { href: 'https://github.com/Crash0verr1d3', label: 'GitHub' },
  { href: 'https://x.com/Crash0verr1d3', label: 'Twitter' },
  { href: 'mailto:crash0v3rr1d3@icloud.com', label: 'Email' },
  { href: '/rss.xml', label: 'RSS' },
]

export type NewsSource = {
  id: string
  name: string
  abbr: string
  url: string
  // UnoCSS classes for the source pill — full strings so the scanner picks them up
  badge: string
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'thn',
    name: 'The Hacker News',
    abbr: 'THN',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    badge: 'text-amber-400 border-amber-400/50 bg-amber-400/10',
  },
  {
    id: 'bc',
    name: 'BleepingComputer',
    abbr: 'BC',
    url: 'https://www.bleepingcomputer.com/feed/',
    badge: 'text-cyan-400 border-cyan-400/50 bg-cyan-400/10',
  },
  {
    id: 'krebs',
    name: 'Krebs on Security',
    abbr: 'KREBS',
    url: 'https://krebsonsecurity.com/feed/',
    badge: 'text-red-400 border-red-400/50 bg-red-400/10',
  },
  {
    id: 'record',
    name: 'The Record',
    abbr: 'RECORD',
    url: 'https://therecord.media/feed',
    badge: 'text-violet-400 border-violet-400/50 bg-violet-400/10',
  },
  {
    id: 'dr',
    name: 'Dark Reading',
    abbr: 'DR',
    url: 'https://www.darkreading.com/rss.xml',
    badge: 'text-orange-400 border-orange-400/50 bg-orange-400/10',
  },
  {
    id: 'sw',
    name: 'SecurityWeek',
    abbr: 'SW',
    url: 'https://www.securityweek.com/feed/',
    badge: 'text-blue-400 border-blue-400/50 bg-blue-400/10',
  },
]

export const NEWS_FEEDS: string[] = NEWS_SOURCES.map((s) => s.url)

export const CVE_FEEDS: string[] = [
  'https://cvefeed.io/rssfeed/latest.xml'
]
