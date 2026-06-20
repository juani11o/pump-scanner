import asyncio
import sys

# Windows-specific SSL handshake socket reset fix
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
from dotenv import load_dotenv
load_dotenv()

import json
import logging
import random
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Cookie, Depends, Response, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import pandas as pd
from typing import Optional, List
import secrets
import datetime
import aiohttp

from backend.scanner import AutonomousScanner
from backend import users_db
from backend import email_dispatcher

SECURE_COOKIES = os.environ.get("SECURE_COOKIES", "false").lower() == "true"

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ScannerAPI")

app = FastAPI(title="Autonomous Crypto Pump Scanner Terminal")

# CORS middleware for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared logs queue for websocket broadcasting
log_queue = asyncio.Queue()

# Active WebSocket connections list
active_ws_connections = []

async def on_alert_detected(payload):
    """Broadcasts a real scanner alert directly to all connected WebSockets"""
    if active_ws_connections:
        alert_payload = json.dumps({"type": "ALERT", "data": payload})
        for connection in active_ws_connections:
            try:
                await connection.send_text(alert_payload)
            except Exception:
                pass

async def on_scan_result(result):
    """Stream each completed market scan to the dashboard immediately."""
    if active_ws_connections:
        payload = json.dumps({"type": "SCAN_RESULT", "data": result})
        dead_connections = []
        for connection in active_ws_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)
        for connection in dead_connections:
            if connection in active_ws_connections:
                active_ws_connections.remove(connection)

scanner = AutonomousScanner(
    log_queue=log_queue,
    alert_callback=on_alert_detected,
    result_callback=on_scan_result
)

class SettingsModel(BaseModel):
    webhook_url: str
    deepseek_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: str = "deepseek"
    interval_sec: int
    volume_multiplier: float
    price_velocity_pct: float
    exchanges: list[str]
    instruments: list[str]
    max_pairs: int
    # Stage 0: Accumulation Radar
    accum_score_threshold: float = 55.0
    accum_alert_threshold: float = 70.0
    enable_accumulation_alerts: bool = True

class RoleUpdateModel(BaseModel):
    role: str

class FeatureUpdateModel(BaseModel):
    webhook_enabled: int
    deepseek_enabled: int
    calculator_enabled: int
    ledger_enabled: int
    simulation_enabled: int


class TradeCreateModel(BaseModel):
    ticker: str
    type: str
    entry_price: float
    exit_price: float
    profit_pct: float
    notes: Optional[str] = ""

class SignupModel(BaseModel):
    email: str
    name: str
    password: str

class ConfirmEmailModel(BaseModel):
    email: str
    code: str

class LoginModel(BaseModel):
    username: str
    password: str

class ForgotPasswordModel(BaseModel):
    email: str

class ResetPasswordModel(BaseModel):
    email: str
    token: str
    password: str

class ConfirmUpdateModel(BaseModel):
    confirm: bool

class AdminPasswordResetModel(BaseModel):
    password: str

# Authentication dependencies
async def get_session_token(request: Request, session_token: Optional[str] = Cookie(None)):
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header:
            if auth_header.startswith("Bearer "):
                session_token = auth_header[7:]
            else:
                session_token = auth_header
    return session_token

async def get_current_user(session_token: Optional[str] = Depends(get_session_token)):
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = users_db.get_user_by_session_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user

async def get_current_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    return user

@app.on_event("startup")
async def startup_event():
    # If scanner was marked active in persistent settings, don't start automatically anymore
    if scanner.settings.get("active", False):
        logger.info("[STARTUP] Scanner was active in saved state, but auto-start is disabled.")
        
    # Start the log broadcast task in the background
    asyncio.create_task(broadcast_logs())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("[SHUTDOWN] Stopping scanner and closing exchange connections...")
    scanner.stop()

