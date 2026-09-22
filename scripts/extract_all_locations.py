import os
import sys
import json
import re
import time
from collections import defaultdict

ROOT_DIR = r'c:\Space Station 13\BandaWebMap'
MAPS_JSON_PATH = os.path.join(ROOT_DIR, 'public', 'data', 'maps.json')
DATA_MAPS_JSON = os.path.join(ROOT_DIR, 'data', 'maps.json')
PUBLIC_LOCATIONS_DIR = os.path.join(ROOT_DIR, 'public', 'data', 'locations')
DATA_LOCATIONS_DIR = os.path.join(ROOT_DIR, 'data', 'locations')

REPOS = {
    'bandamarines': r'c:\Space Station 13\BandaMarines',
    'bandastation': r'c:\Space Station 13\BandaStation',
    'bandatroopers': r'c:\Space Station 13\BandaTroopers'
}

def read_file_text(path):
    with open(path, 'rb') as fp:
        raw = fp.read()
    try:
        # Check if valid UTF-8
        text = raw.decode('utf-8')
        # If it has replacement characters, try cp1251
        if '\ufffd' in text:
            try:
                return raw.decode('cp1251')
            except Exception:
                pass
        return text
    except UnicodeDecodeError:
        try:
            return raw.decode('cp1251')
        except UnicodeDecodeError:
            return raw.decode('utf-8', errors='ignore')

def clean_dm_name(raw):
    # Remove \improper, \the, and whitespace
    name = re.sub(r'\\(?:improper|the)\s*', '', raw)
    name = name.strip(' ";\'')
    if name.lower() == 'lz1':
        return 'LZ 1 (Landing Zone)'
    if name.lower() == 'lz2':
        return 'LZ 2 (Landing Zone)'
    if name == 'Main Hallway':
        return 'Nexus / Main Hall'
    return name

def build_area_dictionary(repo_dir):
    print(f"[*] Building area name dictionary from {repo_dir}...")
    area_dict = {}
    
    # Priority folders: code/game/area, code/modules, _maps, maps
    for root, dirs, files in os.walk(repo_dir):
        if '.git' in root or 'node_modules' in root:
            continue
        for f in files:
            if f.endswith('.dm'):
                full_path = os.path.join(root, f)
                try:
                    content = read_file_text(full_path)
                    if '/area/' not in content:
                        continue
                    
                    for m in re.finditer(r'(/(?:area|datum/map_template)/[\w/]+)(?:[\s\S]*?name\s*=\s*"([^"]+)")?', content):
                        area_path = m.group(1).strip()
                        raw_name = m.group(2)
                        if raw_name:
                            name = clean_dm_name(raw_name)
                            if name and not name.startswith('/'):
                                area_dict[area_path] = name
                except Exception:
                    pass
                    
    print(f"  [+] Found {len(area_dict)} area names in {os.path.basename(repo_dir)}")
    return area_dict


def find_dmm_file(repo_dir, map_file, map_path):
    if not map_file:
        return None
    candidates = []
    if map_path:
        candidates.append(os.path.join(repo_dir, map_path, map_file))
        candidates.append(os.path.join(repo_dir, 'maps', map_path, map_file))
        candidates.append(os.path.join(repo_dir, '_maps', map_path, map_file))
    candidates.append(os.path.join(repo_dir, 'maps', 'map_files', map_file))
    candidates.append(os.path.join(repo_dir, '_maps', 'map_files', map_file))
    
    for c in candidates:
        if os.path.exists(c):
            return c
            
    for root, dirs, files in os.walk(repo_dir):
        if '.git' in root or 'node_modules' in root or 'tools' in root:
            continue
        if map_file in files:
            return os.path.join(root, map_file)
            
    return None

