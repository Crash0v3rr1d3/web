import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://poc-in-github.motikan2010.net/api/v1/?limit=200';
const DATA_DIR = path.join(__dirname, '../src/data/remote');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function fetchJson(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const headers = { 
        'User-Agent': 'Astro-Data-Fetcher/1.0',
        'Accept': 'application/json'
    };

    const req = https.get(url, { family: 4, timeout: timeoutMs, headers }, (res) => {
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

async function main() {
  console.log('--- Starting PoC Data Sync ---');
  
  try {
    console.log(`Fetching PoCs from ${API_URL}...`);
    const data = await fetchJson(API_URL);
    
    if (data && data.pocs) {
      fs.writeFileSync(path.join(DATA_DIR, 'pocs.json'), JSON.stringify(data.pocs, null, 2));
      console.log(`Saved ${data.pocs.length} PoCs to pocs.json`);
    } else {
      console.error('Unexpected API response structure:', data);
    }

    console.log('--- PoC Data Sync Complete ---');
  } catch (error) {
    console.error('PoC data sync failed:', error.message);
    console.log('Keeping existing cached data.');
  }
}

main();