async def broadcast_logs():
    """Reads logs from the scanner queue and broadcasts them to all WebSocket clients"""
    while True:
        try:
            log_msg = await log_queue.get()
            if active_ws_connections:
                # Prepare message payload
                payload = json.dumps({"type": "LOG", "message": log_msg})
                # Send to all active websockets
                dead_connections = []
                for connection in active_ws_connections:
                    try:
                        await connection.send_text(payload)
                    except Exception:
                        dead_connections.append(connection)
                
                # Cleanup disconnected websockets
                for dead in dead_connections:
                    if dead in active_ws_connections:
                        active_ws_connections.remove(dead)
            log_queue.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error broadcasting logs: {e}")
            await asyncio.sleep(1)

@app.websocket("/api/ws/logs")
async def websocket_logs(websocket: WebSocket, token: Optional[str] = Query(None)):
    session_token = token
    if not session_token:
        session_token = websocket.cookies.get("session_token")
        
    if not session_token:
        await websocket.close(code=4001, reason="Authentication required")
        return
        
    user = users_db.get_user_by_session_token(session_token)
    if not user:
        await websocket.close(code=4001, reason="Invalid session")
        return

    await websocket.accept()
    active_ws_connections.append(websocket)
    
    try:
        # History
        history_payload = json.dumps({
            "type": "HISTORY",
            "logs": scanner.logs_history,
            "status": {
                "active": scanner.is_running,
                "settings": scanner.settings,
                "monitored_count": sum(len(v) for v in scanner.monitored_pairs.values()),
                "sequential_mode": scanner.sequential_mode
            }
        })
        await websocket.send_text(history_payload)
        
        while True:
            data = await websocket.receive_text()
            if data == "refresh":
                refresh_payload = json.dumps({
                    "type": "STATUS_REFRESH",
                    "status": {
                        "active": scanner.is_running,
                        "settings": scanner.settings,
                        "monitored_count": sum(len(v) for v in scanner.monitored_pairs.values()),
                        "sequential_mode": scanner.sequential_mode
                    }
                })
                await websocket.send_text(refresh_payload)
    except WebSocketDisconnect:
        if websocket in active_ws_connections:
            active_ws_connections.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_ws_connections:
            active_ws_connections.remove(websocket)

@app.get("/api/status")
async def get_status(current_user: dict = Depends(get_current_user)):
    return {
        "active": scanner.is_running,
        "settings": scanner.settings,
        "monitored_count": sum(len(v) for v in scanner.monitored_pairs.values()),
        "sequential_mode": scanner.sequential_mode
    }

@app.post("/api/settings")
async def update_settings(settings: SettingsModel, current_admin: dict = Depends(get_current_admin)):
    was_running = scanner.is_running
    if was_running:
        scanner.stop()
        
    scanner.update_settings(settings.dict())
    
    if was_running:
        scanner.start()
        
    return {"status": "SUCCESS", "settings": scanner.settings}

@app.post("/api/start")
async def start_scanner(current_admin: dict = Depends(get_current_admin)):
    success = scanner.start()
    if success:
        return {"status": "SUCCESS", "message": "Scanner started successfully."}
    else:
        return {"status": "ALREADY_RUNNING", "message": "Scanner is already running."}

@app.post("/api/stop")
async def stop_scanner(current_admin: dict = Depends(get_current_admin)):
    success = scanner.stop()
    if success:
        return {"status": "SUCCESS", "message": "Scanner stopped successfully."}
    else:
        return {"status": "ALREADY_STOPPED", "message": "Scanner is already stopped."}

@app.get("/api/logs")
async def get_logs(current_user: dict = Depends(get_current_user)):
    return {"logs": scanner.logs_history}

@app.get("/api/pairs_summary")
async def get_pairs_summary(current_user: dict = Depends(get_current_user)):
    return {"results": scanner.last_scan_results}

@app.get("/api/accumulation-candidates")
async def get_accumulation_candidates(current_user: dict = Depends(get_current_user)):
    """Returns the current ranked list of Stage 0 pre-pump accumulation candidates"""
    return {"candidates": scanner.accumulation_candidates}

class TradeIdeaRequestModel(BaseModel):
    ticker: str
    signal_type: str
    metrics: dict
    provider: str
    api_key: Optional[str] = None

