import os
import sys
import json
import glob
import time
import re
import subprocess
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

DMM_TOOLS = r'c:\Space Station 13\dmm-tools.exe'
PUBLIC_DIR = r'c:\Space Station 13\BandaWebMap\public\maps'
TMP_RENDER = r'c:\Space Station 13\render_tmp'
MAPS_JSON_FILES = [
    r'c:\Space Station 13\BandaWebMap\data\maps.json',
    r'c:\Space Station 13\BandaWebMap\public\data\maps.json'
]

SERVERS = {
    'bandamarines': {
        'repo_dir': r'c:\Space Station 13\BandaMarines',
        'env_file': 'colonialmarines.dme'
    },
    'bandastation': {
        'repo_dir': r'c:\Space Station 13\BandaStation',
        'env_file': 'tgstation.dme'
    },
    'bandatroopers': {
        'repo_dir': r'c:\Space Station 13\BandaTroopers',
        'env_file': 'colonialmarines.dme'
    }
}

os.makedirs(TMP_RENDER, exist_ok=True)

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
            return os.path.relpath(c, repo_dir)
            
    # Recursive search as fallback
    for root, dirs, files in os.walk(repo_dir):
        if '.git' in root or 'node_modules' in root or 'tools' in root:
            continue
        if map_file in files:
            full = os.path.join(root, map_file)
            return os.path.relpath(full, repo_dir)
            
    return None

def clean_tmp():
    for f in glob.glob(os.path.join(TMP_RENDER, '*')):
        try:
            os.remove(f)
        except Exception:
            pass

def render_all(force=False):
    with open(MAPS_JSON_FILES[1], 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    total_rendered = 0
    total_skipped = 0
    total_failed = 0
    start_time = time.time()

    print("==================================================")
    print("=== BATCH RENDERING MAPS TO WEBP FOR BANDAWEBMAP ===")
    print("==================================================")

    for sKey, sConf in SERVERS.items():
        server_dir = sConf['repo_dir']
        env_file = sConf['env_file']
        out_dir = os.path.join(PUBLIC_DIR, sKey)
        os.makedirs(out_dir, exist_ok=True)

        server_info = manifest['servers'].get(sKey)
        if not server_info:
            continue

        maps = server_info['maps']
        print(f"\n>>> PROCESSING SERVER: {sKey.upper()} ({len(maps)} maps) <<<")

        for idx, m in enumerate(maps, 1):
            map_id = m['id']
            map_name = m['name']
            map_file = m.get('mapFile', '')
            map_path = m.get('mapPath', '')
            layers = m.get('layers', [])
            expected_layers = len(layers) if layers else m.get('zLevels', 1)

            # Check existing webp
            existing_webps = [
                os.path.join(out_dir, f"{map_id}-{l['z']}.webp")
                for l in layers
            ]
            all_exist = len(existing_webps) > 0 and all(
                os.path.exists(p) and os.path.getsize(p) > 0 for p in existing_webps
            )

            if all_exist and not force:
                print(f"[{idx}/{len(maps)}] [SKIP] {map_id} ({map_name}) - all {len(existing_webps)} layer(s) exist")
                total_skipped += 1
                continue

            rel_dmm = find_dmm_file(server_dir, map_file, map_path)
            if not rel_dmm:
                print(f"[{idx}/{len(maps)}] [ERROR] DMM file not found for {map_id}: {map_file}")
                total_failed += 1
                continue

            print(f"[{idx}/{len(maps)}] [*] Rendering {map_id} ({map_name}) from {rel_dmm}...")
            clean_tmp()

            cmd = [
                DMM_TOOLS,
                '--jobs', '0',
                '-e', env_file,
                'minimap',
                '-o', TMP_RENDER,
                rel_dmm
            ]

            t_render_0 = time.time()
            res = subprocess.run(
                cmd,
                cwd=server_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            t_render_1 = time.time()

            if res.returncode != 0:
                print(f"  [-] dmm-tools failed with code {res.returncode}")
                if res.stderr:
                    print(f"      Stderr tail: {res.stderr[-300:]}")
                total_failed += 1
                continue

            png_files = glob.glob(os.path.join(TMP_RENDER, '*.png'))
            if not png_files:
                print(f"  [-] No PNG files generated for {map_id}!")
                total_failed += 1
                continue

            # Sort png files by z level if possible
            png_files.sort()
            saved_count = 0

            for png in png_files:
                base = os.path.basename(png)
                z = '1'
                m_z = re.search(r'-(\d+)\.png$', base)
                if m_z:
                    z = m_z.group(1)
                
                dest_webp = os.path.join(out_dir, f"{map_id}-{z}.webp")
                try:
                    with Image.open(png) as im:
                        max_dim = max(im.size)
                        if max_dim > 16383:
                            scale = 16380.0 / max_dim
                            new_w = int(im.size[0] * scale)
                            new_h = int(im.size[1] * scale)
                            print(f"  [i] Resizing {base} from {im.size[0]}x{im.size[1]} to {new_w}x{new_h} (WebP <= 16383px limit)...")
                            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
                        im.save(dest_webp, 'WEBP', quality=80, method=2)
                    sz_mb = os.path.getsize(dest_webp) / (1024 * 1024)
                    print(f"  [+] Saved {map_id}-{z}.webp ({sz_mb:.2f} MB, {im.size[0]}x{im.size[1]}px) in {t_render_1 - t_render_0:.1f}s")
                    saved_count += 1
                except Exception as e:
                    print(f"  [-] Error converting {base} to WebP: {e}")

            clean_tmp()
            total_rendered += 1

    # Now update maps.json and public/maps.json
    print("\n==================================================")
    print("=== LINKING LOCAL WEBP RENDERS TO MAPS MANIFEST ===")
    print("==================================================")
    
    updated_layers = 0
    for sKey in manifest['servers']:
        server_dir = os.path.join(PUBLIC_DIR, sKey)
        server = manifest['servers'][sKey]
        for m in server['maps']:
            for layer in m.get('layers', []):
                z = layer['z']
                webp_file = f"{m['id']}-{z}.webp"
                webp_path = os.path.join(server_dir, webp_file)
                if os.path.exists(webp_path) and os.path.getsize(webp_path) > 0:
                    layer['fullUrl'] = f"maps/{sKey}/{webp_file}"
                    updated_layers += 1


    manifest['generatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

    for dest in MAPS_JSON_FILES:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f"[OK] Updated manifest: {dest}")

    elapsed = time.time() - start_time
    print(f"\n==================================================")
    print(f"=== FINISHED IN {elapsed:.1f}s ===")
    print(f"=== Total Maps Rendered: {total_rendered} ===")
    print(f"=== Total Maps Skipped:  {total_skipped} ===")
    print(f"=== Total Maps Failed:   {total_failed} ===")
    print(f"=== Total Layers Linked: {updated_layers} ===")
    print("==================================================")

if __name__ == '__main__':
    force_mode = '--force' in sys.argv
    render_all(force=force_mode)
