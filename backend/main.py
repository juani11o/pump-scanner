import asyncio
import sys

# Windows-specific SSL handshake socket reset fix
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
import json
import logging
import random
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd

from backend.scanner import AutonomousScanner

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

scanner = AutonomousScanner(log_queue=log_queue, alert_callback=on_alert_detected)

class SettingsModel(BaseModel):
    webhook_url: str
    deepseek_api_key: str = ""
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

@app.on_event("startup")
async def startup_event():
    # If scanner was marked active in persistent settings, start it automatically (State Memory Recovery)
    if scanner.settings.get("active", False):
        logger.info("[STARTUP] Auto-starting scanning loop based on saved state...")
        scanner.start()
        
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
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    active_ws_connections.append(websocket)
    
    # Send current logs history and system status instantly
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
            # Keep connection alive, listen for client-side ping or stop message
            data = await websocket.receive_text()
            # If client requests a state refresh
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
async def get_status():
    return {
        "active": scanner.is_running,
        "settings": scanner.settings,
        "monitored_count": sum(len(v) for v in scanner.monitored_pairs.values()),
        "sequential_mode": scanner.sequential_mode
    }

@app.post("/api/settings")
async def update_settings(settings: SettingsModel):
    was_running = scanner.is_running
    if was_running:
        scanner.stop()
        
    scanner.update_settings(settings.dict())
    
    if was_running:
        scanner.start()
        
    return {"status": "SUCCESS", "settings": scanner.settings}

@app.post("/api/start")
async def start_scanner():
    success = scanner.start()
    if success:
        return {"status": "SUCCESS", "message": "Scanner started successfully."}
    else:
        return {"status": "ALREADY_RUNNING", "message": "Scanner is already running."}

@app.post("/api/stop")
async def stop_scanner():
    success = scanner.stop()
    if success:
        return {"status": "SUCCESS", "message": "Scanner stopped successfully."}
    else:
        return {"status": "ALREADY_STOPPED", "message": "Scanner is already stopped."}

@app.get("/api/logs")
async def get_logs():
    return {"logs": scanner.logs_history}

@app.get("/api/pairs_summary")
async def get_pairs_summary():
    # Return last scan results
    return {"results": scanner.last_scan_results}

@app.get("/api/accumulation-candidates")
async def get_accumulation_candidates():
    """Returns the current ranked list of Stage 0 pre-pump accumulation candidates"""
    return {"candidates": scanner.accumulation_candidates}

@app.get("/api/discovery")
async def get_discovery():
    return {"monitored_pairs": scanner.monitored_pairs}

@app.post("/api/trigger_accum_simulation")
async def trigger_accum_simulation():
    """Generates a mock Stage 0 accumulation candidate to test the Accumulation Radar UI"""
    symbols = ["HYPE/USDC:USDC", "SOL/USDC:USDC", "WIF/USDC:USDC", "PEPE/USDC:USDC", "ARB/USDC:USDC"]
    symbol = random.choice(symbols)

    # Simulate individual signal scores
    s1 = round(random.uniform(12.0, 28.0), 2)   # Volume Coiling (max 30)
    s2 = round(random.uniform(8.0, 22.0), 2)    # BB Squeeze (max 25)
    s3 = round(random.uniform(5.0, 18.0), 2)    # CVD Divergence (max 20)
    s4 = round(random.uniform(4.0, 14.0), 2)    # RSI Reclamation (max 15)
    s5 = round(random.uniform(2.0, 9.0), 2)     # Support Zone (max 10)
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
async def trigger_simulation():
    """Generates a mock Stage 3 breakout to test webhook flow and dashboard visuals"""
    symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "DOGE/USDT", "AVAX/USDT", "LINK/USDT", "ADA/USDT", "NEAR/USDT"]
    symbol = random.choice(symbols)
    
    vol_mult = round(random.uniform(3.5, 8.5), 2)
    price_change = round(random.uniform(1.6, 4.8), 2)
    price_sim = round(random.uniform(0.8, 500.0), 4)
    price_change_abs = round(price_sim * price_change / 100, 6)
    oi_delta = round(random.uniform(8.0, 28.5), 2)
    sentiment_score = round(random.uniform(0.68, 0.96), 2)
    
    # Formula: (0.4 * min(vol_mult, 10)) + (0.3 * min(oi_delta, 20)) + (0.3 * (sentiment_score * 10))
    comp_vol = 0.4 * min(vol_mult, 10.0)
    comp_oi = 0.3 * min(oi_delta, 20.0)
    comp_sent = 0.3 * (sentiment_score * 10.0)
    compound_score = round((comp_vol + comp_oi + comp_sent) * 10, 1)
    
    # Generate mock CoinGecko data
    mock_mcap = random.randint(50000000, 2000000000)
    mock_rank = random.randint(10, 350)
    
    # Generate mock agent reasoning
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
    
    # Dispatch in the background
    asyncio.create_task(scanner.dispatch_webhook(payload))
    
    # Broadcast simulation alert info directly to websocket clients
    if active_ws_connections:
        alert_payload = json.dumps({"type": "ALERT", "data": payload})
        for connection in active_ws_connections:
            try:
                await connection.send_text(alert_payload)
            except Exception:
                pass
                
    return {"status": "SUCCESS", "message": "Simulation alert fired.", "data": payload}

# Serve the static frontend dashboard
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
else:
    logger.warning(f"Frontend static directory not found at {frontend_path}. Please build frontend files.")
