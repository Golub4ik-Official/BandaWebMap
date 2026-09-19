/**
 * sync-maps.js
 * Synchronizes map metadata from BandaMarines, BandaStation, and BandaTroopers
 * Generates data/maps.json for the web application.
 */

const fs = require('fs');
const path = require('path');

// Root paths (can be customized via environment variables for CI/CD)
const ROOT_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT_DIR, '..');

const BM_PATH = process.env.BM_PATH || path.join(REPO_ROOT, 'BandaMarines');
const BS_PATH = process.env.BS_PATH || path.join(REPO_ROOT, 'BandaStation');
const BT_PATH = process.env.BT_PATH || path.join(REPO_ROOT, 'BandaTroopers');

const OUTPUT_FILE = path.join(ROOT_DIR, 'data', 'maps.json');

// Helper to extract dimensions from a DMM file
function getDmmInfo(filePath) {
  if (!fs.existsSync(filePath)) {
    return { width: 255, height: 255, zLevels: 1 };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/\((\d+),\s*(\d+),\s*(\d+)\)\s*=\s*\{"([\s\S]*?)"\}/);
    let height = 255;
    if (match) {
      const gridLines = match[4].trim().split(/\r?\n/).filter(l => l.length > 0);
      if (gridLines.length > 0) {
        height = gridLines.length;
      }
    }
    const allBlocks = [...content.matchAll(/\((\d+),\s*(\d+),\s*(\d+)\)\s*=/g)];
    let maxX = 0, maxZ = 0;
    allBlocks.forEach(b => {
      const x = parseInt(b[1], 10);
      const z = parseInt(b[3], 10);
      if (x > maxX) maxX = x;
      if (z > maxZ) maxZ = z;
    });
    return {
      width: maxX || 255,
      height: height || 255,
      zLevels: maxZ || 1
    };
  } catch (e) {
    console.warn(`Could not read DMM info for ${filePath}:`, e.message);
    return { width: 255, height: 255, zLevels: 1 };
  }
}

// CM webmap URL mappings to AffectedArc07 image paths
const CM_IMAGE_BASE = 'https://mocha.affectedarc07.co.uk/webmap/cm';

const KNOWN_CM_WEBMAPS = {
  'Almayer': {
    path: 'almayer',
    filePrefix: 'USS_Almayer',
    bounds: [[0, 0], [-201, 300]],
    decks: ['Lower Deck', 'Deck 2', 'Deck 3', 'Upper Deck']
  },
  'Solaris': {
    path: 'solaris',
    filePrefix: 'BigRed',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Surface']
  },
  'Trijent': {
    path: 'trijent',
    filePrefix: 'Desert_Dam',
    bounds: [[0, 0], [-245, 232]],
    decks: ['Surface']
  },
  'Fiorina': {
    path: 'fiorina',
    filePrefix: 'Fiorina_SciAnnex',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Science Annex']
  },
  'Kutjevo': {
    path: 'kutjevo',
    filePrefix: 'Kutjevo',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Refinery']
  },
  'LV624': {
    path: 'lv624',
    filePrefix: 'LV624',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Ground']
  },
  'LV552': {
    path: 'lv522',
    filePrefix: 'LV522_Chances_Claim',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Ground']
  },
  'LV759': {
    path: 'lv759',
    filePrefix: 'LV759_Hybrisa_Prospera',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Colony']
  },
  'NewVaradero': {
    path: 'newvaradero',
    filePrefix: 'New_Varadero',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Surface']
  },
  'Shivas': {
    path: 'shivas',
    filePrefix: 'Shivas_Snowball',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Ice Surface']
  },
  'Sorokyne': {
    path: 'sorokyne',
    filePrefix: 'Sorokyne_Strata',
    bounds: [[0, 0], [-300, 300]],
    decks: ['Strata']
  },
  'WhiskeyOutpost': {
    path: 'whiskey',
    filePrefix: 'Whiskey_Outpost_v2',
    bounds: [[0, 0], [-200, 200]],
    decks: ['Outpost']
  }
};

