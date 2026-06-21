import logging
import asyncio
from openai import AsyncOpenAI

logger = logging.getLogger("AIService")

class AIService:
    def __init__(self, settings):
        self.settings = settings

    async def analyze_signal(self, ticker_data: dict) -> str:
        provider = self.settings.get("llm_provider", "none").lower()
        if provider == "none" or not self.settings.get("deepseek_enabled", True):
            return "AI Analysis Disabled."
            
        api_key = self.settings.get("deepseek_api_key")
        if not api_key:
            return "AI Not Configured: Missing DeepSeek API Key."
            
        try:
            client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com/v1")
            
            prompt = f"""
            You are an expert crypto analyst. Analyze this breakout signal and provide a 2-sentence tactical recommendation.
            Symbol: {ticker_data.get('symbol')}
            Volume Spike: {ticker_data.get('volume_multiplier')}x
            Price Change: {ticker_data.get('price_change_2vec')}%
            """
            
            response = await client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are an elite crypto trading AI. Be extremely concise. No pleasantries."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI Analysis Failed: {e}")
            return "AI Analysis temporarily unavailable."
