import asyncio
import json
import logging
import websockets
from backend.cache.markets import TRACKED_MARKETS
from backend.cache.candles import candle_cache

logger = logging.getLogger("BinanceWS")

class BinanceWSService:
    def __init__(self, breakout_engine, accumulation_engine):
        self.breakout_engine = breakout_engine
        self.accumulation_engine = accumulation_engine
        self.ws_url = "wss://stream.binance.com:9443/ws"
        self.is_running = False

    async def start(self):
        self.is_running = True
        symbols = TRACKED_MARKETS.get("binance", [])
        if not symbols:
            return
            
        # Create subscription payload
        params = [f"{sym.lower()}@kline_5m" for sym in symbols]
        
        while self.is_running:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    sub_msg = {
                        "method": "SUBSCRIBE",
                        "params": params,
                        "id": 1
                    }
                    await ws.send(json.dumps(sub_msg))
                    logger.info(f"Subscribed to {len(symbols)} Binance streams.")
                    
                    while self.is_running:
                        msg = await ws.recv()
                        data = json.loads(msg)
                        if "e" in data and data["e"] == "kline":
                            await self.handle_kline(data)
            except Exception as e:
                logger.error(f"Binance WS disconnected: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    def stop(self):
        self.is_running = False

    async def handle_kline(self, data):
        k = data["k"]
        symbol = k["s"]
        is_closed = k["x"]
        
        candle = {
            "timestamp": k["t"],
            "open": float(k["o"]),
            "high": float(k["h"]),
            "low": float(k["l"]),
            "close": float(k["c"]),
            "volume": float(k["v"])
        }
        
        # Add to cache
        candle_cache.add_candle("binance", symbol, candle)
        
        # Evaluate engines
        asyncio.create_task(self.breakout_engine.evaluate("binance", symbol))
        
        if is_closed:
            # Only evaluate accumulation when a candle closes to save CPU
            asyncio.create_task(self.accumulation_engine.evaluate("binance", symbol))
