import os
import json
import glob

PUBLIC_MAPS = r'c:\Space Station 13\BandaWebMap\public\maps'
MAPS_JSON = r'c:\Space Station 13\BandaWebMap\public\data\maps.json'
REPOS = {
    'bandamarines': r'c:\Space Station 13\BandaMarines',
    'bandastation': r'c:\Space Station 13\BandaStation',
    'bandatroopers': r'c:\Space Station 13\BandaTroopers',
}

with open(MAPS_JSON, 'r', encoding='utf-8') as f:
    data = json.load(f)

for sKey, repo_dir in REPOS.items():
    server = data['servers'][sKey]
    s_maps_dir = os.path.join(PUBLIC_MAPS, sKey)
    print(f"\n=================== {sKey.upper()} ===================")
    
    missing_maps = []
    found_maps = []
    
    for m in server['maps']:
        map_id = m['id']
        map_file = m.get('mapFile', '')
        map_path = m.get('mapPath', '')
        z_levels = m.get('zLevels', 1)
        layers = m.get('layers', [])
        
        # Check existing webp
        existing_webp = glob.glob(os.path.join(s_maps_dir, f"{map_id}-*.webp"))
        
        # Find dmm file
        possible_dmm = []
        if map_path and map_file:
            possible_dmm.append(os.path.join(repo_dir, map_path, map_file))
            possible_dmm.append(os.path.join(repo_dir, 'maps', map_path, map_file))
            possible_dmm.append(os.path.join(repo_dir, '_maps', map_path, map_file))
        
        found_dmm = None
        for p in possible_dmm:
            if os.path.exists(p):
                found_dmm = p
                break
                
        if not found_dmm and map_file:
            # Search repo for map_file
            for root, dirs, files in os.walk(repo_dir):
                if map_file in files:
                    found_dmm = os.path.join(root, map_file)
                    break

        status = f"Webp: {len(existing_webp)}/{len(layers)} layers | DMM: {'FOUND' if found_dmm else 'NOT FOUND'}"
        if len(existing_webp) >= len(layers) and len(layers) > 0:
            found_maps.append((map_id, m['name'], status, found_dmm))
        else:
            missing_maps.append((map_id, m['name'], status, found_dmm, m))

    print(f"Server: {sKey.upper()} | Total: {len(server['maps'])} | Rendered: {len(found_maps)} | Missing: {len(missing_maps)}")
    for m_id, name, st, dmm, raw in missing_maps:
        rel_dmm = os.path.relpath(dmm, repo_dir) if dmm else "None"
        print(f"  [-] {m_id:30} ({name}): {st} -> {rel_dmm}")

