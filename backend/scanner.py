import asyncio
import os
import json
import logging
import traceback
from backend.services.binance_ws import BinanceWSService
from backend.services.bybit_ws import BybitWSService
from backend.services.oi_service import OIService
from backend.services.coingecko_service import CoinGeckoService
from backend.engines.breakout import BreakoutEngine
from backend.engines.accumulation import AccumulationEngine
from backend.alerts.webhook import AlertService
from backend.ai.deepseek import AIService

logger = logging.getLogger("Orchestrator")

class QueueHandler(logging.Handler):
    def __init__(self, log_queue):
        super().__init__()
        self.log_queue = log_queue

    def emit(self, record):
        msg = self.format(record)
        if self.log_queue:
            self.log_queue.put_nowait(msg)

class AutonomousScanner:
    def __init__(self, state_path=None, log_queue=None, alert_callback=None, result_callback=None):
        self.state_path = state_path or os.path.join(os.path.dirname(__file__), "..", "state.json")
        self.log_queue = log_queue
        
        if self.log_queue:
            qh = QueueHandler(self.log_queue)
            qh.setFormatter(logging.Formatter('ℹ️ [%(asctime)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S'))
            logger.addHandler(qh)
            logging.getLogger("BinanceWS").addHandler(qh)
            logging.getLogger("BybitWS").addHandler(qh)
            logging.getLogger("BreakoutEngine").addHandler(qh)
            logging.getLogger("AccumulationEngine").addHandler(qh)
        
        self.settings = {
            "interval_sec": 60,
            "volume_multiplier": 1.8,
            "price_velocity_pct": 0.8,
            "active": False,
            "accum_score_threshold": 25,
            "accum_alert_threshold": 50,
        }
        self.load_state()
        
        self.is_running = False
        
        # Instantiate Core Services
        # Map main.py's result_callback to the AlertService's dispatch
        self.alert_service = AlertService(self.settings, alert_callback=result_callback)
        self.ai_service = AIService(self.settings)
        
        self.accumulation_engine = AccumulationEngine(self.settings, self.alert_service)
        self.breakout_engine = BreakoutEngine(self.settings, self.alert_service)
        
        self.binance_ws = BinanceWSService(self.breakout_engine, self.accumulation_engine)
        self.bybit_ws = BybitWSService(self.breakout_engine, self.accumulation_engine)
        self.oi_service = OIService()
        self.coingecko_service = CoinGeckoService()
        
        # In this new architecture, AI happens asynchronously via the alert service callback, or we can patch the alert service.
        # Let's inject AI into the Breakout alert pipeline
        async def enhanced_breakout_dispatch(exchange, data):
            logger.info(f"Triggering AI Analysis for {data['symbol']}...")
            ai_note = await self.ai_service.analyze_signal(data)
            data["ai_analysis"] = ai_note
            # Now send to standard alert service
            await self.alert_service._dispatch({"type": "SCAN_RESULT", "data": data})
            await self.alert_service._send_webhook("BREAKOUT", data)
            
        self.breakout_engine.alert_service.dispatch_breakout = enhanced_breakout_dispatch
        
    def load_state(self):
        try:
            if os.path.exists(self.state_path):
                with open(self.state_path, "r") as f:
                    state = json.load(f)
                    self.settings.update(state.get("settings", {}))
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")

    def save_state(self):
        try:
            state = {"settings": self.settings}
            with open(self.state_path, "w") as f:
                json.dump(state, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")

    def update_settings(self, new_settings):
        self.settings.update(new_settings)
        self.save_state()
        
    def log(self, message, level=logging.INFO):
        if level == logging.WARNING:
            logger.warning(message)
        elif level == logging.ERROR:
            logger.error(message)
        else:
            logger.info(message)
        
    def start(self):
        if self.is_running:
            return
        self.is_running = True
        
        asyncio.create_task(self.binance_ws.start())
        asyncio.create_task(self.bybit_ws.start())
        asyncio.create_task(self.oi_service.start())
        asyncio.create_task(self.coingecko_service.start())
        
        logger.info("Scanner Orchestrator started all real-time services.")

    def stop(self):
        self.is_running = False
        self.binance_ws.stop()
        self.bybit_ws.stop()
        self.oi_service.stop()
        self.coingecko_service.stop()
        logger.info("Scanner Orchestrator stopped all services.")

    @property
    def sequential_mode(self):
        return False

    @property
    def monitored_pairs(self):
        try:
            from backend.cache.markets import TRACKED_MARKETS
            return TRACKED_MARKETS
        except ImportError:
            return {"binance": [], "bybit": []}

    @property
    def logs_history(self):
        return [
            "[SYSTEM] Autonomous Orchestrator running via WebSocket layer...",
            "[SYSTEM] AI Engines Initialized"
        ]

    @property
    def last_scan_results(self):
        return []

    @property
    def accumulation_candidates(self):
        return []

    async def evaluate_multi_provider_decision(self, symbol, provider):
        data = {
            "symbol": symbol, 
            "exchange": "auto", 
            "price": 0, 
            "volume_multiplier": 0
        }
        
        # Override settings temporarily to use requested provider
        old_provider = self.settings.get("llm_provider")
        self.settings["llm_provider"] = provider
        
        ai_note = await self.ai_service.analyze_signal(data)
        
        self.settings["llm_provider"] = old_provider
        
        decision_str = str(ai_note).upper()
        decision = "LONG" if "LONG" in decision_str else "HOLD"
        
        return {
            "decision": decision,
            "conviction": 85 if decision == "LONG" else 50,
            "target": 0.0,
            "stop": 0.0,
            "explanation": ai_note,
            "setup": "Automated Setup via WebSocket AI Service",
            "provider": provider
        }
