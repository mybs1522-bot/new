"""
Database module for PDF Library.
Uses SQLite for zero-config, ultra-fast persistence of:
1. Users (Admin and Customers) with salted password hashing.
2. Starred books (for Page 1 priority in the catalog).
3. Purchases / Unlocked status.
"""

import os
import sqlite3
import hashlib
import secrets
from datetime import datetime
from typing import Optional, List, Set, Dict, Any

IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
if IS_SERVERLESS:
    DATA_DIR = "/tmp/data"
else:
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

DB_PATH = os.path.join(DATA_DIR, "library.db")

try:
    os.makedirs(DATA_DIR, exist_ok=True)
except OSError:
    DATA_DIR = "/tmp/data"
    DB_PATH = os.path.join(DATA_DIR, "library.db")
    os.makedirs(DATA_DIR, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    """Returns a connection to the SQLite database with dictionary-like row access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return key.hex(), salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies a password against stored hash and salt."""
    key, _ = hash_password(password, salt)
    return secrets.compare_digest(key, password_hash)

def init_db():
    """Initializes the SQLite schema and seeds the default admin user."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        has_unlocked_all BOOLEAN NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Starred Books table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS starred_books (
        book_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
    );
    """)

    # 3. Purchases / Orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        order_ref TEXT UNIQUE NOT NULL,
        amount_paid REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'completed',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)

    # 4. User Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)

    conn.commit()

    # Migrate any existing starred books from cache/starred_books.json if table is empty
    cursor.execute("SELECT count(*) as cnt FROM starred_books")
    if cursor.fetchone()["cnt"] == 0:
        json_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache", "starred_books.json")
        if os.path.exists(json_file):
            try:
                import json
                with open(json_file, "r", encoding="utf-8") as f:
                    starred_ids = json.load(f)
                    for b_id in starred_ids:
                        cursor.execute("INSERT OR IGNORE INTO starred_books (book_id, created_at) VALUES (?, ?)", (b_id, datetime.utcnow().isoformat()))
                conn.commit()
            except Exception as e:
                print("Error migrating json starred books:", e)

    # Seed admin user if not exists
    cursor.execute("SELECT id FROM users WHERE email = ? OR email = ?", ('admin', 'admin@crochetlibrary.com'))
    admin = cursor.fetchone()
    if not admin:
        pwd_hash, salt = hash_password("Robbin#00xx")
        cursor.execute("""
        INSERT INTO users (email, password_hash, salt, role, has_unlocked_all, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, ('admin', pwd_hash, salt, 'admin', 1, datetime.utcnow().isoformat()))
        conn.commit()
        print("Default admin created: admin / Robbin#00xx")

    conn.close()

# ----------------- User Auth Functions -----------------

def create_user(email: str, password: str, role: str = "user") -> Dict[str, Any]:
    """Creates a new user. Raises ValueError if email is taken."""
    conn = get_connection()
    cursor = conn.cursor()
    clean_email = email.strip().lower()

    cursor.execute("SELECT id FROM users WHERE lower(email) = ?", (clean_email,))
    if cursor.fetchone():
        conn.close()
        raise ValueError("An account with this email already exists.")

    pwd_hash, salt = hash_password(password)
    now = datetime.utcnow().isoformat()

    cursor.execute("""
    INSERT INTO users (email, password_hash, salt, role, has_unlocked_all, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (clean_email, pwd_hash, salt, role, 0, now))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "email": clean_email,
        "role": role,
        "has_unlocked_all": False,
        "created_at": now
    }

def authenticate_user(email_or_username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticates a user by email or username."""
    conn = get_connection()
    cursor = conn.cursor()
    query = email_or_username.strip().lower()

    cursor.execute("SELECT * FROM users WHERE lower(email) = ?", (query,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return None

    if verify_password(password, user["password_hash"], user["salt"]):
        return {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "has_unlocked_all": bool(user["has_unlocked_all"]),
            "created_at": user["created_at"]
        }
    return None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a user by their numeric ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role, has_unlocked_all, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "has_unlocked_all": bool(user["has_unlocked_all"]),
            "created_at": user["created_at"]
        }
    return None

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user by their email address."""
    if not email:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role, has_unlocked_all, created_at FROM users WHERE lower(email) = ?", (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id": row["id"],
            "email": row["email"],
            "role": row["role"],
            "has_unlocked_all": bool(row["has_unlocked_all"]),
            "created_at": row["created_at"]
        }
    return None

