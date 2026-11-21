// Picks the best fresh security story from the news feeds and Hacker News
// and posts it to X. Runs from .github/workflows/post-to-x.yml.
//
// Env:
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET  (OAuth 1.0a user context)
//   DRY_RUN=1        print what would be posted, change nothing (automatic when keys are missing)
//   POSTS_PER_RUN    default 1
//   MIN_GAP_MINUTES  skip if the last post is newer than this (default 90)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '../data/x-posted.json');

const FEEDS = [
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', weight: 0 },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', weight: 5 },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', weight: 15 },
  { name: 'The Record', url: 'https://therecord.media/feed', weight: 5 },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', weight: 0 },
  { name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/', weight: 0 },
  // Hacker News front page, 100+ points; only security stories are kept (see HN_TOPIC).
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage?points=100&count=50', weight: 0, hn: true },
];

const HN_TOPIC = /\b(secur|vulnerab|exploit|cve-\d|zero[- ]day|0day|breach|leak|hack|ransomware|malware|spyware|phish|backdoor|surveillance|encrypt|privacy|botnet|ddos|stalkerware|infostealer|supply[- ]chain|rce|xss|csrf|sandbox escape|jailbreak|password|passkey|tls|ssh|openssl|crypto(graph)?)/i;
const JUNK = /\b(webinar|sponsored|podcast|weekly recap|week in review|newsletter|deal[s]?\b|coupon|lifetime (license|subscription)|save \d+%|\d+% off|black friday|cyber monday)\b/i;

const STOP = new Set('the a an and or of to in on for with from by at as is are was were be been has have had its it this that these those new how why what who after over into via amid says said report reports warns warn update updates attack attacks hackers hacker security cyber'.split(' '));

const env = process.env;
const KEYS = [env.X_API_KEY, env.X_API_SECRET, env.X_ACCESS_TOKEN, env.X_ACCESS_SECRET];
const DRY = env.DRY_RUN === '1' || env.DRY_RUN === 'true' || KEYS.some((k) => !k);
const PER_RUN = Number(env.POSTS_PER_RUN || 1);
const MIN_GAP = Number(env.MIN_GAP_MINUTES ?? 90);

/* ── feeds ─────────────────────────────────────────────────────── */

function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

function normUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$)/i.test(k)) url.searchParams.delete(k);
    url.hostname = url.hostname.replace(/^www\./, '');
    return url.toString().replace(/\/$/, '');
  } catch { return u; }
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-poster/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map((b) => {
    let link = tag(b, 'link');
    if (!link) link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const date = new Date(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'));
    const points = feed.hn ? Number((tag(b, 'description').match(/Points:\s*(\d+)/) || [])[1] || 0) : 0;
    return { source: feed.name, weight: feed.weight, hn: !!feed.hn, title: tag(b, 'title'), url: link.trim(), date, points };
  }).filter((i) => i.title && /^https?:\/\//.test(i.url) && !isNaN(i.date));
}

/* ── story matching ────────────────────────────────────────────── */

function tokens(title) {
  const cves = title.match(/CVE-\d{4}-\d+/gi) || [];
  const words = title.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  return new Set([...words, ...cves.map((c) => c.toLowerCase())]);
}

function sameStory(a, b) {
  const ta = a.tok, tb = b.tok;
  for (const t of ta) if (t.startsWith('cve-') && tb.has(t)) return true;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const jac = shared / (ta.size + tb.size - shared || 1);
  return shared >= 3 && jac >= 0.25;
}

/* ── composing ─────────────────────────────────────────────────── */

const TAGS = [
  [/ransomware/i, '#ransomware'],
  [/zero[- ]day|0day/i, '#zeroday'],
  [/CVE-\d|vulnerab|flaw|patch/i, '#vulnerability'],
  [/breach|leak|exposed|stolen data/i, '#databreach'],
  [/phish/i, '#phishing'],
  [/malware|infostealer|trojan|botnet|backdoor|spyware/i, '#malware'],
  [/privacy|surveillance|tracking/i, '#privacy'],
  [/\bAI\b|LLM|chatgpt|claude|gemini|copilot/i, '#AI'],
];

function compose(item, alsoCount) {
  const tags = ['#cybersecurity'];
  for (const [re, t] of TAGS) if (re.test(item.title) && tags.length < 3) tags.push(t);
  const via = item.hn ? `via Hacker News (${item.points} points)` : `via ${item.source}`;
  const more = alsoCount > 0 ? ` + ${alsoCount} more outlet${alsoCount > 1 ? 's' : ''}` : '';
  const tail = `\n\n${via}${more}\n${tags.join(' ')}\n`;
  // X counts every link as 23 characters.
  const budget = 280 - 23 - [...tail].length;
  let title = item.title;
  if ([...title].length > budget) title = [...title].slice(0, budget - 1).join('').replace(/\s+\S*$/, '') + '…';
  return `${title}${tail}${item.url}`;
}

/* ── X API (OAuth 1.0a) ────────────────────────────────────────── */

const pct = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

export function oauthSignature(method, url, params, consumerSecret, tokenSecret) {
  const norm = Object.keys(params).sort().map((k) => `${pct(k)}=${pct(params[k])}`).join('&');
  const base = [method.toUpperCase(), pct(url), pct(norm)].join('&');
  return crypto.createHmac('sha1', `${pct(consumerSecret)}&${pct(tokenSecret)}`).update(base).digest('base64');
}

async function postToX(text) {
  const [key, secret, token, tokenSecret] = KEYS;
  const url = 'https://api.x.com/2/tweets';
  const o = {
    oauth_consumer_key: key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: '1.0',
  };
  o.oauth_signature = oauthSignature('POST', url, o, secret, tokenSecret);
  const auth = 'OAuth ' + Object.keys(o).sort().map((k) => `${pct(k)}="${pct(o[k])}"`).join(', ');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`X API ${res.status}: ${body}`);
  return JSON.parse(body).data?.id;
}

