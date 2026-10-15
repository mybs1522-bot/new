import hashlib
import io
import json
import os
import re
import uuid
from typing import Dict, Any, Optional, List

import pymupdf  # PyMuPDF
from PIL import Image, ImageFilter
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Digital Library & Paywall Reader")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
if IS_SERVERLESS:
    CACHE_DIR = "/tmp/cache"
else:
    CACHE_DIR = os.path.join(BASE_DIR, "cache")

THUMBNAILS_DIR = os.path.join(CACHE_DIR, "thumbnails")

try:
    os.makedirs(STATIC_DIR, exist_ok=True)
except OSError:
    pass

try:
    os.makedirs(THUMBNAILS_DIR, exist_ok=True)
except OSError:
    THUMBNAILS_DIR = "/tmp/cache/thumbnails"
    os.makedirs(THUMBNAILS_DIR, exist_ok=True)


# Default path provided by user
DEFAULT_FOLDER = r"F:\1000+ Crochet Patterns-20261011T190538Z-1-001\1000+ Crochet Patterns"

import database
import storage_r2
import payments_stripe

# Initialize SQLite database
database.init_db()

# Catalog state
CATALOG: Dict[str, Dict[str, Any]] = {}
GLOBAL_UNLOCKED = False
CURRENT_FOLDER = DEFAULT_FOLDER

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Robbin#00xx")

class AuthSignupRequest(BaseModel):
    email: str
    password: str

class AuthLoginRequest(BaseModel):
    email: str
    password: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

