/**
 * sync-maps.js (ESM)
 * Generates unified data/maps.json and public/data/maps.json
 * with dual-layer progressive loading support (previewUrl + fullUrl).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT_DIR, '..');

const BM_PATH = process.env.BM_PATH || path.join(REPO_ROOT, 'BandaMarines');
const BS_PATH = process.env.BS_PATH || path.join(REPO_ROOT, 'BandaStation');
const BT_PATH = process.env.BT_PATH || path.join(REPO_ROOT, 'BandaTroopers');

const OUTPUT_FILES = [
  path.join(ROOT_DIR, 'data', 'maps.json'),
  path.join(ROOT_DIR, 'public', 'data', 'maps.json')
];

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
    return { width: 255, height: 255, zLevels: 1 };
  }
}

// Full-HD High-Res Renders from AffectedArc07 CDN
const CM_IMAGE_BASE = 'https://mocha.affectedarc07.co.uk/webmap/cm';
const TG_IMAGE_BASE = 'https://mocha.affectedarc07.co.uk/webmap/tgstation';
const BS_IMAGE_BASE = 'https://mocha.affectedarc07.co.uk/webmap/bandastation';

const KNOWN_CM_MAPS = {
  'Almayer': {
    path: 'almayer',
    filePrefix: 'USS_Almayer',
    decks: ['Deck 1 (Lower)', 'Deck 2', 'Deck 3', 'Deck 4 (Upper)']
  },
  'Solaris': {
    path: 'solaris',
    filePrefix: 'BigRed',
    decks: ['Surface']
  },
  'Trijent': {
    path: 'trijent',
    filePrefix: 'Desert_Dam',
    decks: ['Surface']
  },
  'Fiorina': {
    path: 'fiorina',
    filePrefix: 'Fiorina_SciAnnex',
    decks: ['Science Annex']
  },
  'Kutjevo': {
    path: 'kutjevo',
    filePrefix: 'Kutjevo',
    decks: ['Refinery']
  },
  'LV624': {
    path: 'lv624',
    filePrefix: 'LV624',
    decks: ['Ground Colony']
  },
  'LV552': {
    path: 'lv522',
    filePrefix: 'LV522_Chances_Claim',
    decks: ['Ground']
  },
  'LV759': {
    path: 'lv759',
    filePrefix: 'LV759_Hybrisa_Prospera',
    decks: ['Colony']
  },
  'NewVaradero': {
    path: 'newvaradero',
    filePrefix: 'New_Varadero',
    decks: ['Surface']
  },
  'Shivas': {
    path: 'shivas',
    filePrefix: 'Shivas_Snowball',
    decks: ['Ice Surface']
  },
  'Sorokyne': {
    path: 'sorokyne',
    filePrefix: 'Sorokyne_Strata',
    decks: ['Strata']
  },
  'WhiskeyOutpost': {
    path: 'whiskey',
    filePrefix: 'Whiskey_Outpost_v2',
    decks: ['Outpost']
  }
};

const KNOWN_BS_MAPS = {
  'Cyberiad': {
    fullBase: `${BS_IMAGE_BASE}/cyberiad`,
    layers: [
      { z: 1, name: 'Ghetto Deck', fullFile: 'Cyberiad-1.png', preview: 'Cyberiad_nanomap_z1.png' },
      { z: 2, name: 'Main Deck', fullFile: 'Cyberiad-2.png', preview: 'Cyberiad_nanomap_z2.png' }
    ]
  },
  'Delta Station': {
    fullBase: `${TG_IMAGE_BASE}/deltastation`,
    layers: [
      { z: 1, name: 'Station Deck', fullFile: 'DeltaStation2-1.png', preview: 'Delta Station_nanomap_z1.png' }
    ]
  },
  'MetaStation': {
    fullBase: `${TG_IMAGE_BASE}/metastation`,
    layers: [
      { z: 1, name: 'Station Deck', fullFile: 'MetaStation-1.png', preview: 'MetaStation_nanomap_z1.png' }
    ]
  },
  'Ice Box Station': {
    fullBase: `${TG_IMAGE_BASE}/icebox`,
    layers: [
      { z: 1, name: 'Caves', fullFile: 'IceBoxStation-1.png', preview: 'Ice Box Station_nanomap_z1.png' },
      { z: 2, name: 'Underground', fullFile: 'IceBoxStation-2.png', preview: 'Ice Box Station_nanomap_z2.png' },
      { z: 3, name: 'Surface', fullFile: 'IceBoxStation-3.png', preview: 'Ice Box Station_nanomap_z3.png' }
    ]
  },
  'Kilo Station': {
    fullBase: `${TG_IMAGE_BASE}/kilostation`,
    layers: [
      { z: 1, name: 'Station Deck', fullFile: 'KiloStation-1.png', preview: 'KiloStation_nanomap_z1.png' }
    ]
  },
  'Tramstation': {
    fullBase: `${TG_IMAGE_BASE}/tram`,
    layers: [
      { z: 1, name: 'Lower Deck', fullFile: 'tramstation-1.png', preview: 'Tramstation_nanomap_z1.png' },
      { z: 2, name: 'Upper Deck', fullFile: 'tramstation-2.png', preview: 'Tramstation_nanomap_z2.png' }
    ]
  },
  'NebulaStation': {
    fullBase: `${TG_IMAGE_BASE}/nebulastation`,
    layers: [
      { z: 1, name: 'Lower Deck', fullFile: 'NebulaStation-1.png', preview: 'NebulaStation_nanomap_z1.png' },
      { z: 2, name: 'Upper Deck', fullFile: 'NebulaStation-2.png', preview: 'NebulaStation_nanomap_z2.png' }
    ]
  },
  'Wawastation': {
    fullBase: `${TG_IMAGE_BASE}/wawastation`,
    layers: [
      { z: 1, name: 'Lower Deck', fullFile: 'wawastation-1.png', preview: 'Wawastation_nanomap_z1.png' },
      { z: 2, name: 'Upper Deck', fullFile: 'wawastation-2.png', preview: 'Wawastation_nanomap_z2.png' }
    ]
  },
  'Birdshot Station': {
    fullBase: `${TG_IMAGE_BASE}/birdshot`,
    layers: [
      { z: 1, name: 'Station Deck', fullFile: 'birdshot-1.png', preview: 'Birdshot Station_nanomap_z1.png' }
    ]
  },
  'Lavaland': {
    fullBase: `${TG_IMAGE_BASE}/lavaland`,
    layers: [
      { z: 1, name: 'Mining Surface', fullFile: 'Lavaland-1.png', preview: 'Lavaland_nanomap_z1.png' }
    ]
  }
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

      const webmapInfo = data.webmap_url ? KNOWN_CM_MAPS[data.webmap_url] : null;

      const previewMap = {
        'almayer': '',
        'bigredv2': 'maps/bandamarines/solaris-1.png',
        'desert_dam': 'maps/bandamarines/trijent-1.png',
        'lv624': 'maps/bandamarines/lv624-1.png',
        'kutjevo': 'maps/bandamarines/kutjevo-1.png',
        'sorokyne_strata': 'maps/bandamarines/sorokyne-1.png',
        'prison_station_fop': 'maps/bandamarines/fiorina_cellblocks-1.png',
        'ice_colony_v2': 'maps/bandamarines/ice_colony-1.png'
      };

      const layers = [];
      const zCount = dmmInfo.zLevels;

      for (let z = 1; z <= zCount; z++) {
        let deckName = `Deck ${z}`;
        if (webmapInfo && webmapInfo.decks && webmapInfo.decks[z - 1]) {
          deckName = webmapInfo.decks[z - 1];
        } else if (z === 1 && zCount === 1) {
          deckName = 'Main Deck';
        }

        let fullUrl = '';
        let pipeUrl = '';
        if (webmapInfo) {
          fullUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}.png`;
          pipeUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}-pipe.png`;
        }

        let previewUrl = '';
        if (z === 1 && previewMap[id]) {
          previewUrl = previewMap[id];
        }

        layers.push({
          z: z,
          name: deckName,
          previewUrl: previewUrl,
          fullUrl: fullUrl,
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
        announceText: data.announce_text || '',
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

      const knownMap = KNOWN_BS_MAPS[data.map_name];
      const layers = [];
      const zCount = knownMap ? knownMap.layers.length : dmmInfo.zLevels;

      for (let z = 1; z <= zCount; z++) {
        let deckName = `Deck ${z}`;
        let previewUrl = '';
        let fullUrl = '';

        if (knownMap) {
          const lConf = knownMap.layers.find(l => l.z === z) || knownMap.layers[z - 1];
          if (lConf) {
            deckName = lConf.name;
            previewUrl = `maps/bandastation/${lConf.preview}`;
            fullUrl = `${knownMap.fullBase}/${lConf.fullFile}`;
          }
        } else if (zCount === 1) {
          deckName = 'Station Deck';
        }

        layers.push({
          z: z,
          name: deckName,
          previewUrl: previewUrl,
          fullUrl: fullUrl,
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

      const webmapInfo = data.webmap_url ? KNOWN_CM_MAPS[data.webmap_url] : null;

      const layers = [];
      const zCount = dmmInfo.zLevels;

      for (let z = 1; z <= zCount; z++) {
        let deckName = `Deck ${z}`;
        if (webmapInfo && webmapInfo.decks && webmapInfo.decks[z - 1]) {
          deckName = webmapInfo.decks[z - 1];
        } else if (z === 1 && zCount === 1) {
          deckName = 'Operational Deck';
        }

        let fullUrl = '';
        let pipeUrl = '';
        if (webmapInfo) {
          fullUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}.png`;
          pipeUrl = `${CM_IMAGE_BASE}/${webmapInfo.path}/${webmapInfo.filePrefix}-${z}-pipe.png`;
        }

        layers.push({
          z: z,
          name: deckName,
          previewUrl: '',
          fullUrl: fullUrl,
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
        layers: layers
      });
    } catch (e) {
      console.error(`Error parsing BT ${f}:`, e.message);
    }
  });

  return maps;
}

function run() {
  console.log('--- Generating High-Res Progressive Maps Manifest ---');
  const bm = parseBandaMarines();
  const bs = parseBandaStation();
  const bt = parseBandaTroopers();

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalMaps: bm.length + bs.length + bt.length,
    servers: {
      bandamarines: {
        id: 'bandamarines',
        name: 'BandaMarines',
        shortName: 'Marines',
        color: '#22c55e',
        maps: bm
      },
      bandastation: {
        id: 'bandastation',
        name: 'BandaStation',
        shortName: 'Station',
        color: '#38bdf8',
        maps: bs
      },
      bandatroopers: {
        id: 'bandatroopers',
        name: 'BandaTroopers',
        shortName: 'Troopers',
        color: '#f97316',
        maps: bt
      }
    }
  };

  OUTPUT_FILES.forEach(dest => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Saved manifest -> ${dest}`);
  });
}

run();