def parse_dmm_locations(dmm_path, area_names):
    if not os.path.exists(dmm_path):
        return []

    content = read_file_text(dmm_path)


    key_defs = {}
    for m in re.finditer(r'"([a-zA-Z0-9]+)"\s*=\s*\(([\s\S]*?)\)(?=\r?\n"|\r?\n\(\d+,\s*\d+,\s*\d+\))', content):
        key = m.group(1)
        val = m.group(2)
        # Find area
        area_m = re.findall(r'(/area/[\w/]+)', val)
        if area_m:
            # Usually the last /area/ in the tuple is the effective area
            key_defs[key] = area_m[-1]


    if not key_defs:
        return []

    first_key = list(key_defs.keys())[0]
    key_len = len(first_key)

    # 2. Parse grid blocks: (x, y, z) = {"..."}
    # In DMM, blocks are usually (x_start, 1, z) = {"\n...\n"}
    # Each column in the block corresponds to x_start + col_offset
    grids = []
    for m in re.finditer(r'\((\d+),\s*(\d+),\s*(\d+)\)\s*=\s*\{"([\s\S]*?)"\}', content):
        x_start = int(m.group(1))
        y_start = int(m.group(2))
        z = int(m.group(3))
        lines = [l.strip() for l in m.group(4).strip().splitlines() if l.strip()]
        grids.append((x_start, y_start, z, lines))

    # Map tiles to (area, z) -> list of (x, y)
    area_tiles = defaultdict(list)

    for x_start, y_start, z, lines in grids:
        height = len(lines)
        for row_idx, line in enumerate(lines):
            # In SS13 DMM, row 0 is the top (y = height), row height-1 is the bottom (y = 1)
            y = height - row_idx
            # Each key in the line corresponds to x = x_start + offset
            line_keys = [line[i:i+key_len] for i in range(0, len(line), key_len)]
            for col_idx, k in enumerate(line_keys):
                x = x_start + col_idx
                area = key_defs.get(k)
                if area:
                    area_tiles[(area, z)].append((x, y))

    # 3. Process each area and compute center, bounds, category
    locations = []
    ignored_prefixes = [
        '/area/space',
        '/area/template_noop',
        '/area/mine/unexplored',
        '/area/shuttle',
        '/area/holodeck'
    ]

    for (area_path, z), pts in area_tiles.items():
        if any(area_path.startswith(ign) for ign in ignored_prefixes):
            continue
        if len(pts) < 4:
            # Ignore tiny 1-3 tile glitch zones
            continue

        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        
        # Centroid
        cx = int(round(sum(xs) / len(xs)))
        cy = int(round(sum(ys) / len(ys)))

        # Format human name
        name = area_names.get(area_path)
        if not name:
            # Fallback from path
            leaf = area_path.split('/')[-1]
            name = leaf.replace('_', ' ').title()
        
        # Remove any lingering \improper tags or artifacts
        name = clean_dm_name(name)
        
        # Categorize
        path_lower = (area_path + ' ' + name).lower()
        tile_count = len(pts)

        if any(w in path_lower for w in ['lz', 'landing zone', 'temple', 'relay', 'beacon', 'tower']):
            category = 'landmark'
        elif tile_count > 350 or any(w in path_lower for w in ['cave', 'barrens', 'jungle', 'river', 'exterior', 'compound', 'colony', 'valley', 'swamp']):
            category = 'major'
        else:
            category = 'room'

        locations.append({
            'id': area_path,
            'name': name,
            'z': z,
            'x': cx,
            'y': cy,
            'tileCount': tile_count,
            'bounds': [min_x, min_y, max_x, max_y],
            'category': category
        })

    # Sort locations: landmarks & major first, then alphabetical
    locations.sort(key=lambda l: (0 if l['category'] == 'landmark' else (1 if l['category'] == 'major' else 2), l['name']))
    return locations

def main():
    print("==================================================")
    print("=== EXTRACTING MAP LOCATIONS & AREAS (ALL MAPS) ===")
    print("==================================================")

    with open(MAPS_JSON_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # 1. Build dictionaries for each server
    server_dicts = {}
    for sKey, repo_dir in REPOS.items():
        server_dicts[sKey] = build_area_dictionary(repo_dir)

    total_locations_extracted = 0
    total_maps_processed = 0

    # 2. Extract locations for all maps
    for sKey, server_info in manifest['servers'].items():
        repo_dir = REPOS.get(sKey)
        if not repo_dir:
            continue
        area_names = server_dicts[sKey]

        print(f"\n>>> PROCESSING {sKey.upper()} ({len(server_info['maps'])} maps) <<<")

        for m in server_info['maps']:
            map_id = m['id']
            map_file = m.get('mapFile', '')
            map_path = m.get('mapPath', '')
            
            dmm_path = find_dmm_file(repo_dir, map_file, map_path)
            if not dmm_path:
                print(f"  [-] DMM not found for {map_id} ({map_file})")
                m['hasLocations'] = False
                m['locationCount'] = 0
                continue

            locations = parse_dmm_locations(dmm_path, area_names)
            m['hasLocations'] = len(locations) > 0
            m['locationCount'] = len(locations)
            total_locations_extracted += len(locations)
            total_maps_processed += 1

            # Save per-map locations JSON
            for out_base in [PUBLIC_LOCATIONS_DIR, DATA_LOCATIONS_DIR]:
                s_dir = os.path.join(out_base, sKey)
                os.makedirs(s_dir, exist_ok=True)
                loc_file = os.path.join(s_dir, f"{map_id}.json")
                with open(loc_file, 'w', encoding='utf-8') as fp:
                    json.dump(locations, fp, indent=2, ensure_ascii=False)

            sample_names = [l['name'] for l in locations[:4]]
            print(f"  [+] {map_id:30}: {len(locations):3} locations -> {sample_names}")

    # 3. Save updated maps manifest with location counts
    manifest['generatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    for manifest_path in [MAPS_JSON_PATH, DATA_MAPS_JSON]:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f"[OK] Updated manifest: {manifest_path}")

    print("\n==================================================")
    print(f"=== SUMMARY ===")
    print(f"Total Maps Processed: {total_maps_processed}")
    print(f"Total Locations Extracted: {total_locations_extracted}")
    print("==================================================")

if __name__ == '__main__':
    main()