@app.post("/api/generate_trade_idea")
async def generate_trade_idea(payload: TradeIdeaRequestModel, current_user: dict = Depends(get_current_user)):
    api_key = payload.api_key
    if not api_key:
        api_key = scanner.settings.get(f"{payload.provider}_api_key", "")
            
    result = await scanner.evaluate_multi_provider_decision(
        provider=payload.provider,
        api_key=api_key,
        ticker=payload.ticker,
        signal_type=payload.signal_type,
        metrics=payload.metrics
    )
    return result

@app.get("/api/discovery")
async def get_discovery(current_user: dict = Depends(get_current_user)):
    return {"monitored_pairs": scanner.monitored_pairs}

@app.post("/api/trigger_accum_simulation")
async def trigger_accum_simulation(current_admin: dict = Depends(get_current_admin)):
    """Generates a mock Stage 0 accumulation candidate to test the Accumulation Radar UI"""
    symbols = ["HYPE/USDC:USDC", "SOL/USDC:USDC", "WIF/USDC:USDC", "PEPE/USDC:USDC", "ARB/USDC:USDC"]
    symbol = random.choice(symbols)

    s1 = round(random.uniform(12.0, 28.0), 2)
    s2 = round(random.uniform(8.0, 22.0), 2)
    s3 = round(random.uniform(5.0, 18.0), 2)
    s4 = round(random.uniform(4.0, 14.0), 2)
    s5 = round(random.uniform(2.0, 9.0), 2)
    total = round(s1 + s2 + s3 + s4 + s5, 1)

    if total >= 85:
        status = "PRE-PUMP"
    elif total >= 70:
        status = "COILING"
    else:
        status = "WATCHING"

    price_sim = round(random.uniform(0.5, 300.0), 4)

    payload = {
        "timestamp": pd.Timestamp.utcnow().isoformat(),
        "exchange": "hyperliquid (simulated)",
        "ticker": symbol,
        "status": "PRE_PUMP_CANDIDATE",
        "accum_status": status,
        "accum_score": total,
        "price": float(price_sim),
        "signals": {
            "volume_coiling":  float(s1),
            "bb_squeeze":       float(s2),
            "cvd_divergence":  float(s3),
            "rsi_reclamation": float(s4),
            "support_zone":    float(s5)
        },
        "first_detected": pd.Timestamp.utcnow().isoformat()
    }

    scanner.log(f"🔮 [SIMULATION] Accumulation candidate detected on {symbol} | Score: {total}/100 | Status: {status}", level=logging.WARNING)

    if active_ws_connections:
        ws_payload = json.dumps({"type": "ACCUM_ALERT", "data": payload})
        for connection in active_ws_connections:
            try:
                await connection.send_text(ws_payload)
            except Exception:
                pass

    return {"status": "SUCCESS", "message": "Accumulation simulation fired.", "data": payload}

