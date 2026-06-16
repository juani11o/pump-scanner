import sqlite3
import os
import datetime
import hashlib
import secrets
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.db")

def get_db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: Optional[str] = None) -> tuple:
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return key.hex(), salt

def verify_password(password: str, salt: str, hashed: str) -> bool:
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return key.hex() == hashed

def init_db():
    """Create tables if they do not exist and ensure schema is up-to-date."""
    with get_db_conn() as conn:
        # Create users table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                picture TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                subscription_status TEXT DEFAULT 'active',
                stripe_customer_id TEXT DEFAULT '',
                password_hash TEXT,
                password_salt TEXT,
                email_confirmed INTEGER DEFAULT 0,
                confirmation_code TEXT,
                reset_token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check and apply migrations for older databases if they lack the new columns
        cursor = conn.execute("PRAGMA table_info(users)")
        existing_cols = [row["name"] for row in cursor.fetchall()]
        
        if "password_hash" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        if "password_salt" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN password_salt TEXT")
        if "email_confirmed" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN email_confirmed INTEGER DEFAULT 0")
        if "confirmation_code" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN confirmation_code TEXT")
        if "reset_token" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN reset_token TEXT")

        # Create sessions table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Create profitable_trades table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS profitable_trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                ticker TEXT NOT NULL,
                type TEXT NOT NULL,
                entry_price REAL NOT NULL,
                exit_price REAL NOT NULL,
                profit_pct REAL NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Create role_features table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS role_features (
                role TEXT PRIMARY KEY,
                webhook_enabled INTEGER DEFAULT 1,
                deepseek_enabled INTEGER DEFAULT 1,
                calculator_enabled INTEGER DEFAULT 1,
                ledger_enabled INTEGER DEFAULT 0
            )
        """)
        conn.commit()

        # Pre-seed role features if they don't exist
        for role, flags in [
            ("admin", (1, 1, 1, 1)),
            ("black_diamond", (0, 1, 1, 1)),
            ("premium", (0, 1, 1, 0)),
            ("user", (0, 0, 1, 0))
        ]:
            cursor = conn.execute("SELECT * FROM role_features WHERE role = ?", (role,))
            if not cursor.fetchone():
                conn.execute(
                    """
                    INSERT INTO role_features (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (role, flags[0], flags[1], flags[2], flags[3])
                )
        conn.commit()


        # Pre-seed Admin Account
        cursor = conn.execute("SELECT * FROM users WHERE id = ?", ("admin",))
        if not cursor.fetchone():
            admin_salt = secrets.token_hex(16)
            admin_hash, _ = hash_password("admin", admin_salt)
            conn.execute(
                """
                INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("admin", "admin@admin.com", "Admin User", "https://api.dicebear.com/7.x/bottts/svg?seed=admin", "admin", admin_hash, admin_salt, 1)
            )
            
        # Pre-seed Standard User Account
        cursor = conn.execute("SELECT * FROM users WHERE id = ?", ("user",))
        if not cursor.fetchone():
            user_salt = secrets.token_hex(16)
            user_hash, _ = hash_password("user", user_salt)
            conn.execute(
                """
                INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("user", "user@user.com", "Standard User", "https://api.dicebear.com/7.x/bottts/svg?seed=user", "user", user_hash, user_salt, 1)
            )
        conn.commit()

def get_user_by_email_or_username(identifier: str) -> Optional[Dict[str, Any]]:
    with get_db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ? OR id = ?", (identifier, identifier)).fetchone()
        return dict(row) if row else None

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    with get_db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None

