"""
Fast Multi-threaded Sync to Cloudflare R2.
Uploads all 948 PDF patterns from local disk to Cloudflare R2 bucket 'crochet'
with progress reporting and skips already uploaded files.
"""

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import storage_r2

PDF_FOLDER = r"F:\1000+ Crochet Patterns-20261011T190538Z-1-001\1000+ Crochet Patterns"

def main():
    if not storage_r2.is_r2_configured():
        print("Error: Cloudflare R2 is not fully configured.")
        return

    client = storage_r2.get_r2_client()
    bucket_name = storage_r2.R2_BUCKET_NAME

    print(f"Connecting to Cloudflare R2 bucket: '{bucket_name}'...")
    
    # 1. Fetch list of existing files in the bucket so we skip them
    existing_keys = set()
    try:
        paginator = client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket_name, Prefix="patterns/"):
            for obj in page.get("Contents", []):
                existing_keys.add(obj["Key"])
        print(f"Found {len(existing_keys)} patterns already in bucket.")
    except Exception as e:
        print(f"Could not list existing keys (proceeding): {e}")

    # 2. Get local PDF files
    if not os.path.exists(PDF_FOLDER):
        print(f"Error: Folder {PDF_FOLDER} not found on disk.")
        return

    all_files = [f for f in os.listdir(PDF_FOLDER) if f.lower().endswith(".pdf")]
    total_files = len(all_files)
    print(f"Total local patterns to sync: {total_files}")

    to_upload = [f for f in all_files if f"patterns/{f}" not in existing_keys]
    print(f"Patterns remaining to upload: {len(to_upload)} (Skipping {len(all_files) - len(to_upload)} already uploaded)")

    if not to_upload:
        print("All patterns are already synced to Cloudflare R2!")
        return

    # 3. Upload with ThreadPoolExecutor (6 parallel uploads)
    uploaded_count = 0
    failed_count = 0
    start_time = time.time()

    def upload_worker(filename):
        local_path = os.path.join(PDF_FOLDER, filename)
        r2_key = f"patterns/{filename}"
        success = storage_r2.upload_file_to_r2(local_path, r2_key)
        return filename, success

    print("\nStarting upload (6 parallel workers)...")
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(upload_worker, f): f for f in to_upload}
        for future in as_completed(futures):
            fname, ok = future.result()
            if ok:
                uploaded_count += 1
            else:
                failed_count += 1

            total_synced = len(existing_keys) + uploaded_count
            pct = (total_synced / total_files) * 100
            if uploaded_count % 10 == 0 or total_synced == total_files:
                elapsed = time.time() - start_time
                speed = (uploaded_count / elapsed) if elapsed > 0 else 0
                print(f"[{total_synced}/{total_files} | {pct:.1f}%] Synced '{fname}' ({speed:.1f} files/sec)")

    elapsed_total = time.time() - start_time
    print(f"\n==========================================")
    print(f"Sync Complete in {elapsed_total:.1f} seconds!")
    print(f"Total in Cloudflare R2: {len(existing_keys) + uploaded_count} of {total_files}")
    print(f"Failed: {failed_count}")
    print(f"==========================================")

if __name__ == "__main__":
    main()
