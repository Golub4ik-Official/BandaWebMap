import os
import subprocess
import glob
from PIL import Image

DMM_TOOLS = r'c:\Space Station 13\dmm-tools.exe'
PUBLIC_DIR = r'c:\Space Station 13\BandaWebMap\public\maps'
TMP_RENDER = r'c:\Space Station 13\render_tmp'
os.makedirs(TMP_RENDER, exist_ok=True)

def render_and_convert(server_name, env_file, server_dir, map_list):
    out_dir = os.path.join(PUBLIC_DIR, server_name)
    os.makedirs(out_dir, exist_ok=True)
    print(f"\n========================================")
    print(f"=== RENDERING {server_name.upper()} ===")
    print(f"========================================")
    
    for map_id, dmm_rel, prefix in map_list:
        full_dmm = os.path.join(server_dir, dmm_rel)
        if not os.path.exists(full_dmm):
            print(f"[-] Missing file: {full_dmm}")
            continue
        
        existing = glob.glob(os.path.join(out_dir, f"{map_id}-*.webp"))
        if len(existing) > 0:
            print(f"[OK] Already rendered: {map_id} ({len(existing)} layers)")
            continue

        print(f"[*] Rendering {map_id} ({prefix}) from {dmm_rel}...")
        cmd = [DMM_TOOLS, '-e', env_file, 'minimap', '-o', TMP_RENDER, dmm_rel]
        subprocess.run(cmd, cwd=server_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        rendered_pngs = glob.glob(os.path.join(TMP_RENDER, f"{prefix}-*.png"))
        if not rendered_pngs:
            rendered_pngs = glob.glob(os.path.join(TMP_RENDER, "*.png"))

        for png in rendered_pngs:
            base = os.path.basename(png)
            z = '1'
            if '-' in base:
                z = base.split('-')[-1].replace('.png', '')
            
            dest_webp = os.path.join(out_dir, f"{map_id}-{z}.webp")
            print(f"  -> Compressing {base} to WebP...")
            im = Image.open(png)
            im.save(dest_webp, 'WEBP', quality=80, method=2)
            sz_mb = os.path.getsize(dest_webp) / (1024 * 1024)
            print(f"  [+] Saved {map_id}-{z}.webp ({sz_mb:.2f} MB)")
            os.remove(png)

# 1. BandaMarines Maps
bm_dir = r'c:\Space Station 13\BandaMarines'
bm_maps = [
    ('almayer', r'maps\map_files\USS_Almayer\USS_Almayer.dmm', 'USS_Almayer'),
    ('bigredv2', r'maps\map_files\BigRed\BigRed.dmm', 'BigRed'),
    ('desert_dam', r'maps\map_files\DesertDam\Desert_Dam.dmm', 'Desert_Dam'),
    ('lv624', r'maps\map_files\LV624\LV624.dmm', 'LV624'),
    ('kutjevo', r'maps\map_files\Kutjevo\Kutjevo.dmm', 'Kutjevo'),
    ('sorokyne_strata', r'maps\map_files\Sorokyne_Strata\Sorokyne_Strata.dmm', 'Sorokyne_Strata'),
    ('fiorina_sciannex', r'maps\map_files\FOP_v3_Sciannex\Fiorina_SciAnnex.dmm', 'Fiorina_SciAnnex'),
    ('corsat', r'maps\map_files\CORSAT\Corsat.dmm', 'Corsat'),
    ('whiskey_outpost_v2', r'maps\map_files\Whiskey_Outpost_v2\Whiskey_Outpost_v2.dmm', 'Whiskey_Outpost_v2'),
]

# 2. BandaStation Maps
bs_dir = r'c:\Space Station 13\BandaStation'
bs_maps = [
    ('cyberiad', r'_maps\map_files\Cyberiad\Cyberiad.dmm', 'Cyberiad'),
    ('deltastation', r'_maps\map_files\Deltastation\DeltaStation2.dmm', 'DeltaStation2'),
    ('metastation', r'_maps\map_files\MetaStation\MetaStation.dmm', 'MetaStation'),
    ('icebox', r'_maps\map_files\IceBoxStation\IceBoxStation.dmm', 'IceBoxStation'),
    ('kilostation', r'_maps\map_files\KiloStation\KiloStation.dmm', 'KiloStation'),
    ('tramstation', r'_maps\map_files\tramstation\tramstation.dmm', 'tramstation'),
    ('nebulastation', r'_maps\map_files\NebulaStation\NebulaStation.dmm', 'NebulaStation'),
    ('wawastation', r'_maps\map_files\wawastation\wawastation.dmm', 'wawastation'),
]

# 3. BandaTroopers Maps
bt_dir = r'c:\Space Station 13\BandaTroopers'
bt_maps = [
    ('almayer', r'maps\map_files\USS_Almayer\USS_Almayer.dmm', 'USS_Almayer'),
    ('bigredv2', r'maps\map_files\BigRed\BigRed.dmm', 'BigRed'),
    ('desert_dam', r'maps\map_files\DesertDam\Desert_Dam.dmm', 'Desert_Dam'),
    ('lv624', r'maps\map_files\LV624\LV624.dmm', 'LV624'),
    ('corsat', r'maps\map_files\CORSAT\Corsat.dmm', 'Corsat'),
]

render_and_convert('bandamarines', 'colonialmarines.dme', bm_dir, bm_maps)
render_and_convert('bandastation', 'tgstation.dme', bs_dir, bs_maps)
render_and_convert('bandatroopers', 'colonialmarines.dme', bt_dir, bt_maps)
print("\n=== ALL SERVERS BATCH RENDER COMPLETE ===")
