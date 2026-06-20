import re

filepath = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/backend/scanner.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

methods_to_insert = '''
    async def get_cached_markets(self, exchange_name, exchange):
        now = time.time()
        
        # Health Check
        health = self.exchange_health.get(exchange_name, {"failures": 0, "suspended_until": 0})
        if now < health["suspended_until"]:
            raise Exception(f"Exchange {exchange_name} is suspended due to repeated failures.")
            
        # 30-minute cache TTL
        if exchange_name in self.market_cache and (now - self.market_cache_timestamp.get(exchange_name, 0)) < 1800:
            return self.market_cache[exchange_name]
            
        try:
            markets = await exchange.fetch_markets()
            self.market_cache[exchange_name] = markets
            self.market_cache_timestamp[exchange_name] = now
            
            health["failures"] = 0
            self.exchange_health[exchange_name] = health
            return markets
        except Exception as e:
            health["failures"] += 1
            if health["failures"] >= 5:
                health["suspended_until"] = now + 300
                self.log(f"Exchange {exchange_name} suspended for 300s due to 5 consecutive failures.", level=logging.ERROR)
            self.exchange_health[exchange_name] = health
            raise e

    async def get_cached_ohlcv(self, exchange_name, symbol, limit=50, timeframe='5m'):
        """Phase 5: OHLCV Cache mechanism."""
        cache_key = f"{exchange_name}:{symbol}"
        now = time.time()
        
        # Health Check
        health = self.exchange_health.get(exchange_name, {"failures": 0, "suspended_until": 0})
        if now < health["suspended_until"]:
            raise Exception(f"Exchange {exchange_name} is suspended due to repeated failures.")
        
        # 30s TTL for OHLCV cache
        if cache_key in self.ohlcv_cache:
            cache_entry = self.ohlcv_cache[cache_key]
            if (now - cache_entry['timestamp']) < 30:
                return cache_entry['data']
                
        exchange = await self.get_exchange(exchange_name)
        
        # Phase 6: Pass through semaphore
        if self.scan_semaphore is None:
            self.scan_semaphore = asyncio.Semaphore(self.concurrency_limit)
            
        try:
            async with self.scan_semaphore:
                # CCXT.PRO Hybrid Upgrade (Phase 8): Check if exchange supports watch_ohlcv
                try:
                    if hasattr(exchange, 'has') and exchange.has.get('watchOHLCV'):
                        ohlcv = await exchange.watch_ohlcv(symbol, timeframe, limit=limit)
                    else:
                        ohlcv = await exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
                except Exception as pro_err:
                    self.log(f"WebSocket/Fetch failed on {exchange_name}: {pro_err}. Falling back.", level=logging.DEBUG)
                    ohlcv = await exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            
            self.ohlcv_cache[cache_key] = {
                'timestamp': now,
                'data': ohlcv
            }
            health["failures"] = 0
            self.exchange_health[exchange_name] = health
            return ohlcv
        except Exception as e:
            health["failures"] += 1
            if health["failures"] >= 5:
                health["suspended_until"] = now + 300
                self.log(f"Exchange {exchange_name} suspended for 300s due to 5 consecutive failures fetching OHLCV.", level=logging.ERROR)
            self.exchange_health[exchange_name] = health
            raise e

    async def initialize_discovery(self):'''

content = re.sub(r'\s+async def initialize_discovery\(self\):', '\n' + methods_to_insert, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Methods injected successfully.")
