import logging
import pandas as pd
from datetime import datetime, timezone
from backend.cache.candles import candle_cache
from backend.engines.indicators import compute_rsi, compute_bollinger_bands, compute_cvd

logger = logging.getLogger("AccumulationEngine")

class AccumulationEngine:
    def __init__(self, settings, alert_service):
        self.settings = settings
        self.alert_service = alert_service
        self.candidates = {}

    async def evaluate(self, exchange: str, symbol: str):
        candles = candle_cache.get_candles(exchange, symbol)
        if len(candles) < 30:
            return None
            
        df = pd.DataFrame(candles)
        
        # Calculate Indicators
        df['rsi'] = compute_rsi(df['close'])
        upper, lower = compute_bollinger_bands(df['close'])
        df['bb_upper'] = upper
        df['bb_lower'] = lower
        df['cvd'] = compute_cvd(df)
        
        latest = df.iloc[-1]
        
        score = 0.0
        signals = {
            "volume_coiling": 0.0,
            "bb_squeeze": 0.0,
            "cvd_divergence": 0.0,
            "rsi_reclamation": 0.0,
            "support_zone": 0.0
        }
        
        # 1. Volume Coiling
        recent_vol = df['volume'].iloc[-10:].mean()
        older_vol = df['volume'].iloc[-30:-10].mean()
        if older_vol > 0 and recent_vol < older_vol * 0.5:
            score += 15
            signals["volume_coiling"] = round(((older_vol - recent_vol) / older_vol) * 100, 2)
            
        # 2. Bollinger Band Squeeze
        bb_width = (latest['bb_upper'] - latest['bb_lower']) / latest['close']
        if bb_width < 0.02:
            score += 20
            signals["bb_squeeze"] = round(bb_width * 100, 2)
            
        # 3. CVD Divergence (Price flat/down, CVD up)
        price_trend = df['close'].iloc[-1] - df['close'].iloc[-10]
        cvd_trend = df['cvd'].iloc[-1] - df['cvd'].iloc[-10]
        if price_trend <= 0 and cvd_trend > 0:
            score += 25
            signals["cvd_divergence"] = round(cvd_trend, 2)
            
        # 4. RSI Reclamation
        if df['rsi'].iloc[-5:-1].min() < 30 and latest['rsi'] > 40:
            score += 15
            signals["rsi_reclamation"] = round(latest['rsi'], 2)
            
        # 5. Support Zone
        recent_low = df['low'].iloc[-20:].min()
        if (latest['close'] - recent_low) / recent_low < 0.03:
            score += 10
            signals["support_zone"] = 10.0
            
        accum_data = {
            "symbol": symbol,
            "exchange": exchange,
            "accum_score": round(score, 1),
            "accum_status": "ACCUMULATING" if score >= self.settings.get("accum_alert_threshold", 50) else "QUIET",
            "signals": signals
        }
        
        # Track Candidates
        if score >= self.settings.get("accum_score_threshold", 25):
            if symbol not in self.candidates:
                accum_data["first_detected"] = datetime.now(timezone.utc).isoformat()
            else:
                accum_data["first_detected"] = self.candidates[symbol]["first_detected"]
            self.candidates[symbol] = accum_data
            
            # Fire Alert if crossing threshold
            if score >= self.settings.get("accum_alert_threshold", 50):
                await self.alert_service.dispatch_accumulation(exchange, accum_data)
        else:
            if symbol in self.candidates:
                del self.candidates[symbol]
                
        return accum_data