def register_user(email: str, name: str, password: str) -> Dict[str, Any]:
    # Use part before @ for user ID
    user_id = email.split('@')[0]
    # Check if id already exists
    with get_db_conn() as conn:
        cursor = conn.execute("SELECT COUNT(*) as count FROM users WHERE id = ?", (user_id,))
        if cursor.fetchone()["count"] > 0:
            # Append random code to user_id to ensure uniqueness
            user_id = f"{user_id}_{secrets.token_hex(3)}"
            
    salt = secrets.token_hex(16)
    pw_hash, _ = hash_password(password, salt)
    
    # Generate 6-digit confirmation code
    code = "".join(secrets.choice("0123456789") for _ in range(6))
    
    picture = f"https://api.dicebear.com/7.x/bottts/svg?seed={user_id}"
    
    with get_db_conn() as conn:
        conn.execute(
            """
            INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed, confirmation_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (user_id, email, name, picture, "user", pw_hash, salt, code)
        )
        conn.commit()
    
    return get_user_by_email_or_username(email)

def confirm_email_code(identifier: str, code: str) -> bool:
    user = get_user_by_email_or_username(identifier)
    if not user or user.get("confirmation_code") != code:
        return False
        
    with get_db_conn() as conn:
        conn.execute(
            "UPDATE users SET email_confirmed = 1, confirmation_code = NULL WHERE id = ?",
            (user["id"],)
        )
        conn.commit()
    return True

def verify_user_credentials(identifier: str, password: str) -> Optional[Dict[str, Any]]:
    user = get_user_by_email_or_username(identifier)
    if not user or not user.get("password_hash"):
        return None
        
    if verify_password(password, user["password_salt"], user["password_hash"]):
        return user
    return None

def generate_reset_token(identifier: str) -> Optional[str]:
    user = get_user_by_email_or_username(identifier)
    if not user:
        return None
        
    # Generate 6-digit reset token code
    token = "".join(secrets.choice("0123456789") for _ in range(6))
    with get_db_conn() as conn:
        conn.execute("UPDATE users SET reset_token = ? WHERE id = ?", (token, user["id"]))
        conn.commit()
    return token

def reset_password_with_token(identifier: str, token: str, new_password: str) -> bool:
    user = get_user_by_email_or_username(identifier)
    if not user or not user.get("reset_token") or user.get("reset_token") != token:
        return False
        
    salt = secrets.token_hex(16)
    pw_hash, _ = hash_password(new_password, salt)
    
    with get_db_conn() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ?, password_salt = ?, reset_token = NULL WHERE id = ?",
            (pw_hash, salt, user["id"])
        )
        conn.commit()
    return True

def create_user(email: str, name: str, picture: str, role: Optional[str] = None) -> Dict[str, Any]:
    user_id = email
    with get_db_conn() as conn:
        cursor = conn.execute("SELECT COUNT(*) as count FROM users")
        count = cursor.fetchone()["count"]
        
        assigned_role = role if role else ("admin" if count == 0 else "user")
            
        conn.execute(
            """
            INSERT INTO users (id, email, name, picture, role, email_confirmed)
            VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(email) DO UPDATE SET
                name=excluded.name,
                picture=excluded.picture
            """,
            (user_id, email, name, picture, assigned_role)
        )
        conn.commit()
    
    return get_user_by_email(email)

def create_session(user_id: str, token: str, expires_at: datetime.datetime) -> None:
    with get_db_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at.isoformat())
        )
        conn.commit()

def get_user_by_session_token(token: str) -> Optional[Dict[str, Any]]:
    with get_db_conn() as conn:
        session_row = conn.execute("SELECT * FROM sessions WHERE token = ?", (token,)).fetchone()
        if not session_row:
            return None
            
        expires_at_str = session_row["expires_at"]
        expires_at = datetime.datetime.fromisoformat(expires_at_str)
        
        if expires_at < datetime.datetime.now():
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            return None
            
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (session_row["user_id"],)).fetchone()
        return dict(user_row) if user_row else None

def delete_session(token: str) -> None:
    with get_db_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()

def update_user_role(user_id: str, role: str) -> bool:
    if role not in ["admin", "premium", "black_diamond", "user"]:
        return False
    with get_db_conn() as conn:
        conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
        conn.commit()
        return True

def list_all_users() -> List[Dict[str, Any]]:
    with get_db_conn() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

# Admin direct database actions
def admin_confirm_user_email(user_id: str, confirm: bool) -> bool:
    val = 1 if confirm else 0
    with get_db_conn() as conn:
        conn.execute("UPDATE users SET email_confirmed = ? WHERE id = ?", (val, user_id))
        conn.commit()
        return True

def admin_reset_user_password(user_id: str, new_pw: str) -> bool:
    salt = secrets.token_hex(16)
    pw_hash, _ = hash_password(new_pw, salt)
    with get_db_conn() as conn:
        conn.execute("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?", (pw_hash, salt, user_id))
        conn.commit()
        return True

def delete_user(user_id: str) -> bool:
    with get_db_conn() as conn:
        # Delete sessions
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        # Delete trades
        conn.execute("DELETE FROM profitable_trades WHERE user_id = ?", (user_id,))
        # Delete user
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return True

# Profit trades ledger functions
def add_trade(user_id: str, ticker: str, trade_type: str, entry_price: float, exit_price: float, profit_pct: float, notes: str) -> int:
    with get_db_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO profitable_trades (user_id, ticker, type, entry_price, exit_price, profit_pct, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, ticker, trade_type, entry_price, exit_price, profit_pct, notes)
        )
        conn.commit()
        return cursor.lastrowid

def get_user_trades(user_id: str) -> List[Dict[str, Any]]:
    with get_db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM profitable_trades WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]

def delete_trade(user_id: str, trade_id: int) -> bool:
    with get_db_conn() as conn:
        cursor = conn.execute("DELETE FROM profitable_trades WHERE id = ? AND user_id = ?", (trade_id, user_id))
        conn.commit()
        return cursor.rowcount > 0

def get_role_features(role: str) -> Dict[str, Any]:
    with get_db_conn() as conn:
        row = conn.execute("SELECT * FROM role_features WHERE role = ?", (role,)).fetchone()
        if row:
            return dict(row)
        # Default fallback if not found
        return {
            "role": role,
            "webhook_enabled": 0,
            "deepseek_enabled": 0,
            "calculator_enabled": 1,
            "ledger_enabled": 0
        }

def get_all_role_features() -> List[Dict[str, Any]]:
    with get_db_conn() as conn:
        rows = conn.execute("SELECT * FROM role_features").fetchall()
        return [dict(r) for r in rows]

def update_role_features(role: str, webhook_enabled: int, deepseek_enabled: int, calculator_enabled: int, ledger_enabled: int) -> bool:
    with get_db_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO role_features (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled)
            VALUES (?, ?, ?, ?, ?)
            """,
            (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled)
        )
        conn.commit()
        return True

# Self-initialize when imported
init_db()
