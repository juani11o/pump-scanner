import asyncio
import logging
import aiohttp
from backend.cache.markets import TRACKED_MARKETS

logger = logging.getLogger("OIService")

class OIService:
    def __init__(self):
        self.is_running = False
        self.oi_cache = {}

    async def start(self):
        self.is_running = True
        symbols = TRACKED_MARKETS.get("bybit", [])
        
        while self.is_running:
            try:
                if not symbols:
                    await asyncio.sleep(60)
                    continue
                    
                async with aiohttp.ClientSession() as session:
                    for symbol in symbols:
                        if not self.is_running:
                            break
                        url = f"https://api.bybit.com/v5/market/open-interest?category=linear&symbol={symbol}&intervalTime=5min"
                        try:
                            async with session.get(url, timeout=5) as resp:
                                if resp.status == 200:
                                    data = await resp.json()
                                    if data.get("result", {}).get("list"):
                                        oi = float(data["result"]["list"][0]["openInterest"])
                                        self.oi_cache[symbol] = oi
                        except Exception as e:
                            logger.debug(f"Failed to fetch OI for {symbol}: {e}")
                        
                        await asyncio.sleep(0.5) # rate limit protection
                        
            except Exception as e:
                logger.error(f"OIService error: {e}")
                
            # Wait 60 seconds before next OI sweep
            for _ in range(60):
                if not self.is_running:
                    break
                await asyncio.sleep(1)

    def stop(self):
        self.is_running = False
        
    def get_oi(self, symbol):
        return self.oi_cache.get(symbol, 0.0)
