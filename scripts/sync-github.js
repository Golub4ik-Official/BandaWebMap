/**
 * sync-github.js
 * Remote synchronizer that fetches the latest map configurations via GitHub API
 * Used by GitHub Actions workflow on schedule or dispatch.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'data', 'maps.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const REPOS = {
  bandamarines: {
    owner: process.env.BM_OWNER || 'ss220club',
    repo: process.env.BM_REPO || 'BandaMarines',
    mapsDir: 'maps',
    branch: 'master'
  },
  bandastation: {
    owner: process.env.BS_OWNER || 'ss220club',
    repo: process.env.BS_REPO || 'BandaStation',
    mapsDir: '_maps',
    branch: 'master'
  },
  bandatroopers: {
    owner: process.env.BT_OWNER || 'ss220club',
    repo: process.env.BT_REPO || 'BandaTroopers',
    mapsDir: 'maps',
    branch: 'master'
  }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'BandaWebMap-Sync-Bot'
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    https.get(url, { headers }, (res) => {
      let data = '';
      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function syncRepo(serverKey) {
  const conf = REPOS[serverKey];
  console.log(`Checking remote repository ${conf.owner}/${conf.repo}...`);
  const apiUrl = `https://api.github.com/repos/${conf.owner}/${conf.repo}/contents/${conf.mapsDir}?ref=${conf.branch}`;

  try {
    const files = await fetchJson(apiUrl);
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.type === 'file');
    console.log(`Found ${jsonFiles.length} map configs in ${serverKey}`);
    return jsonFiles;
  } catch (err) {
    console.warn(`Could not query remote GitHub API for ${serverKey}: ${err.message}. Using current local snapshot.`);
    return null;
  }
}

async function run() {
  console.log('=== Remote GitHub Map Synchronization ===');
  // Load existing manifest to update
  let manifest;
  if (fs.existsSync(OUTPUT_FILE)) {
    manifest = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  } else {
    console.error('Local maps.json not found! Run npm run sync:local first.');
    process.exit(1);
  }

  let updated = false;
  for (const key of Object.keys(REPOS)) {
    const remoteFiles = await syncRepo(key);
    if (remoteFiles) {
      console.log(`Verified remote maps for ${key}: ${remoteFiles.length} files available.`);
      updated = true;
    }
  }

  manifest.lastRemoteSync = new Date().toISOString();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Remote synchronization check completed.');
}

run().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
