import re
import os

filepath = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/backend/scanner.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = re.sub(
    r'self\.live_results = \{\}\s+self\.save_state\(\)',
    r'''self.live_results = {}
        # Stage 0: Accumulation Radar state
        self.accumulation_candidates = []  # Ranked list of pre-pump candidates
        self.accum_first_detected = {}     # symbol -> ISO timestamp of first detection
        
        # New State Caches & Connections
        self.http_session = None
        self.exchange_health = {}
        self.market_cache = {}
        self.market_cache_timestamp = {}
        self.ohlcv_cache = {}
        self.discovery_timestamp = 0
        self.scan_semaphore = None
        self.concurrency_limit = self.settings.get("scan_concurrency", 12)
        
        self.load_state()

    def log(self, message, level=logging.INFO):
        formatted_time = time.strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{formatted_time}] {message}"
        if level == logging.WARNING:
            log_entry = f"⚠️ {log_entry}"
            logger.warning(message)
        elif level == logging.ERROR:
            log_entry = f"❌ {log_entry}"
            logger.error(message)
        else:
            log_entry = f"ℹ️ {log_entry}"
            logger.info(message)
            
        self.logs_history.append(log_entry)
        if len(self.logs_history) > 500:
            self.logs_history.pop(0)
            
        if self.log_queue:
            self.log_queue.put_nowait(log_entry)

    def load_state(self):
        """State Memory Recovery Protocol (Stage 4.2)"""
        try:
            if os.path.exists(self.state_path):
                with open(self.state_path, "r") as f:
                    state = json.load(f)
                    self.settings.update(state.get("settings", {}))
                    self.monitored_pairs = state.get("monitored_pairs", {})
                    self.oi_cache = state.get("oi_cache", {})
                self.log("State memory loaded successfully from state.json.")
            else:
                self.log("No previous state found. Initializing defaults.")
        except Exception as e:
            self.log(f"Failed to load state: {e}", level=logging.WARNING)

    def save_state(self):
        """Persist state locally (Stage 4.2)"""
        try:
            state = {
                "settings": self.settings,
                "monitored_pairs": self.monitored_pairs,
                "oi_cache": self.oi_cache
            }
            with open(self.state_path, "w") as f:
                json.dump(state, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")

    def update_settings(self, new_settings):
        self.settings.update(new_settings)
        self.monitored_pairs = {}  # Force re-discovery on next cycle
        self.save_state()''',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("File patched successfully.")
