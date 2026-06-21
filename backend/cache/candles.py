from collections import deque
import threading

class CandleCache:
    def __init__(self, maxlen=100):
        self.maxlen = maxlen
        # format: { "binance": { "BTCUSDT": deque([...]) } }
        self._cache = {}
        self._lock = threading.Lock()

    def add_candle(self, exchange: str, symbol: str, candle: dict):
        """
        candle should be a dictionary with at least:
        { 'timestamp': ..., 'open': ..., 'high': ..., 'low': ..., 'close': ..., 'volume': ... }
        """
        with self._lock:
            if exchange not in self._cache:
                self._cache[exchange] = {}
            if symbol not in self._cache[exchange]:
                self._cache[exchange][symbol] = deque(maxlen=self.maxlen)
            
            # If the timestamp matches the last candle, update it (it's the same incomplete candle)
            # Otherwise append
            q = self._cache[exchange][symbol]
            if len(q) > 0 and q[-1]['timestamp'] == candle['timestamp']:
                q[-1] = candle
            else:
                q.append(candle)

    def get_candles(self, exchange: str, symbol: str) -> list:
        with self._lock:
            if exchange in self._cache and symbol in self._cache[exchange]:
                return list(self._cache[exchange][symbol])
            return []

candle_cache = CandleCache(maxlen=100)
