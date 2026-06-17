import sqlite3
import os
import datetime
import secrets
import bcrypt
import psycopg2
import psycopg2.extras
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.db")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

def is_postgres() -> bool:
    return DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")

def get_db_conn():
    if is_postgres():
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(url, cursor_factory=psycopg2.extras.DictCursor)
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def db_query(query: str, params: tuple = (), fetch: str = None, commit: bool = False) -> Any:
    conn = get_db_conn()
    try:
        if is_postgres():
            query = query.replace("?", "%s")
            query = query.replace("excluded.", "EXCLUDED.")
            
        cursor = conn.cursor()
        cursor.execute(query, params)
        
        result = None
        if fetch == "all":
            rows = cursor.fetchall()
            result = [dict(r) for r in rows]
        elif fetch == "one":
            row = cursor.fetchone()
            result = dict(row) if row else None
        elif fetch == "scalar":
            row = cursor.fetchone()
            result = row[0] if row else None
            
        if commit:
            conn.commit()
            
        cursor.close()
        return result
    finally:
        conn.close()

def hash_password(password: str, salt: Optional[str] = None) -> tuple:
    if not salt:
        salt = bcrypt.gensalt().decode('utf-8')
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt.encode('utf-8'))
    return hashed.decode('utf-8'), salt

def verify_password(password: str, salt: str, hashed: str) -> bool:
    try:
        test_hash = bcrypt.hashpw(password.encode('utf-8'), salt.encode('utf-8'))
        return test_hash.decode('utf-8') == hashed
    except Exception:
        return False

def init_db():
    conn = get_db_conn()
    try:
        cursor = conn.cursor()
        if is_postgres():
            cursor.execute("""
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
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS profitable_trades (
                    id SERIAL PRIMARY KEY,
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
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS role_features (
                    role TEXT PRIMARY KEY,
                    webhook_enabled INTEGER DEFAULT 1,
                    deepseek_enabled INTEGER DEFAULT 1,
                    calculator_enabled INTEGER DEFAULT 1,
                    ledger_enabled INTEGER DEFAULT 0,
                    simulation_enabled INTEGER DEFAULT 0
                )
            """)
            cursor.execute("ALTER TABLE role_features ADD COLUMN IF NOT EXISTS simulation_enabled INTEGER DEFAULT 0")
            cursor.execute("ALTER TABLE role_features ADD COLUMN IF NOT EXISTS advanced_features_enabled INTEGER DEFAULT 0");
            # Backfill advanced_features_enabled based on webhook or deepseek flags
            cursor.execute("UPDATE role_features SET advanced_features_enabled = CASE WHEN webhook_enabled = 1 OR deepseek_enabled = 1 THEN 1 ELSE 0 END");
        else:
            cursor.execute("""
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
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            cursor.execute("""
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
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS role_features (
                    role TEXT PRIMARY KEY,
                    webhook_enabled INTEGER DEFAULT 1,
                    deepseek_enabled INTEGER DEFAULT 1,
                    calculator_enabled INTEGER DEFAULT 1,
                    ledger_enabled INTEGER DEFAULT 0,
                    simulation_enabled INTEGER DEFAULT 0
                )
            """)
            
            cursor.execute("PRAGMA table_info(users)")
            existing_cols = [row[1] for row in cursor.fetchall()]
            if "password_hash" not in existing_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
            if "password_salt" not in existing_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN password_salt TEXT")
            if "email_confirmed" not in existing_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN email_confirmed INTEGER DEFAULT 0")
            if "confirmation_code" not in existing_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN confirmation_code TEXT")
            if "reset_token" not in existing_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN reset_token TEXT")

            cursor.execute("PRAGMA table_info(role_features)")
            existing_role_cols = [row[1] for row in cursor.fetchall()]
            if "simulation_enabled" not in existing_role_cols:
                cursor.execute("ALTER TABLE role_features ADD COLUMN simulation_enabled INTEGER DEFAULT 0")

        conn.commit()
        
        for role, flags in [
            ("admin", (1, 1, 1, 1, 1)),
            ("black_diamond", (0, 1, 1, 1, 0)),
            ("premium", (0, 1, 1, 0, 0)),
            ("user", (0, 0, 1, 0, 0))
        ]:
            cursor.execute("SELECT * FROM role_features WHERE role = %s" if is_postgres() else "SELECT * FROM role_features WHERE role = ?", (role,))
            if not cursor.fetchone():
                if is_postgres():
                    cursor.execute(
                        """
                        INSERT INTO role_features (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled, simulation_enabled)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (role, flags[0], flags[1], flags[2], flags[3], flags[4])
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO role_features (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled, simulation_enabled)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (role, flags[0], flags[1], flags[2], flags[3], flags[4])
                    )
        conn.commit()

        cursor.execute("SELECT * FROM users WHERE id = %s" if is_postgres() else "SELECT * FROM users WHERE id = ?", ("admin",))
        if not cursor.fetchone():
            admin_salt = bcrypt.gensalt().decode('utf-8')
            admin_hash = bcrypt.hashpw(b"admin", admin_salt.encode('utf-8')).decode('utf-8')
            if is_postgres():
                cursor.execute(
                    """
                    INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    ("admin", "admin@admin.com", "Admin User", "https://api.dicebear.com/7.x/bottts/svg?seed=admin", "admin", admin_hash, admin_salt, 1)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    ("admin", "admin@admin.com", "Admin User", "https://api.dicebear.com/7.x/bottts/svg?seed=admin", "admin", admin_hash, admin_salt, 1)
                )
            
        cursor.execute("SELECT * FROM users WHERE id = %s" if is_postgres() else "SELECT * FROM users WHERE id = ?", ("user",))
        if not cursor.fetchone():
            user_salt = bcrypt.gensalt().decode('utf-8')
            user_hash = bcrypt.hashpw(b"user", user_salt.encode('utf-8')).decode('utf-8')
            if is_postgres():
                cursor.execute(
                    """
                    INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    ("user", "user@user.com", "Standard User", "https://api.dicebear.com/7.x/bottts/svg?seed=user", "user", user_hash, user_salt, 1)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    ("user", "user@user.com", "Standard User", "https://api.dicebear.com/7.x/bottts/svg?seed=user", "user", user_hash, user_salt, 1)
                )
        conn.commit()
        cursor.close()
    finally:
        conn.close()