def get_current_user_from_token(token_str: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token_str:
        return None
    token = token_str.replace("Bearer ", "").strip()
    return database.get_user_by_session(token)

# In-memory uploaded documents (for ad-hoc uploads)
UPLOADED_DOCS: Dict[str, Dict[str, Any]] = {}

class UnlockRequest(BaseModel):
    code: Optional[str] = "DEMO"
    plan: Optional[str] = "all-access"

class CreateCheckoutRequest(BaseModel):
    email: Optional[str] = None
    return_url: Optional[str] = None

class ScanFolderRequest(BaseModel):
    folder_path: str

def clean_title(filename: str) -> str:
    """Extracts a clean, human-readable product name from filename."""
    name = filename
    if name.lower().endswith(".pdf"):
        name = name[:-4]
    # Clean up underscores and duplicate spaces
    name = re.sub(r'[_]+', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def scan_directory(folder_path: str = DEFAULT_FOLDER):
    """Scans the local folder or falls back to Cloudflare R2 bucket for cloud deployments."""
    global CATALOG, CURRENT_FOLDER
    
    # 1. If local folder exists on disk, scan local PDFs
    if folder_path and os.path.exists(folder_path):
        CURRENT_FOLDER = folder_path
        CATALOG.clear()
        try:
            entries = os.listdir(folder_path)
            pdf_files = [f for f in entries if f.lower().endswith(".pdf")]
            pdf_files.sort(key=lambda s: [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)])

            for fname in pdf_files:
                full_path = os.path.join(folder_path, fname)
                book_id = hashlib.md5(fname.encode('utf-8')).hexdigest()[:12]
                title = clean_title(fname)
                try:
                    file_size = os.path.getsize(full_path)
                except OSError:
                    file_size = 0

                CATALOG[book_id] = {
                    "id": book_id,
                    "filename": fname,
                    "title": title,
                    "filepath": full_path,
                    "file_size": file_size,
                    "page_count": None,
                    "unlocked": False,
                    "is_uploaded": False
                }
            print(f"Catalog loaded from local disk: {len(CATALOG)} books from {folder_path}")
            return len(CATALOG)
        except Exception as e:
            print(f"Error scanning local folder {folder_path}: {e}")

    # 2. Cloud Fallback: If deployed to cloud where local F: drive is absent, load directly from Cloudflare R2!
    if storage_r2.is_r2_configured():
        try:
            print("Local folder not found. Loading catalog directly from Cloudflare R2 storage bucket...")
            CURRENT_FOLDER = "Cloudflare R2 Bucket (crochet)"
            CATALOG.clear()
            r2_patterns = storage_r2.list_patterns_from_r2()
            r2_patterns.sort(key=lambda p: [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', p["filename"])])

            for p in r2_patterns:
                fname = p["filename"]
                book_id = hashlib.md5(fname.encode('utf-8')).hexdigest()[:12]
                title = clean_title(fname)
                CATALOG[book_id] = {
                    "id": book_id,
                    "filename": fname,
                    "title": title,
                    "filepath": None,
                    "file_size": p.get("size", 0),
                    "page_count": None,
                    "unlocked": False,
                    "is_uploaded": False
                }
            print(f"Catalog loaded from Cloudflare R2: {len(CATALOG)} books.")
            return len(CATALOG)
        except Exception as e:
            print(f"Error loading catalog from Cloudflare R2 on startup: {e}")
            return 0

    return 0

def get_pdf_document(book: Dict[str, Any]) -> pymupdf.Document:
    """
    Safely opens a PDF document for rendering covers, previews, or page counts.
    Supports:
    1. Direct local file on disk
    2. Local cached PDF in cache/patterns/
    3. Automatic on-demand download from Cloudflare R2 if deployed to cloud!
    """
    # 1. Local path if file exists
    if book.get("filepath") and os.path.exists(book["filepath"]):
        return pymupdf.open(book["filepath"])

    # 2. Cached in cache/patterns/
    patterns_cache_dir = os.path.join(CACHE_DIR, "patterns")
    os.makedirs(patterns_cache_dir, exist_ok=True)
    cached_file = os.path.join(patterns_cache_dir, book["filename"])
    if os.path.exists(cached_file) and os.path.getsize(cached_file) > 0:
        return pymupdf.open(cached_file)

    # 3. Download from Cloudflare R2 on demand
    if storage_r2.is_r2_configured():
        r2_key = f"patterns/{book['filename']}"
        success = storage_r2.download_file_from_r2(r2_key, cached_file)
        if success and os.path.exists(cached_file):
            return pymupdf.open(cached_file)

    raise HTTPException(status_code=404, detail=f"Pattern PDF '{book['title']}' could not be located on disk or Cloudflare R2.")

# Initial scan on startup
scan_directory(DEFAULT_FOLDER)


@app.get("/api/catalog")
async def get_catalog(
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    search: Optional[str] = None,
    sort: Optional[str] = "featured",
    starred_only: bool = False,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    """Returns paginated catalog with starred books showing on the first pages from SQLite."""
    starred_ids = database.get_starred_book_ids()
    active_token = token or (authorization.replace("Bearer ", "").strip() if authorization else None)
    user = database.get_user_by_session(active_token) if active_token else None
    user_unlocked = GLOBAL_UNLOCKED or (user is not None and user.get("has_unlocked_all", False))

    books = list(CATALOG.values())

    if search and search.strip():
        q = search.strip().lower()
        books = [b for b in books if q in b["title"].lower() or q in b["filename"].lower()]

    if starred_only:
        books = [b for b in books if b["id"] in starred_ids]

    # Starred best books come first so they always show on the first few pages!
    starred_list = [b for b in books if b["id"] in starred_ids]
    unstarred_list = [b for b in books if b["id"] not in starred_ids]

    if sort == "name":
        starred_list.sort(key=lambda b: b["title"].lower())
        unstarred_list.sort(key=lambda b: b["title"].lower())
    elif sort == "size":
        starred_list.sort(key=lambda b: b["file_size"], reverse=True)
        unstarred_list.sort(key=lambda b: b["file_size"], reverse=True)

    books = starred_list + unstarred_list

    total_count = len(books)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated = books[start_idx:end_idx]

    items = []
    for b in paginated:
        items.append({
            "id": b["id"],
            "title": b["title"],
            "filename": b["filename"],
            "file_size": b["file_size"],
            "page_count": b["page_count"],
            "is_starred": b["id"] in starred_ids,
            "unlocked": user_unlocked or b["unlocked"],
            "cover_url": f"/api/catalog/{b['id']}/cover"
        })

    return {
        "folder": CURRENT_FOLDER,
        "total_books": total_count,
        "total_starred": len(starred_ids),
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        "global_unlocked": user_unlocked,
        "books": items
    }

# ----------------- User Authentication Endpoints -----------------

@app.post("/api/auth/signup")
async def auth_signup(req: AuthSignupRequest):
    """Customer registration endpoint stored in SQLite."""
    try:
        user = database.create_user(req.email, req.password, role="customer")
        token = database.create_session(user["id"])
        return {
            "status": "success",
            "token": token,
            "user": user,
            "message": "Account created successfully."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
async def auth_login(req: AuthLoginRequest):
    """Customer / Admin login endpoint verified against SQLite."""
    user = database.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = database.create_session(user["id"])
    return {
        "status": "success",
        "token": token,
        "user": user,
        "message": f"Welcome back, {user['email']}!"
    }

@app.get("/api/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    """Returns the current authenticated user's profile and purchase status."""
    user = get_current_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return {"status": "success", "user": user}

@app.post("/api/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    """Logs out and invalidates the session token in SQLite."""
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        database.delete_session(token)
    return {"status": "success", "message": "Logged out successfully."}

# ----------------- Admin Endpoints -----------------

@app.post("/api/admin/login")
async def admin_login(req: AdminLoginRequest):
    """Admin login endpoint verified against SQLite (admin / Robbin#00xx)."""
    user = database.authenticate_user(req.username, req.password)
    if user and user["role"] == "admin":
        token = database.create_session(user["id"])
        return {
            "status": "success",
            "token": token,
            "message": "Admin authenticated successfully."
        }
    raise HTTPException(status_code=401, detail="Invalid admin credentials.")

@app.post("/api/admin/books/{book_id}/toggle-star")
async def admin_toggle_star(book_id: str):
    """Stars/unstars a book in SQLite so it shows up on the first few pages."""
    if book_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Book not found.")
    
    is_starred = database.toggle_starred_book(book_id)
    starred_count = len(database.get_starred_book_ids())
    return {
        "status": "success",
        "book_id": book_id,
        "title": CATALOG[book_id]["title"],
        "is_starred": is_starred,
        "total_starred": starred_count
    }

@app.get("/api/admin/users")
async def admin_get_users():
    """Returns list of all registered users and their access status from SQLite."""
    users = database.get_all_users()
    return {"status": "success", "total_users": len(users), "users": users}

@app.post("/api/admin/users/{user_id}/toggle-unlock")
async def admin_toggle_user_unlock(user_id: int):
    """Admin toggles full catalog access for a user."""
    try:
        new_status = database.toggle_user_unlock(user_id)
        return {
            "status": "success",
            "user_id": user_id,
            "has_unlocked_all": new_status,
            "message": f"User access {'granted' if new_status else 'revoked'}."
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: int):
    """Admin deletes a customer user."""
    try:
        success = database.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"status": "success", "message": "User deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/admin")
async def serve_admin_page():
    """Serves the Admin Portal UI with anti-caching headers so updates show immediately."""
    admin_html = os.path.join(STATIC_DIR, "admin.html")
    if os.path.exists(admin_html):
        return FileResponse(
            admin_html,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.post("/api/catalog/scan")
async def rescan_folder(req: ScanFolderRequest):
    """Rescans a directory on disk."""
    if not os.path.exists(req.folder_path):
        raise HTTPException(status_code=400, detail="Folder path does not exist on disk.")
    count = scan_directory(req.folder_path)
    return {"status": "success", "folder": req.folder_path, "total_books": count}

@app.get("/api/catalog/{book_id}/cover")
async def get_book_cover(book_id: str):
    """Returns the cached or newly generated cover thumbnail (Page 1) for a book."""
    if book_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Book not found.")

    thumb_path = os.path.join(THUMBNAILS_DIR, f"{book_id}.jpg")
    if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
        return FileResponse(thumb_path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})

    book = CATALOG[book_id]
    try:
        doc = get_pdf_document(book)
        if len(doc) == 0:
            doc.close()
            raise HTTPException(status_code=400, detail="PDF has no pages.")
        
        # Cache page count if not already cached
        book["page_count"] = len(doc)

        page = doc[0]
        # Render at 96 DPI for crisp, lightweight cover
        pix = page.get_pixmap(dpi=96)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()

        # Save to thumbnail cache
        img.save(thumb_path, format="JPEG", quality=82, optimize=True)
        return FileResponse(thumb_path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate cover: {str(e)}")

@app.get("/api/catalog/{book_id}")
async def get_book_details(
    book_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """Returns detailed information and page list for a selected book."""
    if book_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Book not found.")

    book = CATALOG[book_id]
    
    # Load page count if not already loaded
    if book["page_count"] is None:
        try:
            doc = get_pdf_document(book)
            book["page_count"] = len(doc)
            doc.close()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to open PDF: {str(e)}")


    active_token = token or (authorization.replace("Bearer ", "").strip() if authorization else None)
    user = database.get_user_by_session(active_token) if active_token else None

    # Require customer to sign up / log in before viewing previews
    if not user and not GLOBAL_UNLOCKED:
        raise HTTPException(
            status_code=401,
            detail="Please create a free account or sign in to view pattern previews."
        )

    user_unlocked = GLOBAL_UNLOCKED or (user is not None and user.get("has_unlocked_all", False))
    is_unlocked = user_unlocked or book["unlocked"]
    page_count = book["page_count"] or 0
    pages = []
    for i in range(page_count):
        is_blurred = (i >= 2) and (not is_unlocked)
        pages.append({
            "page_num": i + 1,
            "is_blurred": is_blurred,
            "preview_allowed": (i < 2) or is_unlocked,
            "image_url": f"/api/catalog/{book_id}/page/{i + 1}"
        })

    return {
        "id": book_id,
        "title": book["title"],
        "filename": book["filename"],
        "file_size": book["file_size"],
        "page_count": page_count,
        "preview_pages": 2,
        "unlocked": is_unlocked,
        "global_unlocked": user_unlocked,
        "pages": pages
    }

@app.get("/api/catalog/{book_id}/page/{page_num}")
async def get_book_page(
    book_id: str,
    page_num: int,
    dpi: int = 144,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """
    Renders and streams a specific page image.
    If page_num > 2 and book is not unlocked:
    Irreversibly applies Gaussian blur on the server before transmitting.
    """
    if book_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Book not found.")

    book = CATALOG[book_id]
    active_token = token or (authorization.replace("Bearer ", "").strip() if authorization else None)
    user = database.get_user_by_session(active_token) if active_token else None

    # Require customer to sign up / log in before viewing preview pages
    if not user and not GLOBAL_UNLOCKED:
        raise HTTPException(
            status_code=401,
            detail="Please create a free account or sign in to view pattern previews."
        )

    user_unlocked = GLOBAL_UNLOCKED or (user is not None and user.get("has_unlocked_all", False))
    is_unlocked = user_unlocked or book["unlocked"]


    try:
        doc = get_pdf_document(book)
        total_pages = len(doc)
        book["page_count"] = total_pages

        if page_num < 1 or page_num > total_pages:
            doc.close()
            raise HTTPException(status_code=400, detail="Page number out of range.")

        page = doc[page_num - 1]
        pix = page.get_pixmap(dpi=dpi)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Page rendering error: {str(e)}")

    # Check paywall condition
    should_blur = (page_num > 2) and (not is_unlocked)
    if should_blur:
        # Genuine server-side irreversible Gaussian Blur (radius 18)
        img = img.filter(ImageFilter.GaussianBlur(radius=18))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/jpeg")

@app.post("/api/catalog/unlock-all")
async def unlock_all_books(
    req: UnlockRequest,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    """Unlocks all books across the entire library and records in SQLite if user is authenticated."""
    global GLOBAL_UNLOCKED
    active_token = token or (authorization.replace("Bearer ", "").strip() if authorization else None)
    user = database.get_user_by_session(active_token) if active_token else None

    if user:
        database.record_order(user["id"], f"ORDER-{uuid.uuid4().hex[:8].upper()}", 39.00)
    else:
        GLOBAL_UNLOCKED = True

    return {
        "status": "success",
        "message": f"Successfully unlocked all {len(CATALOG)} books in the library!",
        "global_unlocked": True,
        "user_unlocked": True if user else False
    }

@app.post("/api/catalog/{book_id}/unlock")
async def unlock_single_book(book_id: str, req: UnlockRequest):
    """Unlocks a single book."""
    if book_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Book not found.")

    CATALOG[book_id]["unlocked"] = True
    return {
        "status": "success",
        "message": f"Successfully unlocked '{CATALOG[book_id]['title']}'!",
        "unlocked": True
    }

@app.post("/api/catalog/lock-all")
async def lock_all_books():
    """Re-locks all books to test the paywall again."""
    global GLOBAL_UNLOCKED
    GLOBAL_UNLOCKED = False
    for b in CATALOG.values():
        b["unlocked"] = False
    return {"status": "success", "message": "All books re-locked.", "global_unlocked": False}

# ----------------- Stripe Payment Endpoints ($39 Lifetime All-Access) -----------------

@app.get("/api/payments/config")
async def get_payment_config():
    """Returns Stripe publishable key and pricing info for client."""
    return {
        "configured": payments_stripe.is_stripe_configured(),
        "publishable_key": payments_stripe.STRIPE_PUBLISHABLE_KEY,
        "price_usd": payments_stripe.STRIPE_PRICE_USD,
        "product_name": "Crochet Master Library — Lifetime All-Access (1,000+ Patterns)"
    }

@app.post("/api/payments/create-checkout-session")
async def create_stripe_checkout(
    req: CreateCheckoutRequest,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    """Creates a Stripe Checkout Session for $39 lifetime unlock."""
    if not payments_stripe.is_stripe_configured():
        raise HTTPException(status_code=500, detail="Stripe payments are not configured.")

    active_token = token or (authorization.replace("Bearer ", "").strip() if authorization else None)
    user = database.get_user_by_session(active_token) if active_token else None

    user_email = user["email"] if user else (req.email.strip().lower() if req.email else None)
    user_id = user["id"] if user else None

    # Base URL detection
    base_url = req.return_url or "http://localhost:8000"
    if base_url.endswith("/"):
        base_url = base_url[:-1]

    success_url = f"{base_url}/?session_id={{CHECKOUT_SESSION_ID}}&success=true"
    cancel_url = f"{base_url}/?canceled=true"

    try:
        session_data = payments_stripe.create_checkout_session(
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user_email,
            user_id=user_id
        )
        return {
            "status": "success",
            "checkout_url": session_data["checkout_url"],
            "session_id": session_data["session_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@app.get("/api/payments/verify-session")
async def verify_stripe_session(session_id: str = Query(...)):
    """Verifies completed Stripe checkout session, records order, and grants instant lifetime access."""
    if not payments_stripe.is_stripe_configured():
        raise HTTPException(status_code=500, detail="Stripe payments are not configured.")

    try:
        result = payments_stripe.verify_checkout_session(session_id)
        if not result["paid"]:
            return {
                "status": "unpaid",
                "paid": False,
                "message": "Payment has not been completed."
            }

        # Resolve or create customer user
        user = None
        if result.get("user_id"):
            user = database.get_user_by_id(result["user_id"])
        
        if not user and result.get("customer_email"):
            user = database.get_or_create_user_by_email(result["customer_email"])

        if user:
            order_ref = f"STRIPE-{session_id[-8:].upper()}"
            database.record_order(user["id"], order_ref, result["amount_total"])
            token = database.create_session(user["id"])
            return {
                "status": "success",
                "paid": True,
                "token": token,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "has_unlocked_all": True
                },
                "message": "Payment verified! Full library unlocked with lifetime access."
            }
        else:
            global GLOBAL_UNLOCKED
            GLOBAL_UNLOCKED = True
            return {
                "status": "success",
                "paid": True,
                "global_unlocked": True,
                "message": "Payment verified! Library unlocked."
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification error: {str(e)}")


@app.get("/api/catalog/{book_id}/download")
async def download_book_pdf(
    book_id: str,
    mode: str = Query("preview", pattern="^(preview|full)$"),
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """
    Downloads:
    - mode=preview: generates a blurred preview PDF with pages 3+ permanently blurred.
    - mode=full: original PDF (only if unlocked).
    """
    if book_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Book not found.")

    book = CATALOG[book_id]
    active_token = token or (authorization.replace("Bearer ", "").strip() if authorization else None)
    user = database.get_user_by_session(active_token) if active_token else None
    user_unlocked = GLOBAL_UNLOCKED or (user is not None and user.get("has_unlocked_all", False))
    is_unlocked = user_unlocked or book["unlocked"]

    if mode == "full":
        if not is_unlocked:
            raise HTTPException(status_code=403, detail="Pattern is locked. Unlock all books to download full edition.")
        
        # Serve directly from Cloudflare R2 Global CDN if configured!
        if storage_r2.is_r2_configured():
            r2_key = f"patterns/{book['filename']}"
            r2_url = storage_r2.generate_presigned_download_url(r2_key, expires_in=3600)
            if r2_url:
                return RedirectResponse(r2_url)

        if book.get("filepath") and os.path.exists(book["filepath"]):
            return FileResponse(
                book["filepath"],
                media_type="application/pdf",
                filename=f"Full_{book['filename']}"
            )
        cached_file = os.path.join(CACHE_DIR, "patterns", book["filename"])
        if os.path.exists(cached_file):
            return FileResponse(cached_file, media_type="application/pdf", filename=f"Full_{book['filename']}")
        raise HTTPException(status_code=404, detail="Pattern PDF not found.")

    # Generate preview PDF with pages 3+ blurred
    try:
        src_pdf = get_pdf_document(book)
        out_pdf = pymupdf.open()
        
        # Limit preview build to max 12 pages for fast download
        max_pages = min(len(src_pdf), 12)

        for i in range(max_pages):
            page = src_pdf[i]
            if i < 2:
                # Keep original vector crisp page
                out_pdf.insert_pdf(src_pdf, from_page=i, to_page=i)
            else:
                # Rasterize, blur with Pillow, and embed
                pix = page.get_pixmap(dpi=120)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                blurred_img = img.filter(ImageFilter.GaussianBlur(radius=18))
                
                buf = io.BytesIO()
                blurred_img.save(buf, format="JPEG", quality=75)
                
                new_page = out_pdf.new_page(width=page.rect.width, height=page.rect.height)
                new_page.insert_image(page.rect, stream=buf.getvalue())
                
                # Paywall stamp banner
                banner_rect = pymupdf.Rect(40, page.rect.height / 2 - 35, page.rect.width - 40, page.rect.height / 2 + 35)
                new_page.draw_rect(banner_rect, color=(0.85, 0.2, 0.3), fill=(0.1, 0.12, 0.18))
                new_page.insert_text(
                    (banner_rect.x0 + 15, banner_rect.y0 + 30),
                    "🔒 FULL PATTERN LOCKED — UNLOCK TO VIEW",
                    fontsize=13,
                    color=(1, 1, 1)
                )
                new_page.insert_text(
                    (banner_rect.x0 + 15, banner_rect.y0 + 52),
                    "Unlock all 1,000+ Crochet Patterns to view full instructions.",
                    fontsize=9.5,
                    color=(0.8, 0.85, 0.95)
                )
        
        out_bytes = out_pdf.tobytes()
        src_pdf.close()
        out_pdf.close()
        
        return Response(
            content=out_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="Preview_{book["filename"]}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview PDF: {str(e)}")

# Mount static files
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print("Starting PDF Paywall Library Server on http://localhost:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