def get_or_create_user_by_email(email: str) -> Dict[str, Any]:
    """Finds an existing user or creates a new customer account upon Stripe purchase."""
    existing = get_user_by_email(email)
    if existing:
        return existing
    temp_password = secrets.token_urlsafe(16)
    return create_user(email.strip().lower(), temp_password, role="user")


def unlock_user_catalog(user_id: int) -> bool:
    """Grants full unlocked access to a user account."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET has_unlocked_all = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

def toggle_user_unlock(user_id: int) -> bool:
    """Toggles unlocked status for a user. Returns new boolean state."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT has_unlocked_all FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError("User not found.")
    
    new_val = 0 if row["has_unlocked_all"] else 1
    cursor.execute("UPDATE users SET has_unlocked_all = ? WHERE id = ?", (new_val, user_id))
    conn.commit()
    conn.close()
    return bool(new_val)

def get_all_users() -> List[Dict[str, Any]]:
    """Retrieves all registered users with their order count."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT u.id, u.email, u.role, u.has_unlocked_all, u.created_at,
           COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id
    ORDER BY u.id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "email": r["email"],
            "role": r["role"],
            "has_unlocked_all": bool(r["has_unlocked_all"]),
            "created_at": r["created_at"],
            "order_count": r["order_count"]
        }
        for r in rows
    ]

def delete_user(user_id: int) -> bool:
    """Deletes a customer user. Will not delete main admin."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    if row["role"] == "admin":
        conn.close()
        raise ValueError("Cannot delete admin account.")
    
    cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM orders WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

# ----------------- Starred Books Functions -----------------

def get_starred_book_ids() -> Set[str]:
    """Returns the set of all starred book IDs from SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT book_id FROM starred_books")
    rows = cursor.fetchall()
    conn.close()
    return {row["book_id"] for row in rows}

def toggle_starred_book(book_id: str) -> bool:
    """Toggles starred status for a book. Returns True if starred, False if unstarred."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT book_id FROM starred_books WHERE book_id = ?", (book_id,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("DELETE FROM starred_books WHERE book_id = ?", (book_id,))
        is_starred = False
    else:
        cursor.execute("INSERT INTO starred_books (book_id, created_at) VALUES (?, ?)", (book_id, datetime.utcnow().isoformat()))
        is_starred = True

    conn.commit()
    conn.close()
    return is_starred

# ----------------- Session Management -----------------

def create_session(user_id: int) -> str:
    """Generates a secure session token and saves to SQLite."""
    token = secrets.token_urlsafe(32)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO sessions (token, user_id, created_at)
    VALUES (?, ?, ?)
    """, (token, user_id, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return token

def get_user_by_session(token: str) -> Optional[Dict[str, Any]]:
    """Fetches user matching the session token."""
    if not token:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT u.id, u.email, u.role, u.has_unlocked_all, u.created_at
    FROM users u
    JOIN sessions s ON u.id = s.user_id
    WHERE s.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id": row["id"],
            "email": row["email"],
            "role": row["role"],
            "has_unlocked_all": bool(row["has_unlocked_all"]),
            "created_at": row["created_at"]
        }
    return None

def delete_session(token: str):
    """Deletes a session token on logout."""
    if not token:
        return
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()

def record_order(user_id: int, order_ref: str, amount: float = 29.00) -> bool:
    """Records order and unlocks catalog for user."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT INTO orders (user_id, order_ref, amount_paid, created_at)
    VALUES (?, ?, ?, ?)
    """, (user_id, order_ref, amount, now))
    cursor.execute("UPDATE users SET has_unlocked_all = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

