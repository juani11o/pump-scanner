import logging
from backend.cache.candles import candle_cache

logger = logging.getLogger("BreakoutEngine")

class BreakoutEngine:
    def __init__(self, settings, alert_service):
        self.settings = settings
        self.alert_service = alert_service

    async def evaluate(self, exchange: str, symbol: str):
        candles = candle_cache.get_candles(exchange, symbol)
        if len(candles) < 3:
            return None
            
        # We need at least 2 completed candles + 1 current candle
        v_avg = sum([c['volume'] for c in candles[:-2]]) / max(1, len(candles) - 2)
        last_completed_vol = candles[-2]['volume']
        current_vol = candles[-1]['volume']
        effective_vol = max(current_vol, last_completed_vol)
        
        close_now = candles[-1]['close']
        close_prev_2 = candles[-3]['close']
        
        if close_prev_2 == 0:
            return None
            
        price_change = ((close_now - close_prev_2) / close_prev_2) * 100
        price_change_abs = close_now - close_prev_2
        vol_multiplier = float(effective_vol / v_avg if v_avg > 0 else 0.0)
        
        vol_threshold = float(self.settings.get("volume_multiplier", 1.8))
        price_threshold = float(self.settings.get("price_velocity_pct", 0.8))
        
        is_breakout = bool(vol_multiplier > vol_threshold and price_change > price_threshold)
        
        ticker_data = {
            "symbol": symbol,
            "price": float(close_now),
            "volume_multiplier": float(round(vol_multiplier, 2)),
            "price_change_2vec": float(round(price_change, 2)),
            "price_change_abs": float(round(price_change_abs, 6)),
            "current_volume": float(round(effective_vol, 2)),
            "average_volume": float(round(v_avg, 2)),
            "is_breakout": is_breakout,
            "exchange": exchange
        }
        
        if is_breakout:
            logger.warning(f"🚨 BREAKOUT on {exchange.upper()} {symbol}! Volume: {vol_multiplier:.2f}x. Price Change: {price_change:.2f}%")
            await self.alert_service.dispatch_breakout(exchange, ticker_data)
            
        return ticker_data