@app.post("/api/trigger_simulation")
async def trigger_simulation(current_admin: dict = Depends(get_current_admin)):
    """Generates a mock Stage 3 breakout to test webhook flow and dashboard visuals"""
    symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "DOGE/USDT", "AVAX/USDT", "LINK/USDT", "ADA/USDT", "NEAR/USDT"]
    symbol = random.choice(symbols)
    
    vol_mult = round(random.uniform(3.5, 8.5), 2)
    price_change = round(random.uniform(1.6, 4.8), 2)
    price_sim = round(random.uniform(0.8, 500.0), 4)
    price_change_abs = round(price_sim * price_change / 100, 6)
    oi_delta = round(random.uniform(8.0, 28.5), 2)
    sentiment_score = round(random.uniform(0.68, 0.96), 2)
    
    comp_vol = 0.4 * min(vol_mult, 10.0)
    comp_oi = 0.3 * min(oi_delta, 20.0)
    comp_sent = 0.3 * (sentiment_score * 10.0)
    compound_score = round((comp_vol + comp_oi + comp_sent) * 10, 1)
    
    mock_mcap = random.randint(50000000, 2000000000)
    mock_rank = random.randint(10, 350)
    
    reasons_en = [
        "Strong volume expansion and ascending open interest confirm structural momentum. High probability of continuation.",
        "Breakout volume is exceptional, but open interest remains flat. Likely driven by short-term sentiment/hype.",
        "Technical conditions satisfied on elevated volume. Positive social mentions suggest local momentum accumulation."
    ]
    reasons_es = [
        "La fuerte expansión del volumen y el interés abierto ascendente confirman el impulso estructural. Alta probabilidad de continuación.",
        "El volumen de ruptura es excepcional, pero el interés abierto permanece plano. Probablemente impulsado por el sentimiento/entusiasmo a corto plazo.",
        "Condiciones técnicas satisfechas con volumen elevado. Las menciones sociales positivas sugieren acumulación de impulso local."
    ]
    idx = random.randint(0, len(reasons_en) - 1)

    payload = {
        "timestamp": pd.Timestamp.utcnow().isoformat(),
        "exchange": "binance (simulated)",
        "ticker": symbol,
        "status": "SIMULATED_PUMP_TRIGGERED",
        "metrics": {
            "price": float(price_sim),
            "volume_multiplier": float(vol_mult),
            "price_velocity_2vec": float(price_change),
            "price_change_abs": float(price_change_abs),
            "open_interest_delta_pct": float(oi_delta),
            "vader_sentiment_score": float(sentiment_score),
            "compound_score": float(compound_score)
        },
        "coingecko": {
            "market_cap": mock_mcap,
            "rank": mock_rank
        },
        "agent": {
            "reasoning_en": reasons_en[idx],
            "reasoning_es": reasons_es[idx],
            "conviction_score": random.randint(65, 95)
        }
    }
    
    scanner.log(f"🚨 [SIMULATION] Breakout detected on BINANCE {symbol}! Volume: {vol_mult:.2f}x. Price Change: {price_change:.2f}%.", level=logging.WARNING)
    scanner.log(f"[SIMULATION] [SCORING] Asset: {symbol} | Vol Component: {comp_vol:.2f} | OI Component: {comp_oi:.2f} | Sentiment Component: {comp_sent:.2f} | Total Compound Score: {compound_score}/100")
    scanner.log(f"💥 [SIMULATION] ALERT MATCHED! {symbol} Compound Score is {compound_score}/100. Dispatched simulated webhook payload.", level=logging.WARNING)
    
    asyncio.create_task(scanner.dispatch_webhook(payload))
    
    if active_ws_connections:
        alert_payload = json.dumps({"type": "ALERT", "data": payload})
        for connection in active_ws_connections:
            try:
                await connection.send_text(alert_payload)
            except Exception:
                pass
                
    return {"status": "SUCCESS", "message": "Simulation alert fired.", "data": payload}

# OAuth configuration details
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

@app.get("/api/auth/google/login")
async def google_login(mock_role: Optional[str] = None):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        role = mock_role if mock_role in ["admin", "premium", "black_diamond", "user"] else "user"
        return RedirectResponse(url=f"/api/auth/google/callback?mock_role={role}")
    
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"scope=openid%20email%20profile"
    )
    return RedirectResponse(url=url)

