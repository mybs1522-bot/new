"""
Cloudflare R2 Storage Module.
Cloudflare R2 is 100% S3-compatible, offers 10 GB FREE storage forever,
and has ZERO egress/bandwidth download fees.

This module provides:
1. R2 client initialization using standard S3 API (via boto3).
2. Streaming and presigned URL generation for secure PDF delivery.
3. Bulk sync utility to upload the 1.41 GB of 948 PDF books to your R2 bucket.
"""

import os
import sys
from typing import Optional, Dict, Any
import boto3
from botocore.config import Config

# Load .env file automatically if present
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(ENV_FILE):
    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip()
                    if k and not os.environ.get(k):
                        os.environ[k] = v
    except Exception as e:
        print("Error reading .env:", e)

# Configuration from environment
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "crochet")
R2_CUSTOM_DOMAIN = os.getenv("R2_CUSTOM_DOMAIN", "")

def is_r2_configured() -> bool:
    """Checks if Cloudflare R2 credentials are set up."""
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME)

def get_r2_client():
    """Returns a boto3 S3 client configured for Cloudflare R2."""
    if not is_r2_configured():
        return None
    
    endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    return boto3.client(
        service_name="s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4")
    )

def upload_file_to_r2(local_file_path: str, r2_key: str) -> bool:
    """Uploads a single local PDF or image file to Cloudflare R2."""
    client = get_r2_client()
    if not client:
        return False
    
    try:
        content_type = "application/pdf" if local_file_path.lower().endswith(".pdf") else "image/jpeg"
        client.upload_file(
            local_file_path,
            R2_BUCKET_NAME,
            r2_key,
            ExtraArgs={"ContentType": content_type}
        )
        return True
    except Exception as e:
        print(f"Error uploading {local_file_path} to R2: {e}")
        return False

def generate_presigned_download_url(r2_key: str, expires_in: int = 3600) -> Optional[str]:
    """Generates a secure, expiring presigned URL for customers who purchased/unlocked."""
    client = get_r2_client()
    if not client:
        return None
    
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": R2_BUCKET_NAME, "Key": r2_key},
            ExpiresIn=expires_in
        )
        return url
    except Exception as e:
        print(f"Error generating presigned URL for {r2_key}: {e}")
        return None

def sync_local_folder_to_r2(folder_path: str, progress_callback=None) -> Dict[str, Any]:
    """
    Uploads all 948 PDF patterns from local disk to Cloudflare R2.
    Safe and incremental: will skip files already uploaded.
    """
    client = get_r2_client()
    if not client:
        return {"status": "error", "message": "Cloudflare R2 is not configured."}
    
    if not os.path.exists(folder_path):
        return {"status": "error", "message": f"Folder {folder_path} not found."}
    
    # List existing objects in bucket to avoid re-uploading
    existing_keys = set()
    try:
        paginator = client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=R2_BUCKET_NAME):
            if "Contents" in page:
                for obj in page["Contents"]:
                    existing_keys.add(obj["Key"])
    except Exception as e:
        print(f"Notice: Could not list existing objects (bucket might be empty): {e}")

    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".pdf")]
    total = len(files)
    uploaded = 0
    skipped = 0

    print(f"Starting sync of {total} PDFs to Cloudflare R2 bucket '{R2_BUCKET_NAME}'...")

    for idx, fname in enumerate(files, 1):
        fpath = os.path.join(folder_path, fname)
        r2_key = f"patterns/{fname}"

        if r2_key in existing_keys:
            skipped += 1
            continue

        success = upload_file_to_r2(fpath, r2_key)
        if success:
            uploaded += 1
            if progress_callback:
                progress_callback(idx, total, fname)
            elif idx % 25 == 0 or idx == total:
                print(f"[{idx}/{total}] Uploaded: {fname}")

    return {
        "status": "success",
        "total_files": total,
        "newly_uploaded": uploaded,
        "already_synced": skipped,
        "bucket": R2_BUCKET_NAME
    }

def download_file_from_r2(r2_key: str, dest_path: str) -> bool:
    """Downloads a file from Cloudflare R2 to local destination path."""
    client = get_r2_client()
    if not client:
        return False
    try:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        client.download_file(R2_BUCKET_NAME, r2_key, dest_path)
        return True
    except Exception as e:
        print(f"Error downloading {r2_key} from R2: {e}")
        return False

def list_patterns_from_r2() -> list:
    """Lists all patterns stored in the Cloudflare R2 bucket."""
    client = get_r2_client()
    if not client:
        return []
    items = []
    try:
        paginator = client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=R2_BUCKET_NAME, Prefix="patterns/"):
            if "Contents" in page:
                for obj in page["Contents"]:
                    key = obj["Key"]
                    fname = key.replace("patterns/", "")
                    if fname and fname.lower().endswith(".pdf"):
                        items.append({
                            "filename": fname,
                            "size": obj.get("Size", 0),
                            "key": key
                        })
    except Exception as e:
        print(f"Error listing patterns from R2: {e}")
    return items


if __name__ == "__main__":
    if not is_r2_configured():
        print("Cloudflare R2 is not configured yet.")
        print("To configure, set:")
        print("  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME")
    else:
        print("Cloudflare R2 credentials detected! Client is ready.")
