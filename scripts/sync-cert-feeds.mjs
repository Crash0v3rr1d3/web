import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const README_URL = 'https://raw.githubusercontent.com/pulsedive/certrss/main/README.md';
const DATA_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'cert-feeds.json');

/**
 * MANUAL FEED CONFIGURATION
 * Add any CERT RSS feeds here that are NOT in the Pulsedive GitHub repository.
 */
const MANUAL_FEEDS = [
    {
        name: 'INCIBE-CERT',
        url: 'https://www.incibe.es/incibe-cert/alerta-temprana/avisos/feed',
        region: 'Spain'
    }
];

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP Status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('--- Syncing CERT Feeds ---');
  try {
    const markdown = await fetchText(README_URL);
    
    // Find the RSS Feeds section
    const tableHeader = '| Country | CERT | RSS | English? | Last Updated |';
    const startIndex = markdown.indexOf(tableHeader);
    if (startIndex === -1) {
        throw new Error('Could not find RSS Feeds table in README');
    }
    
    const tableContent = markdown.substring(startIndex).split('\n\n')[0];
    const lines = tableContent.split('\n').slice(2); // Skip header and separator
    
    const feeds = [...MANUAL_FEEDS];
    const seenUrls = new Set(MANUAL_FEEDS.map(f => f.url));

    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 5) continue;
        
        const country = parts[1];
        const certName = parts[2];
        const rssUrlMatch = parts[3].match(/https?:\/\/[^\s|~]+/);
        
        if (rssUrlMatch) {
            const url = rssUrlMatch[0];
            if (seenUrls.has(url)) continue;
            
            feeds.push({
                name: certName,
                url: url,
                region: country
            });
            seenUrls.add(url);
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(feeds, null, 2));
    console.log(`Saved ${feeds.length} feeds to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error syncing feeds:', error);
    process.exit(1);
  }
}

main();
