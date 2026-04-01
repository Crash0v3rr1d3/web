import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.ransomware.live/v2';
const DATA_DIR = path.join(__dirname, '../src/data/remote');
const API_KEY = process.env.RANSOMWARE_API_KEY;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchJsonWithRetry(url, timeoutMs = 60000, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetchJson(url, timeoutMs);
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Attempt ${attempt}/${retries} failed for ${url}: ${err.message}. Retrying in ${attempt * 5}s...`);
      await sleep(attempt * 5000);
    }
  }
}

function fetchJson(url, timeoutMs = 60000, redirectCount = 0) {
  if (redirectCount > 3) {
    return Promise.reject(new Error(`Too many redirects for ${url}`));
  }
  return new Promise((resolve, reject) => {
    const headers = { 
        'User-Agent': 'Astro-Data-Fetcher/1.0',
        'Accept': 'application/json'
    };
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      headers['x-api-key'] = API_KEY;
    }

    const req = https.get(url, { family: 4, timeout: timeoutMs, headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        let location = res.headers.location;
        if (location) {
          if (location.startsWith('/')) {
            const originalUrl = new URL(url);
            location = `${originalUrl.protocol}//${originalUrl.host}${location}`;
          }
          console.log(`Following redirect to ${location}...`);
          return resolve(fetchJson(location, timeoutMs, redirectCount + 1));
        }
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP Status ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out for ${url}`));
    });
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('--- Starting Ransomware.live Data Sync ---');
  
  try {
    // --- Groups Logic ---
    console.log('Fetching all groups...');
    const groups = await fetchJsonWithRetry(`${API_BASE}/groups`);
    fs.writeFileSync(path.join(DATA_DIR, 'groups.json'), JSON.stringify(groups, null, 2));
    console.log(`Saved ${groups.length} groups to groups.json`);

    const profileDir = path.join(DATA_DIR, 'profiles');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir);

    // To avoid overwhelming the API and causing timeouts, we fetch in chunks with delays
    const CHUNK_SIZE = 5;
    for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
      const chunk = groups.slice(i, i + CHUNK_SIZE);
      console.log(`Processing group chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(groups.length / CHUNK_SIZE)}...`);
      
      await Promise.allSettled(chunk.map(async (group) => {
        const groupName = group.name;
        const safeName = encodeURIComponent(groupName);
        const filePath = path.join(profileDir, `${safeName}.json`);

        try {
          const profile = await fetchJson(`${API_BASE}/group/${safeName}`);
          fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
        } catch (err) {
          console.error(`Failed to fetch profile for ${groupName}: ${err.message}`);
        }
      }));

      await sleep(1000);
    }

    // --- Victims Logic ---
    console.log('Fetching recent victims...');
    const recentVictims = await fetchJsonWithRetry(`${API_BASE}/recentvictims`);
    fs.writeFileSync(path.join(DATA_DIR, 'recent_victims.json'), JSON.stringify(recentVictims, null, 2));
    console.log(`Saved ${recentVictims.length} recent victims.`);

    // Also fetch the full list for the search/filter page
    console.log('Fetching all victims...');
    let allVictims = [];
    try {
      allVictims = await fetchJson(`${API_BASE}/victims/`);
    } catch (err) {
      console.warn(`Failed to fetch all victims, using recent victims as fallback: ${err.message}`);
      allVictims = recentVictims;
    }
    fs.writeFileSync(path.join(DATA_DIR, 'all_victims.json'), JSON.stringify(allVictims, null, 2));
    console.log(`Saved ${allVictims.length} victims to all_victims.json`);

    const victimDir = path.join(DATA_DIR, 'victims');
    if (!fs.existsSync(victimDir)) fs.mkdirSync(victimDir, { recursive: true });

    // We only fetch details for RECENT victims to keep build times manageable
    // But we'll do enough to populate the site well (e.g. top 100)
    const victimsToFetch = recentVictims.slice(0, 100);
    console.log(`Fetching details for top ${victimsToFetch.length} recent victims...`);

    for (let i = 0; i < victimsToFetch.length; i += CHUNK_SIZE) {
      const chunk = victimsToFetch.slice(i, i + CHUNK_SIZE);
      console.log(`Processing victim chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(victimsToFetch.length / CHUNK_SIZE)}...`);
      
      await Promise.allSettled(chunk.map(async (victim) => {
        // Victim IDs often contain special characters or are just names
        const victimId = victim.victim; 
        const safeId = encodeURIComponent(victimId);
        const filePath = path.join(victimDir, `${safeId}.json`);

        try {
          // Use the specific victim endpoint
          const details = await fetchJson(`${API_BASE}/victim/${safeId}`);
          fs.writeFileSync(filePath, JSON.stringify(details, null, 2));
        } catch (err) {
          console.error(`Failed to fetch details for victim ${victimId}: ${err.message}`);
        }
      }));

      await sleep(1000);
    }

    // --- Malpedia Actors ---
    console.log('Fetching Malpedia actors...');
    try {
      const actors = await fetchJson('https://malpedia.caad.fkie.fraunhofer.de/api/get/actors', 120000);
      fs.writeFileSync(path.join(DATA_DIR, 'malpedia_actors.json'), JSON.stringify(actors, null, 2));
      console.log(`Saved Malpedia actors (${Object.keys(actors).length} entries).`);
    } catch (err) {
      console.warn(`Failed to fetch Malpedia actors: ${err.message}`);
      // Write an empty object so the build doesn't crash on missing file
      const fallbackPath = path.join(DATA_DIR, 'malpedia_actors.json');
      if (!fs.existsSync(fallbackPath)) {
        fs.writeFileSync(fallbackPath, '{}');
        console.log('Wrote empty malpedia_actors.json fallback.');
      }
    }

    console.log('--- Data Sync Complete ---');
  } catch (error) {
    console.error('Fatal error during sync:', error);
    process.exit(1);
  }
}

main();
