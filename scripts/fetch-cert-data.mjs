import fs from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../src/data');
const REMOTE_DATA_DIR = path.join(DATA_DIR, 'remote');
const FEEDS_FILE = path.join(DATA_DIR, 'cert-feeds.json');
const OUTPUT_FILE = path.join(REMOTE_DATA_DIR, 'certs.json');

if (!fs.existsSync(REMOTE_DATA_DIR)) {
  fs.mkdirSync(REMOTE_DATA_DIR, { recursive: true });
}

const parser = new Parser({
    timeout: 10000,
    headers: { 'User-Agent': 'Astro-CERT-Fetcher/1.0' }
});

async function main() {
  console.log('--- Fetching CERT Data ---');
  
  if (!fs.existsSync(FEEDS_FILE)) {
      console.error(`Feeds file not found: ${FEEDS_FILE}`);
      process.exit(1);
  }
  
  const feeds = JSON.parse(fs.readFileSync(FEEDS_FILE, 'utf8'));
  console.log(`Found ${feeds.length} feeds to poll.`);
  
  let allItems = [];
  
  const results = await Promise.allSettled(feeds.map(async (feed) => {
      try {
          const result = await parser.parseURL(feed.url);
          return result.items.map(item => ({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
              cert: feed.name,
              region: feed.region,
              contentSnippet: item.contentSnippet || ''
          }));
      } catch (err) {
          console.error(`Error fetching ${feed.name} (${feed.url}):`, err.message);
          return [];
      }
  }));
  
  results.forEach(result => {
      if (result.status === 'fulfilled') {
          allItems = allItems.concat(result.value);
      }
  });
  
  // Deduplicate by link
  const seen = new Set();
  const uniqueItems = allItems.filter(item => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
  });
  
  // Sort by date
  uniqueItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  
  // Keep latest 500 items
  const finalItems = uniqueItems.slice(0, 500);
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalItems, null, 2));
  console.log(`Saved ${finalItems.length} items to ${OUTPUT_FILE}`);
}

main();
