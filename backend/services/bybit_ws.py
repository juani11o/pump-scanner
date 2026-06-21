import asyncio
import json
import logging
import websockets
from backend.cache.markets import TRACKED_MARKETS
from backend.cache.candles import candle_cache

logger = logging.getLogger("BybitWS")

class BybitWSService:
    def __init__(self, breakout_engine, accumulation_engine):
        self.breakout_engine = breakout_engine
        self.accumulation_engine = accumulation_engine
        self.ws_url = "wss://stream.bybit.com/v5/public/linear"
        self.is_running = False

    async def start(self):
        self.is_running = True
        symbols = TRACKED_MARKETS.get("bybit", [])
        if not symbols:
            return
            
        args = [f"kline.5.{sym}" for sym in symbols]
        
        while self.is_running:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    sub_msg = {
                        "op": "subscribe",
                        "args": args
                    }
                    await ws.send(json.dumps(sub_msg))
                    logger.info(f"Subscribed to {len(symbols)} Bybit streams.")
                    
                    while self.is_running:
                        msg = await ws.recv()
                        data = json.loads(msg)
                        if "topic" in data and data["topic"].startswith("kline.5"):
                            await self.handle_kline(data)
            except Exception as e:
                logger.error(f"Bybit WS disconnected: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    def stop(self):
        self.is_running = False

    async def handle_kline(self, data):
        for k in data.get("data", []):
            symbol = data["topic"].split(".")[-1]
            is_closed = k.get("confirm", False)
            
            candle = {
                "timestamp": int(k["start"]),
                "open": float(k["open"]),
                "high": float(k["high"]),
                "low": float(k["low"]),
                "close": float(k["close"]),
                "volume": float(k["volume"])
            }
            
            # Add to cache
            candle_cache.add_candle("bybit", symbol, candle)
            
            # Evaluate engines
            asyncio.create_task(self.breakout_engine.evaluate("bybit", symbol))
            
            if is_closed:
                asyncio.create_task(self.accumulation_engine.evaluate("bybit", symbol))