// Map filenames to local nanomaps in BandaStation
const BS_NANOMAPS = {
  'Cyberiad': [
    { z: 1, name: 'Main Deck', file: 'Cyberiad_nanomap_z1.png' },
    { z: 2, name: 'Upper Deck', file: 'Cyberiad_nanomap_z2.png' }
  ],
  'Delta Station': [
    { z: 1, name: 'Station Deck', file: 'Delta Station_nanomap_z1.png' }
  ],
  'MetaStation': [
    { z: 1, name: 'Station Deck', file: 'MetaStation_nanomap_z1.png' }
  ],
  'Ice Box Station': [
    { z: 1, name: 'Caves', file: 'Ice Box Station_nanomap_z1.png' },
    { z: 2, name: 'Underground', file: 'Ice Box Station_nanomap_z2.png' },
    { z: 3, name: 'Surface', file: 'Ice Box Station_nanomap_z3.png' }
  ],
  'Kilo Station': [
    { z: 1, name: 'Station Deck', file: 'KiloStation_nanomap_z1.png' }
  ],
  'NebulaStation': [
    { z: 1, name: 'Lower Deck', file: 'NebulaStation_nanomap_z1.png' },
    { z: 2, name: 'Upper Deck', file: 'NebulaStation_nanomap_z2.png' }
  ],
  'Tramstation': [
    { z: 1, name: 'Lower Deck', file: 'Tramstation_nanomap_z1.png' },
    { z: 2, name: 'Upper Deck', file: 'Tramstation_nanomap_z2.png' }
  ],
  'Wawastation': [
    { z: 1, name: 'Lower Deck', file: 'Wawastation_nanomap_z1.png' },
    { z: 2, name: 'Upper Deck', file: 'Wawastation_nanomap_z2.png' }
  ],
  'Lavaland': [
    { z: 1, name: 'Mining Surface', file: 'Lavaland_nanomap_z1.png' }
  ],
  'Birdshot Station': [
    { z: 1, name: 'Station Deck', file: 'Birdshot Station_nanomap_z1.png' }
  ]
};

function parseBandaMarines() {
  const maps = [];
  const mapsDir = path.join(BM_PATH, 'maps');
  if (!fs.existsSync(mapsDir)) return maps;

  const files = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json'));

  files.forEach(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(mapsDir, f), 'utf8'));
      if (!data.map_name || !data.map_file) return;

      const id = f.replace('.json', '');
      const dmmPath = path.join(mapsDir, data.map_path || 'map_files', data.map_file);
      const dmmInfo = getDmmInfo(dmmPath);

      const webmapInfo = data.webmap_url ? KNOWN_CM_WEBMAPS[data.webmap_url] : null;

      const layers = [];
      const zCount = dmmInfo.zLevels;

      for (let z = 1; z <= zCount; z++) {
        let deckName = `Z-Level ${z}`;
        if (webmapInfo && webmapInfo.decks && webmapInfo.decks[z - 1]) {
          deckName = webmapInfo.decks[z - 1];
        } else if (z === 1 && zCount === 1) {
          deckName = 'Base Map';
        }

        let imageUrl = '';
        let pipeUrl = '';
        if (webmapInfo) {
          imageUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}.png`;
          pipeUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}-pipe.png`;
        }

        layers.push({
          z: z,
          name: deckName,
          imageUrl: imageUrl,
          pipenetUrl: pipeUrl
        });
      }

      maps.push({
        id: id,
        server: 'bandamarines',
        name: data.map_name,
        category: data.traits && data.traits.some(t => t['Marine Main Ship']) ? 'Ship' : 'Ground',
        mapFile: data.map_file,
        mapPath: data.map_path,
        width: dmmInfo.width,
        height: dmmInfo.height,
        zLevels: dmmInfo.zLevels,
        webmapUrl: data.webmap_url || null,
        traits: data.traits || [],
        announceText: data.announce_text || '',
        gamemodes: data.gamemodes || [],
        layers: layers
      });
    } catch (e) {
      console.error(`Error parsing BM ${f}:`, e.message);
    }
  });

  return maps;
}