/* ── main ──────────────────────────────────────────────────────── */

async function main() {
  const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { posted: [] };
  const now = Date.now();

  const last = state.posted.at(-1);
  if (!DRY && last && now - Date.parse(last.at) < MIN_GAP * 60000) {
    console.log(`Last post was ${Math.round((now - Date.parse(last.at)) / 60000)} min ago (< ${MIN_GAP}); skipping.`);
    return;
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  let items = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else console.warn(`! ${FEEDS[i].name}: ${r.reason.message}`);
  });
  console.log(`Fetched ${items.length} items from ${results.filter((r) => r.status === 'fulfilled').length}/${FEEDS.length} feeds.`);

  items = items
    .filter((i) => !(i.hn && !HN_TOPIC.test(i.title)))
    .filter((i) => !JUNK.test(i.title))
    .filter((i) => i.date.getTime() <= now + 3600e3)
    .map((i) => ({ ...i, key: normUrl(i.url), tok: tokens(i.title), ageH: (now - i.date.getTime()) / 3600e3 }));

  const postedUrls = new Set(state.posted.map((p) => p.key || normUrl(p.url)));
  const recentPosted = state.posted
    .filter((p) => now - Date.parse(p.at) < 7 * 86400e3)
    .map((p) => ({ tok: tokens(p.title) }));

  for (const maxAge of [18, 36]) {
    const pool = items.filter((i) => i.ageH <= maxAge);
    for (const i of pool) {
      const others = pool.filter((o) => o !== i && o.source !== i.source && sameStory(i, o));
      i.also = new Set(others.map((o) => o.source)).size;
      // Freshness, plus cross-outlet coverage as the importance signal, plus HN votes.
      i.score = 100 - i.ageH * 3 + 25 * Math.min(i.also, 3) + Math.min(i.points / 10, 30) + i.weight;
    }
    const picks = [];
    for (const i of pool.sort((a, b) => b.score - a.score)) {
      if (picks.length >= PER_RUN) break;
      if (postedUrls.has(i.key)) continue;
      if (recentPosted.some((p) => sameStory(i, p))) continue;
      if (picks.some((p) => sameStory(i, p))) continue;
      picks.push(i);
    }
    if (picks.length) return publish(picks, state);
  }
  console.log('Nothing new worth posting.');
}

async function publish(picks, state) {
  for (const item of picks) {
    const text = compose(item, item.also);
    console.log(`\n${DRY ? '[dry run] would post' : 'Posting'} (score ${item.score.toFixed(1)}):\n---\n${text}\n---`);
    if (DRY) continue;
    const id = await postToX(text);
    console.log(`Posted: https://x.com/i/status/${id}`);
    state.posted.push({ at: new Date().toISOString(), url: item.url, key: item.key, title: item.title, source: item.source, id });
  }
  if (!DRY) {
    state.posted = state.posted.slice(-500);
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
