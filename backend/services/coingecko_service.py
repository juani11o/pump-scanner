import asyncio
import logging
import aiohttp

logger = logging.getLogger("CoinGeckoService")

class CoinGeckoService:
    def __init__(self):
        self.is_running = False
        self.market_data = {}

    async def start(self):
        self.is_running = True
        while self.is_running:
            try:
                url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false"
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            for coin in data:
                                symbol = coin.get("symbol", "").upper() + "USDT"
                                self.market_data[symbol] = {
                                    "mcap": coin.get("market_cap", 0),
                                    "rank": coin.get("market_cap_rank", 999)
                                }
                            logger.info("CoinGecko market data refreshed.")
            except Exception as e:
                logger.error(f"CoinGecko Service error: {e}")
                
            # Wait 10 minutes
            for _ in range(600):
                if not self.is_running:
                    break
                await asyncio.sleep(1)

    def stop(self):
        self.is_running = False
        
    def get_data(self, symbol):
        return self.market_data.get(symbol, {})