def get_user_by_email_or_username(identifier: str) -> Optional[Dict[str, Any]]:
    return db_query("SELECT * FROM users WHERE email = ? OR id = ?", (identifier, identifier), fetch="one")

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    return db_query("SELECT * FROM users WHERE email = ?", (email,), fetch="one")

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    return db_query("SELECT * FROM users WHERE id = ?", (user_id,), fetch="one")

def register_user(email: str, name: str, password: str) -> Dict[str, Any]:
    user_id = email.split('@')[0]
    count = db_query("SELECT COUNT(*) as count FROM users WHERE id = ?", (user_id,), fetch="scalar")
    if count > 0:
        user_id = f"{user_id}_{secrets.token_hex(3)}"
            
    salt = bcrypt.gensalt().decode('utf-8')
    pw_hash, _ = hash_password(password, salt)
    code = "".join(secrets.choice("0123456789") for _ in range(6))
    picture = f"https://api.dicebear.com/7.x/bottts/svg?seed={user_id}"
    
    db_query(
        """
        INSERT INTO users (id, email, name, picture, role, password_hash, password_salt, email_confirmed, confirmation_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (user_id, email, name, picture, "user", pw_hash, salt, code),
        commit=True
    )
    return get_user_by_email_or_username(email)

def confirm_email_code(identifier: str, code: str) -> bool:
    user = get_user_by_email_or_username(identifier)
    if not user or user.get("confirmation_code") != code:
        return False
        
    db_query(
        "UPDATE users SET email_confirmed = 1, confirmation_code = NULL WHERE id = ?",
        (user["id"],),
        commit=True
    )
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
        
    token = "".join(secrets.choice("0123456789") for _ in range(6))
    db_query("UPDATE users SET reset_token = ? WHERE id = ?", (token, user["id"]), commit=True)
    return token

def reset_password_with_token(identifier: str, token: str, new_password: str) -> bool:
    user = get_user_by_email_or_username(identifier)
    if not user or not user.get("reset_token") or user.get("reset_token") != token:
        return False
        
    salt = bcrypt.gensalt().decode('utf-8')
    pw_hash, _ = hash_password(new_password, salt)
    
    db_query(
        "UPDATE users SET password_hash = ?, password_salt = ?, reset_token = NULL WHERE id = ?",
        (pw_hash, salt, user["id"]),
        commit=True
    )
    return True

def create_user(email: str, name: str, picture: str, role: Optional[str] = None) -> Dict[str, Any]:
    user_id = email
    count = db_query("SELECT COUNT(*) as count FROM users", fetch="scalar")
    assigned_role = role if role else ("admin" if count == 0 else "user")
        
    if is_postgres():
        db_query(
            """
            INSERT INTO users (id, email, name, picture, role, email_confirmed)
            VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(email) DO UPDATE SET
                name=EXCLUDED.name,
                picture=EXCLUDED.picture
            """,
            (user_id, email, name, picture, assigned_role),
            commit=True
        )
    else:
        db_query(
            """
            INSERT INTO users (id, email, name, picture, role, email_confirmed)
            VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(email) DO UPDATE SET
                name=excluded.name,
                picture=excluded.picture
            """,
            (user_id, email, name, picture, assigned_role),
            commit=True
        )
    return get_user_by_email(email)

def create_session(user_id: str, token: str, expires_at: datetime.datetime) -> None:
    if is_postgres():
        db_query(
            """
            INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)
            ON CONFLICT(token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
            """,
            (token, user_id, expires_at.isoformat()),
            commit=True
        )
    else:
        db_query(
            "INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at.isoformat()),
            commit=True
        )

def get_user_by_session_token(token: str) -> Optional[Dict[str, Any]]:
    session_row = db_query("SELECT * FROM sessions WHERE token = ?", (token,), fetch="one")
    if not session_row:
        return None
        
    expires_at_str = session_row["expires_at"]
    expires_at = datetime.datetime.fromisoformat(expires_at_str)
    
    if expires_at < datetime.datetime.now():
        db_query("DELETE FROM sessions WHERE token = ?", (token,), commit=True)
        return None
        
    return db_query("SELECT * FROM users WHERE id = ?", (session_row["user_id"],), fetch="one")

def delete_session(token: str) -> None:
    db_query("DELETE FROM sessions WHERE token = ?", (token,), commit=True)

def update_user_role(user_id: str, role: str) -> bool:
    if role not in ["admin", "premium", "black_diamond", "user"]:
        return False
    db_query("UPDATE users SET role = ? WHERE id = ?", (role, user_id), commit=True)
    return True

def list_all_users() -> List[Dict[str, Any]]:
    return db_query("SELECT * FROM users ORDER BY created_at DESC", fetch="all")

def admin_confirm_user_email(user_id: str, confirm: bool) -> bool:
    val = 1 if confirm else 0
    db_query("UPDATE users SET email_confirmed = ? WHERE id = ?", (val, user_id), commit=True)
    return True

def admin_reset_user_password(user_id: str, new_pw: str) -> bool:
    salt = bcrypt.gensalt().decode('utf-8')
    pw_hash, _ = hash_password(new_pw, salt)
    db_query("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?", (pw_hash, salt, user_id), commit=True)
    return True

def delete_user(user_id: str) -> bool:
    db_query("DELETE FROM sessions WHERE user_id = ?", (user_id,), commit=True)
    db_query("DELETE FROM profitable_trades WHERE user_id = ?", (user_id,), commit=True)
    db_query("DELETE FROM users WHERE id = ?", (user_id,), commit=True)
    return True

TRADE_JOURNAL_COLUMNS = {
    "platform": "TEXT DEFAULT ''",
    "asset_class": "TEXT DEFAULT 'crypto'",
    "symbol": "TEXT DEFAULT ''",
    "side": "TEXT DEFAULT 'long'",
    "status": "TEXT DEFAULT 'closed'",
    "entry_date": "TEXT DEFAULT ''",
    "exit_date": "TEXT DEFAULT ''",
    "quantity": "REAL DEFAULT 0",
    "fees": "REAL DEFAULT 0",
    "profit_loss": "REAL DEFAULT 0",
    "strategy": "TEXT DEFAULT ''",
    "setup": "TEXT DEFAULT ''",
    "timeframe": "TEXT DEFAULT ''",
    "conviction": "INTEGER DEFAULT 5",
    "emotion": "TEXT DEFAULT ''",
    "mistakes": "TEXT DEFAULT ''",
    "lessons": "TEXT DEFAULT ''",
    "tags": "TEXT DEFAULT ''"
}

def ensure_trade_journal_columns() -> None:
    conn = get_db_conn()
    try:
        cursor = conn.cursor()
        if is_postgres():
            cursor.execute("""
                ALTER TABLE profitable_trades
                ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'crypto',
                ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS side TEXT DEFAULT 'long',
                ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'closed',
                ADD COLUMN IF NOT EXISTS entry_date TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS exit_date TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS quantity REAL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS fees REAL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS profit_loss REAL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS strategy TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS setup TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS timeframe TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS conviction INTEGER DEFAULT 5,
                ADD COLUMN IF NOT EXISTS emotion TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS mistakes TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS lessons TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT ''
            """)
        else:
            cursor.execute("PRAGMA table_info(profitable_trades)")
            existing_cols = {row[1] for row in cursor.fetchall()}
            for col, definition in TRADE_JOURNAL_COLUMNS.items():
                if col not in existing_cols:
                    cursor.execute(f"ALTER TABLE profitable_trades ADD COLUMN {col} {definition}")
        conn.commit()
        cursor.close()
    finally:
        conn.close()

def add_trade(user_id: str, trade: Dict[str, Any]) -> int:
    ensure_trade_journal_columns()
    symbol = trade.get("symbol", "").upper()
    trade_type = trade.get("trade_type", "spot")
    entry_price = float(trade.get("entry_price") or 0)
    exit_price = trade.get("exit_price")
    quantity = float(trade.get("quantity") or 0)
    fees = float(trade.get("fees") or 0)
    profit_loss = trade.get("profit_loss")
    profit_pct = trade.get("profit_pct")

    if exit_price in ("", None):
        exit_price = 0
    exit_price = float(exit_price)

    if profit_loss in ("", None):
        direction = -1 if trade.get("side") == "short" else 1
        profit_loss = ((exit_price - entry_price) * quantity * direction) - fees if exit_price and quantity else 0
    profit_loss = float(profit_loss)

    if profit_pct in ("", None):
        cost_basis = entry_price * quantity
        profit_pct = (profit_loss / cost_basis * 100) if cost_basis else 0
    profit_pct = float(profit_pct)

    values = {
        "user_id": user_id,
        "ticker": symbol,
        "type": trade_type,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "profit_pct": profit_pct,
        "notes": trade.get("notes", ""),
        "platform": trade.get("platform", ""),
        "asset_class": trade.get("asset_class", "crypto"),
        "symbol": symbol,
        "side": trade.get("side", "long"),
        "status": trade.get("status", "closed"),
        "entry_date": trade.get("entry_date", ""),
        "exit_date": trade.get("exit_date", ""),
        "quantity": quantity,
        "fees": fees,
        "profit_loss": profit_loss,
        "strategy": trade.get("strategy", ""),
        "setup": trade.get("setup", ""),
        "timeframe": trade.get("timeframe", ""),
        "conviction": int(trade.get("conviction") or 5),
        "emotion": trade.get("emotion", ""),
        "mistakes": trade.get("mistakes", ""),
        "lessons": trade.get("lessons", ""),
        "tags": trade.get("tags", "")
    }

    columns = list(values.keys())
    placeholders = ", ".join(["?"] * len(columns))
    column_sql = ", ".join(columns)

    if is_postgres():
        trade_id = db_query(
            f"INSERT INTO profitable_trades ({column_sql}) VALUES ({placeholders}) RETURNING id",
            tuple(values.values()),
            fetch="scalar",
            commit=True
        )
        return trade_id
    else:
        conn = get_db_conn()
        try:
            cursor = conn.cursor()
            cursor.execute(
                f"INSERT INTO profitable_trades ({column_sql}) VALUES ({placeholders})",
                tuple(values.values())
            )
            conn.commit()
            trade_id = cursor.lastrowid
            cursor.close()
            return trade_id
        finally:
            conn.close()

def get_user_trades(user_id: str) -> List[Dict[str, Any]]:
    ensure_trade_journal_columns()
    return db_query("SELECT * FROM profitable_trades WHERE user_id = ? ORDER BY created_at DESC", (user_id,), fetch="all")

def delete_trade(user_id: str, trade_id: int) -> bool:
    conn = get_db_conn()
    try:
        if is_postgres():
            query = "DELETE FROM profitable_trades WHERE id = %s AND user_id = %s"
        else:
            query = "DELETE FROM profitable_trades WHERE id = ? AND user_id = ?"
        cursor = conn.cursor()
        cursor.execute(query, (trade_id, user_id))
        conn.commit()
        count = cursor.rowcount
        cursor.close()
        return count > 0
    finally:
        conn.close()

def get_role_features(role: str) -> Dict[str, Any]:
    row = db_query("SELECT * FROM role_features WHERE role = ?", (role,), fetch="one")
    if row:
        return row
    return {
        "role": role,
        "webhook_enabled": 0,
        "deepseek_enabled": 0,
        "calculator_enabled": 1,
        "ledger_enabled": 0,
        "simulation_enabled": 0
    }

def get_all_role_features() -> List[Dict[str, Any]]:
    return db_query("SELECT * FROM role_features", fetch="all")

def update_role_features(role: str, webhook_enabled: int, deepseek_enabled: int, calculator_enabled: int, ledger_enabled: int, simulation_enabled: int) -> bool:
    if is_postgres():
        db_query(
            """
            INSERT INTO role_features (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled, simulation_enabled)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(role) DO UPDATE SET
                webhook_enabled = EXCLUDED.webhook_enabled,
                deepseek_enabled = EXCLUDED.deepseek_enabled,
                calculator_enabled = EXCLUDED.calculator_enabled,
                ledger_enabled = EXCLUDED.ledger_enabled,
                simulation_enabled = EXCLUDED.simulation_enabled
            """,
            (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled, simulation_enabled),
            commit=True
        )
    else:
        db_query(
            """
            INSERT OR REPLACE INTO role_features (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled, simulation_enabled)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (role, webhook_enabled, deepseek_enabled, calculator_enabled, ledger_enabled, simulation_enabled),
            commit=True
        )
    return True

init_db()