function parseBandaStation() {
  const maps = [];
  const mapsDir = path.join(BS_PATH, '_maps');
  if (!fs.existsSync(mapsDir)) return maps;

  const files = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json'));

  files.forEach(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(mapsDir, f), 'utf8'));
      if (!data.map_name || !data.map_file) return;

      const id = f.replace('.json', '');
      const dmmPath = path.join(mapsDir, data.map_path || 'map_files', data.map_file);
      const dmmInfo = getDmmInfo(dmmPath);

      const nanomapList = BS_NANOMAPS[data.map_name] || [];
      const layers = [];
      const zCount = Math.max(dmmInfo.zLevels, nanomapList.length || 1);

      for (let z = 1; z <= zCount; z++) {
        const nano = nanomapList.find(n => n.z === z);
        let deckName = nano ? nano.name : (zCount > 1 ? `Deck ${z}` : 'Main Deck');
        let imageUrl = nano ? `assets/maps/bandastation/${nano.file}` : '';

        layers.push({
          z: z,
          name: deckName,
          imageUrl: imageUrl,
          pipenetUrl: ''
        });
      }

      maps.push({
        id: id,
        server: 'bandastation',
        name: data.map_name,
        fluffName: data.fluff_name || data.map_name,
        category: 'Station',
        mapFile: data.map_file,
        mapPath: data.map_path,
        width: dmmInfo.width,
        height: dmmInfo.height,
        zLevels: zCount,
        mainFloor: data.main_floor || 1,
        shuttles: data.shuttles || {},
        layers: layers
      });
    } catch (e) {
      console.error(`Error parsing BS ${f}:`, e.message);
    }
  });

  return maps;
}

function parseBandaTroopers() {
  const maps = [];
  const mapsDir = path.join(BT_PATH, 'maps');
  if (!fs.existsSync(mapsDir)) return maps;

  const files = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json'));

  files.forEach(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(mapsDir, f), 'utf8'));
      if (!data.map_name || !data.map_file) return;

      const id = f.replace('.json', '');
      const dmmPath = path.join(mapsDir, data.map_path || 'map_files', data.map_file);
      const dmmInfo = getDmmInfo(dmmPath);

      const webmapInfo = data.webmap_url ? KNOWN_CM_WEBMAPS[data.webmap_url] : null;

      const layers = [];
      const zCount = dmmInfo.zLevels;

      for (let z = 1; z <= zCount; z++) {
        let deckName = `Z-Level ${z}`;
        if (webmapInfo && webmapInfo.decks && webmapInfo.decks[z - 1]) {
          deckName = webmapInfo.decks[z - 1];
        } else if (z === 1 && zCount === 1) {
          deckName = 'Base Map';
        }

        let imageUrl = '';
        let pipeUrl = '';
        if (webmapInfo) {
          imageUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}.png`;
          pipeUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}-pipe.png`;
        }

        layers.push({
          z: z,
          name: deckName,
          imageUrl: imageUrl,
          pipenetUrl: pipeUrl
        });
      }

      const isShip = data.traits && data.traits.some(t => t['Marine Main Ship']);

      maps.push({
        id: id,
        server: 'bandatroopers',
        name: data.map_name,
        category: isShip ? 'Ship' : 'Ground',
        mapFile: data.map_file,
        mapPath: data.map_path,
        width: dmmInfo.width,
        height: dmmInfo.height,
        zLevels: dmmInfo.zLevels,
        webmapUrl: data.webmap_url || null,
        platoon: data.platoon || null,
        traits: data.traits || [],
        layers: layers
      });
    } catch (e) {
      console.error(`Error parsing BT ${f}:`, e.message);
    }
  });

  return maps;
}

function run() {
  console.log('--- Synchronizing Banda SS13 Maps ---');
  const bm = parseBandaMarines();
  const bs = parseBandaStation();
  const bt = parseBandaTroopers();

  console.log(`Parsed ${bm.length} maps from BandaMarines`);
  console.log(`Parsed ${bs.length} maps from BandaStation`);
  console.log(`Parsed ${bt.length} maps from BandaTroopers`);

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalMaps: bm.length + bs.length + bt.length,
    servers: {
      bandamarines: {
        id: 'bandamarines',
        name: 'BandaMarines',
        shortName: 'BM',
        color: '#22c55e', // Emerald / Marine green
        accentColor: '#15803d',
        icon: 'fa-shield-alt',
        description: 'Колониальные Морпехи США (USCM) против Ксеноморфов',
        maps: bm
      },
      bandastation: {
        id: 'bandastation',
        name: 'BandaStation',
        shortName: 'BS',
        color: '#38bdf8', // Cyan / Neon blue
        accentColor: '#0284c7',
        icon: 'fa-satellite',
        description: 'Классическая космическая станция NanoTrasen',
        maps: bs
      },
      bandatroopers: {
        id: 'bandatroopers',
        name: 'BandaTroopers',
        shortName: 'BT',
        color: '#f97316', // Orange / Titanium red
        accentColor: '#c2410c',
        icon: 'fa-crosshairs',
        description: 'Звёздный Десант, Halo и военные конфликты',
        maps: bt
      }
    }
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Generated manifest successfully -> ${OUTPUT_FILE}`);
}

run();
