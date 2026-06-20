import re

filepath = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/backend/scanner.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update scan_accumulation_signals fetching logic
accum_fetch_pattern = r'''            if ohlcv_data is not None and len\(ohlcv_data\) >= 20:
                ohlcv = ohlcv_data
            else:
                exchange = await self\.get_exchange\(exchange_name\)
                ohlcv = await exchange\.fetch_ohlcv\(symbol, timeframe='5m', limit=50\)'''
accum_fetch_replacement = r'''            if ohlcv_data is not None and len(ohlcv_data) >= 20:
                ohlcv = ohlcv_data
            else:
                ohlcv = await self.get_cached_ohlcv(exchange_name, symbol, timeframe='5m', limit=50)'''
content = re.sub(accum_fetch_pattern, accum_fetch_replacement, content)

# 2. Update scan_ticker_velocity fetching logic
ticker_fetch_pattern = r'''        try:
            exchange = await self\.get_exchange\(exchange_name\)
            ohlcv = await exchange\.fetch_ohlcv\(symbol, timeframe='5m', limit=50\)'''
ticker_fetch_replacement = r'''        try:
            ohlcv = await self.get_cached_ohlcv(exchange_name, symbol, timeframe='5m', limit=50)'''
content = re.sub(ticker_fetch_pattern, ticker_fetch_replacement, content)

# 3. Update Open Interest fetch logic (use scan_semaphore)
oi_market_pattern = r'''            markets = await exchange\.fetch_markets\(\)'''
oi_market_replacement = r'''            async with self.scan_semaphore:
                markets = await self.get_cached_markets(exchange_name, exchange)'''
content = re.sub(oi_market_pattern, oi_market_replacement, content)

oi_history_pattern = r'''                    oi_history = await exchange\.fetch_open_interest_history\(target_symbol, timeframe='5m', limit=5\)'''
oi_history_replacement = r'''                    async with self.scan_semaphore:
                        oi_history = await exchange.fetch_open_interest_history(target_symbol, timeframe='5m', limit=5)'''
content = re.sub(oi_history_pattern, oi_history_replacement, content)

oi_current_pattern = r'''                current_oi_data = await exchange\.fetch_open_interest\(target_symbol\)'''
oi_current_replacement = r'''                async with self.scan_semaphore:
                    current_oi_data = await exchange.fetch_open_interest(target_symbol)'''
content = re.sub(oi_current_pattern, oi_current_replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File patched successfully: OHLCV Caching Data Flow.")
