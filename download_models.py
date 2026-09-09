#!/usr/bin/env python3
"""
Model Checkpoint Downloader for SAM 2.1 & Grounding DINO
=========================================================
Downloads required model weights safely with size validation and atomic replace.
Runs during Render build phase or local initialization.
"""

import os
import sys
import time
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

MODELS = [
    {
        "name": "SAM 2.1 Hiera Tiny",
        "url": "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt",
        "target": BASE_DIR / "sam2.1_hiera_tiny.pt",
        "min_bytes": 100 * 1024 * 1024,  # ~148 MB
    },
    {
        "name": "Grounding DINO Swin-T",
        "url": "https://github.com/IDEA-Research/GroundingDINO/releases/download/v0.1.0-alpha/groundingdino_swint_ogc.pth",
        "target": BASE_DIR / "gdino_checkpoints" / "groundingdino_swint_ogc.pth",
        "min_bytes": 500 * 1024 * 1024,  # ~694 MB
    },
]

def download_file(url, target_path, name, min_bytes):
    target_path = Path(target_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Check if existing file is valid
    if target_path.exists():
        actual_size = target_path.stat().st_size
        if actual_size >= min_bytes:
            print(f"[+] {name} already exists and verified ({actual_size / (1024*1024):.1f} MB). Skipping download.")
            return True
        else:
            print(f"[!] {name} exists but is incomplete or corrupted ({actual_size / (1024*1024):.1f} MB < minimum {min_bytes / (1024*1024):.1f} MB). Removing and redownloading...")
            try:
                target_path.unlink()
            except Exception as e:
                print(f"[!] Could not remove incomplete file {target_path}: {e}")

    tmp_path = target_path.with_suffix(target_path.suffix + ".tmp")
    print(f"[*] Downloading {name} from {url}...")
    
    start_time = time.time()
    downloaded_bytes = 0
    
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfrastructureAgent/1.0"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp, open(tmp_path, "wb") as out_file:
            content_length = resp.headers.get("Content-Length")
            total_bytes = int(content_length) if content_length else 0
            
            chunk_size = 1024 * 1024  # 1 MB chunks for high throughput
            last_log_time = time.time()
            
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                out_file.write(chunk)
                downloaded_bytes += len(chunk)
                
                # Log progress every 5 seconds or 20 MB
                now = time.time()
                if now - last_log_time >= 5.0 or (total_bytes and downloaded_bytes == total_bytes):
                    elapsed = now - start_time
                    speed_mbs = (downloaded_bytes / (1024 * 1024)) / elapsed if elapsed > 0 else 0
                    if total_bytes:
                        pct = (downloaded_bytes / total_bytes) * 100
                        print(f"  -> {name}: {downloaded_bytes / (1024*1024):.1f} MB / {total_bytes / (1024*1024):.1f} MB ({pct:.1f}%) [{speed_mbs:.2f} MB/s]", flush=True)
                    else:
                        print(f"  -> {name}: {downloaded_bytes / (1024*1024):.1f} MB downloaded [{speed_mbs:.2f} MB/s]", flush=True)
                    last_log_time = now

        # Verify downloaded size
        final_size = tmp_path.stat().st_size
        if final_size < min_bytes:
            print(f"[!] Downloaded file {name} is smaller than expected ({final_size / (1024*1024):.1f} MB < {min_bytes / (1024*1024):.1f} MB). Aborting replacement.")
            if tmp_path.exists():
                tmp_path.unlink()
            return False

        # Atomic replace to target path
        os.replace(tmp_path, target_path)
        elapsed = time.time() - start_time
        print(f"[+] Successfully downloaded and verified {name} ({final_size / (1024*1024):.1f} MB in {elapsed:.1f}s).", flush=True)
        return True

    except Exception as e:
        print(f"[!] Error downloading {name}: {e}", flush=True)
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass
        return False

def main():
    print("=" * 70)
    print(" AI Infrastructure Agent - Model Weights Pre-fetch & Verification")
    print("=" * 70)
    
    success_count = 0
    for model in MODELS:
        ok = download_file(model["url"], model["target"], model["name"], model["min_bytes"])
        if ok:
            success_count += 1
            
    print(f"\n[+] Checkpoint download process complete: {success_count}/{len(MODELS)} models verified.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
