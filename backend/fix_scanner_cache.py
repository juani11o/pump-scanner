import re

filepath = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/backend/scanner.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add get_cached_markets and get_cached_ohlcv
# We can insert them right after close_exchanges

methods_to_insert = '''
    async def get_cached_markets(self, exchange_name, exchange):
        now = time.time()
        # 30-minute cache TTL
        if exchange_name in self.market_cache and (now - self.market_cache_timestamp.get(exchange_name, 0)) < 1800:
            return self.market_cache[exchange_name]
            
        markets = await exchange.fetch_markets()
        self.market_cache[exchange_name] = markets
        self.market_cache_timestamp[exchange_name] = now
        return markets

    async def get_cached_ohlcv(self, exchange_name, symbol, limit=50, timeframe='5m'):
        """Phase 5: OHLCV Cache mechanism.
        Caches OHLCV data for 15-60 seconds (default 30s) to prevent redundant fetches within the same scan cycle."""
        cache_key = f"{exchange_name}:{symbol}"
        now = time.time()
        
        # 30s TTL for OHLCV cache
        if cache_key in self.ohlcv_cache:
            cache_entry = self.ohlcv_cache[cache_key]
            if (now - cache_entry['timestamp']) < 30:
                return cache_entry['data']
                
        exchange = await self.get_exchange(exchange_name)
        
        # Phase 6: Pass through semaphore
        if self.scan_semaphore is None:
            self.scan_semaphore = asyncio.Semaphore(self.concurrency_limit)
            
        async with self.scan_semaphore:
            ohlcv = await exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            
        self.ohlcv_cache[cache_key] = {
            'timestamp': now,
            'data': ohlcv
        }
        return ohlcv
'''

content = content.replace(
    '    async def initialize_discovery(self):',
    methods_to_insert + '\n    async def initialize_discovery(self):'
)

# 2. Modify initialize_discovery to be non-blocking and use get_cached_markets
discovery_pattern = r'''    async def initialize_discovery\(self\):
        """Stage 1: Exchange Gating & Asset Discovery"""
        self\.log\("Stage 1: Initializing exchange discovery pipeline\.\.\."\)
        new_monitored = \{\}'''

discovery_replacement = r'''    async def initialize_discovery(self):
        """Stage 1: Exchange Gating & Asset Discovery (Phase 3 Refactor)"""
        now = time.time()
        if now - self.discovery_timestamp < 1800 and self.monitored_pairs:
            return # Skip if ran recently and we have data

        self.log("Stage 1: Initializing exchange discovery pipeline...")
        new_monitored = {}
        
        if self.scan_semaphore is None:
            self.scan_semaphore = asyncio.Semaphore(self.concurrency_limit)'''

content = re.sub(discovery_pattern, discovery_replacement, content)

content = content.replace('markets = await exchange.fetch_markets()', 'async with self.scan_semaphore:\n                        markets = await self.get_cached_markets(ex_name, exchange)')
content = content.replace('tickers = await exchange.fetch_tickers()', 'async with self.scan_semaphore:\n                            tickers = await exchange.fetch_tickers()')

# 3. Preserve monitored_pairs on failure
preservation_pattern = r'''        if new_monitored:
            self\.monitored_pairs = new_monitored
            self\.save_state\(\)'''

preservation_replacement = r'''        if new_monitored:
            self.monitored_pairs = new_monitored
            self.discovery_timestamp = time.time()
            self.save_state()
        else:
            self.log("Discovery failed to find pairs. Retaining previous monitored list.", level=logging.WARNING)'''

content = re.sub(preservation_pattern, preservation_replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File patched successfully: Caching and Discovery.")
