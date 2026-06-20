import re

filepath = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/backend/scanner.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handle_runtime_fault to use traceback
fault_pattern = r'''        self\.log\(f"CRITICAL FAULT inside \[\{context\}\]: \{str\(exception\)\}", level=logging\.ERROR\)'''
fault_replacement = r'''        self.log(f"CRITICAL FAULT inside [{context}]: {traceback.format_exc()}", level=logging.ERROR)'''
content = re.sub(fault_pattern, fault_replacement, content)

# 2. Add start() HTTP session init and stop() HTTP session close
start_pattern = r'''    def start\(self\):
        if self\.is_running:'''
start_replacement = r'''    def start(self):
        if self.is_running:'''
# wait, actually start is not async. We can't init aiohttp.ClientSession outside of an async function easily.
# We should init it in scanner_main_loop instead.
main_loop_pattern = r'''    async def scanner_main_loop\(self\):
        self\.is_running = True
        self\.log\("Autonomous Scanner main loop started\."\)'''
main_loop_replacement = r'''    async def scanner_main_loop(self):
        self.is_running = True
        if self.http_session is None:
            self.http_session = aiohttp.ClientSession()
        self.log("Autonomous Scanner main loop started.")'''
content = re.sub(main_loop_pattern, main_loop_replacement, content)

close_exchanges_pattern = r'''        for name, client in clients:
            try:
                await client\.close\(\)
            except Exception as e:
                logger\.error\(f"Error closing exchange \{name\}: \{e\}"\)'''
close_exchanges_replacement = r'''        for name, client in clients:
            try:
                await client.close()
            except Exception as e:
                logger.error(f"Error closing exchange {name}: {e}")
        if self.http_session:
            await self.http_session.close()
            self.http_session = None'''
content = re.sub(close_exchanges_pattern, close_exchanges_replacement, content)

# 3. Update Social Sentiment and CoinGecko to use self.http_session
sentiment_pattern = r'''            async with aiohttp\.ClientSession\(\) as session:
                async with session\.get\(url, headers=headers, timeout=10\) as resp:'''
sentiment_replacement = r'''            session = self.http_session if self.http_session else aiohttp.ClientSession()
            async with session.get(url, headers=headers, timeout=10) as resp:'''
content = re.sub(sentiment_pattern, sentiment_replacement, content)

coingecko_search_pattern = r'''            async with aiohttp\.ClientSession\(\) as session:
                async with session\.get\(search_url, timeout=5\) as resp:'''
coingecko_search_replacement = r'''            session = self.http_session if self.http_session else aiohttp.ClientSession()
            async with session.get(search_url, timeout=5) as resp:'''
content = re.sub(coingecko_search_pattern, coingecko_search_replacement, content)

webhook_pattern = r'''        try:
            async with aiohttp\.ClientSession\(\) as session:
                async with session\.post\(url, json=payload, timeout=10\) as resp:'''
webhook_replacement = r'''        try:
            session = self.http_session if self.http_session else aiohttp.ClientSession()
            async with session.post(url, json=payload, timeout=10) as resp:'''
content = re.sub(webhook_pattern, webhook_replacement, content)

deepseek_pattern = r'''        try:
            async with aiohttp\.ClientSession\(\) as session:
                async with session\.post\(url, json=payload, headers=headers, timeout=10\) as resp:'''
deepseek_replacement = r'''        try:
            session = self.http_session if self.http_session else aiohttp.ClientSession()
            async with session.post(url, json=payload, headers=headers, timeout=10) as resp:'''
content = re.sub(deepseek_pattern, deepseek_replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File patched successfully: HTTP Session and Diagnostics.")