@app.get("/api/auth/google/callback")
async def google_callback(
    response: Response,
    code: Optional[str] = None,
    mock_role: Optional[str] = None
):
    user_info = None
    if mock_role or not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        role = mock_role if mock_role in ["admin", "premium", "black_diamond", "user"] else "user"
        user_info = {
            "email": f"{role}@mock.com",
            "name": f"Mock {role.capitalize()}",
            "picture": f"https://api.dicebear.com/7.x/bottts/svg?seed={role}"
        }
    else:
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")
        
        async with aiohttp.ClientSession() as session:
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code"
            }
            async with session.post(token_url, data=data) as resp:
                if resp.status != 200:
                    err_text = await resp.text()
                    logger.error(f"Failed to exchange Google OAuth code: {err_text}")
                    raise HTTPException(status_code=400, detail="Google authentication failed")
                token_data = await resp.json()
                access_token = token_data.get("access_token")
                
            userinfo_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
            async with session.get(userinfo_url) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Failed to retrieve user info")
                google_profile = await resp.json()
                user_info = {
                    "email": google_profile.get("email"),
                    "name": google_profile.get("name", google_profile.get("email")),
                    "picture": google_profile.get("picture", "https://api.dicebear.com/7.x/bottts/svg?seed=default")
                }
                
    if not user_info or not user_info.get("email"):
        raise HTTPException(status_code=400, detail="User email info unavailable")
        
    user = users_db.create_user(
        email=user_info["email"],
        name=user_info["name"],
        picture=user_info["picture"],
        role=mock_role if mock_role else "user"
    )
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.datetime.now() + datetime.timedelta(days=7)
    users_db.create_session(user["id"], token, expires_at)
    
    response = RedirectResponse(url="/")
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=604800,
        secure=SECURE_COOKIES
    )
    return response

