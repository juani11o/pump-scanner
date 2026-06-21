import json
import logging
import asyncio
import aiohttp

logger = logging.getLogger("AlertService")

class AlertService:
    def __init__(self, settings, alert_callback=None):
        self.settings = settings
        self.alert_callback = alert_callback
        
    async def dispatch_breakout(self, exchange: str, data: dict):
        payload = {"type": "SCAN_RESULT", "data": data}
        await self._dispatch(payload)
        await self._send_webhook("BREAKOUT", data)
        
    async def dispatch_accumulation(self, exchange: str, data: dict):
        payload = {"type": "ACCUM_ALERT", "data": data}
        await self._dispatch(payload)
        
    async def _dispatch(self, payload: dict):
        if self.alert_callback:
            res = self.alert_callback(payload)
            if asyncio.iscoroutine(res):
                await res
            
    async def _send_webhook(self, event_type: str, data: dict):
        if not self.settings.get("webhook_enabled", False):
            return
            
        url = self.settings.get("webhook_url")
        if not url:
            return
            
        payload = {
            "event": event_type,
            "data": data
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=5) as resp:
                    if resp.status == 200:
                        logger.info(f"Webhook dispatched successfully for {event_type}")
        except Exception as e:
            logger.error(f"Webhook delivery failed: {e}")