@app.post("/api/auth/signup")
async def signup(payload: SignupModel):
    existing = users_db.get_user_by_email_or_username(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user = users_db.register_user(payload.email, payload.name, payload.password)
    logger.info(f"🔑 [SIGNUP] New user registration code for {payload.email}: {user.get('confirmation_code')}")
    
    # Send confirmation email
    email_dispatcher.send_confirmation_email(
        email=payload.email,
        name=payload.name,
        code=user.get("confirmation_code")
    )
    
    return {
        "status": "SUCCESS", 
        "message": "User registered. Confirmation email sent.", 
        "dev_code": user.get("confirmation_code"), 
        "email": payload.email
    }

@app.post("/api/auth/confirm-email")
async def confirm_email(payload: ConfirmEmailModel):
    success = users_db.confirm_email_code(payload.email, payload.code)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid confirmation code")
    return {"status": "SUCCESS", "message": "Email confirmed successfully"}

@app.post("/api/auth/login")
async def login(payload: LoginModel, response: Response):
    user = users_db.verify_user_credentials(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/username or password")
        
    if not user.get("email_confirmed"):
        raise HTTPException(
            status_code=403,
            detail="EMAIL_CONFIRMATION_REQUIRED"
        )
        
    token = secrets.token_urlsafe(32)
    expires_at = datetime.datetime.now() + datetime.timedelta(days=7)
    users_db.create_session(user["id"], token, expires_at)
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=604800,
        secure=SECURE_COOKIES
    )
    return {"status": "SUCCESS", "user": user}

@app.post("/api/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordModel):
    token = users_db.generate_reset_token(payload.email)
    if not token:
        raise HTTPException(status_code=400, detail="User not found")
    logger.info(f"🔑 [FORGOT PASSWORD] Reset code for {payload.email}: {token}")
    
    # Send password reset email
    email_dispatcher.send_password_reset_email(
        email=payload.email,
        token=token
    )
    
    return {"status": "SUCCESS", "message": "Password reset email sent", "dev_token": token}

@app.post("/api/auth/reset-password")
async def reset_password(payload: ResetPasswordModel):
    success = users_db.reset_password_with_token(payload.email, payload.token, payload.password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid reset token or email")
    return {"status": "SUCCESS", "message": "Password updated successfully"}

@app.get("/api/admin/system-stats")
async def get_system_stats(current_admin: dict = Depends(get_current_admin)):
    now_str = datetime.datetime.now().isoformat()
    # Clean up expired sessions first
    users_db.db_query("DELETE FROM sessions WHERE expires_at <= ?", (now_str,), commit=True)
    
    total_users = users_db.db_query("SELECT COUNT(*) as count FROM users", fetch="scalar")
    active_sessions = users_db.db_query("SELECT COUNT(*) as count FROM sessions", fetch="scalar")
    
    monitored_count = sum(len(v) for v in scanner.monitored_pairs.values())
    alerts_count = len(scanner.logs_history)
    
    return {
        "total_users": total_users,
        "active_sessions": active_sessions,
        "monitored_pairs": monitored_count,
        "alerts_dispatched": alerts_count,
        "scanner_status": "RUNNING" if scanner.is_running else "STOPPED"
    }

@app.post("/api/admin/users/{user_id}/confirm")
async def admin_confirm_user(user_id: str, payload: ConfirmUpdateModel, current_admin: dict = Depends(get_current_admin)):
    success = users_db.admin_confirm_user_email(user_id, payload.confirm)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update verification status")
    return {"status": "SUCCESS"}

@app.post("/api/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, payload: AdminPasswordResetModel, current_admin: dict = Depends(get_current_admin)):
    success = users_db.admin_reset_user_password(user_id, payload.password)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to reset password")
    return {"status": "SUCCESS"}

@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    if user_id == current_admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    success = users_db.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete user")
    return {"status": "SUCCESS"}

@app.post("/api/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Depends(get_session_token)):
    if session_token:
        users_db.delete_session(session_token)
    response = Response(content=json.dumps({"status": "SUCCESS"}), media_type="application/json")
    response.delete_cookie("session_token")
    return response

@app.get("/api/auth/user")
async def get_auth_user(current_user: dict = Depends(get_current_user)):
    user_copy = dict(current_user)
    user_copy.pop("password_hash", None)
    user_copy.pop("password_salt", None)
    user_copy["features"] = users_db.get_role_features(user_copy["role"])
    return user_copy

@app.get("/api/admin/features")
async def get_admin_features(current_admin: dict = Depends(get_current_admin)):
    all_features = users_db.get_all_role_features()
    # Return as dict keyed by role name for easy client-side lookup
    return {f["role"]: f for f in all_features}

@app.post("/api/admin/features/{role}")
async def update_admin_features(
    role: str,
    payload: FeatureUpdateModel,
    current_admin: dict = Depends(get_current_admin)
):
    if role not in ["admin", "premium", "black_diamond", "user"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    success = users_db.update_role_features(
        role=role,
        webhook_enabled=payload.webhook_enabled,
        deepseek_enabled=payload.deepseek_enabled,
        calculator_enabled=payload.calculator_enabled,
        ledger_enabled=payload.ledger_enabled,
        simulation_enabled=payload.simulation_enabled
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update features")
    return {"status": "SUCCESS"}

@app.get("/api/admin/users")
async def get_admin_users(current_admin: dict = Depends(get_current_admin)):
    return users_db.list_all_users()

@app.post("/api/admin/users/{user_id}/role")
async def update_user_role(user_id: str, payload: RoleUpdateModel, current_admin: dict = Depends(get_current_admin)):
    success = users_db.update_user_role(user_id, payload.role)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid role or user not found")
    return {"status": "SUCCESS"}

@app.get("/api/user/trades")
async def get_user_trades(current_user: dict = Depends(get_current_user)):
    return users_db.get_user_trades(current_user["id"])

@app.post("/api/user/trades")
async def add_user_trade(trade: TradeCreateModel, current_user: dict = Depends(get_current_user)):
    trade_id = users_db.add_trade(
        user_id=current_user["id"],
        ticker=trade.ticker,
        trade_type=trade.type,
        entry_price=trade.entry_price,
        exit_price=trade.exit_price,
        profit_pct=trade.profit_pct,
        notes=trade.notes
    )
    return {"status": "SUCCESS", "trade_id": trade_id}

@app.delete("/api/user/trades/{trade_id}")
async def delete_user_trade(trade_id: int, current_user: dict = Depends(get_current_user)):
    success = users_db.delete_trade(current_user["id"], trade_id)
    if not success:
        raise HTTPException(status_code=404, detail="Trade not found or not owned by user")
    return {"status": "SUCCESS"}

# Serve the static frontend dashboard
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
else:
    logger.warning(f"Frontend static directory not found at {frontend_path}. Please build frontend files.")
