# 🚀 JAGL Crypto PUMP SCANNER v2.2.0

A real-time, autonomous cryptocurrency pump detection terminal with a **Stage 0 Accumulation Radar** — predicting pumps *before* they happen.

![Dashboard](https://img.shields.io/badge/status-active-brightgreen) ![Python](https://img.shields.io/badge/python-3.10+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green) ![License](https://img.shields.io/badge/license-MIT-purple)

---

## ✨ Features

### Stage 0 — Accumulation Radar (Pre-Pump Prediction)
Detects smart money accumulation **before** price/volume explodes using 5 independent signals:

| Signal | Max Score | What It Detects |
|---|---|---|
| **Volume Coiling** | 30 | Volume stepping up quietly across 4 rolling windows |
| **BB Squeeze** | 25 | Bollinger Band width compressing below average |
| **CVD Divergence** | 20 | Buy-side aggression > sell-side on flat price |
| **RSI Reclamation** | 15 | RSI building from 28–60 while price is flat |
| **Support Zone Defense** | 10 | Price bouncing repeatedly off same floor |

**Score thresholds:** `WATCHING ≥55` → `COILING ≥70` → `PRE-PUMP ≥85`

### Stage 2 — Breakout Gatekeeper
Fires confirmed breakout alerts when:
- Current 5m candle volume > **3x** rolling average
- Price velocity > **1.5%** over last 2 candles

### Stage 3 — Deep Enrichment
On confirmed breakout, fetches:
- **Open Interest Delta** (futures OI change %)
- **Reddit Sentiment** (VADER NLP on last 20 posts)
- **CoinGecko** market cap & rank

### Stage 4 — AI Agent Decision Layer
Optional **DeepSeek V3** integration for breakout confirmation with reasoning in English & Spanish.

---

## 🖥️ Dashboard

- **4-column cyberpunk terminal UI** (Control Deck / Breakout Radar / Accum Radar / Live Watchlist)
- Real-time WebSocket log streaming
- Live TradingView chart integration
- Light/Dark mode + EN/ES localization
- Pipeline schematic with animated stage flow

---

## 📦 Installation

### Requirements
- Python 3.10+
- pip

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/crypto-pump-scanner.git
cd crypto-pump-scanner

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

---

## 🚀 Running Locally

```bash
# Windows (double-click or run in terminal)
Start_Scanner.bat

# Or manually with uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open **http://localhost:8000** in your browser.

---

## ⚙️ Configuration

All settings are configured through the dashboard UI and saved to `state.json` (excluded from git).

| Setting | Default | Description |
|---|---|---|
| Exchanges | hyperliquid | binance, bybit, hyperliquid |
| Instruments | future | spot, future |
| Scan Interval | 60s | Seconds between scan cycles |
| Max Pairs | 50 | Top pairs by 24h volume to scan |
| Vol Multiplier Gate | 3.0x | Volume threshold for breakout |
| Price Velocity Gate | 1.5% | Price change threshold |
| Accum Score Threshold | 55 | Min score to appear in Accum Radar |
| Accum Alert Threshold | 70 | Min score to fire webhook alert |

### Optional: DeepSeek AI Agent
Add your [DeepSeek API key](https://platform.deepseek.com/) in the dashboard to enable the AI decision layer.

### Webhook Alerts
Set any webhook URL (Discord, Telegram bot, Make.com, n8n) to receive JSON payloads:

**Breakout alert** (`status: PUMP_TRIGGERED`):
```json
{
  "timestamp": "2026-06-14T20:00:00Z",
  "exchange": "binance",
  "ticker": "SOL/USDT",
  "status": "PUMP_TRIGGERED",
  "metrics": {
    "volume_multiplier": 4.2,
    "price_velocity_2vec": 2.1,
    "open_interest_delta_pct": 14.5,
    "vader_sentiment_score": 0.78,
    "compound_score": 76.4
  }
}
```

**Accumulation alert** (`status: PRE_PUMP_CANDIDATE`):
```json
{
  "ticker": "HYPE/USDC:USDC",
  "status": "PRE_PUMP_CANDIDATE",
  "accum_status": "COILING",
  "accum_score": 72.3,
  "signals": {
    "volume_coiling": 22.0,
    "bb_squeeze": 18.5,
    "cvd_divergence": 14.0,
    "rsi_reclamation": 12.8,
    "support_zone": 5.0
  }
}
```

---

## 🌐 Deploying to Render (Free)

1. Fork this repo
2. Sign up at [render.com](https://render.com)
3. **New Web Service** → connect your fork
4. Settings:
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Deploy → get your public URL

---

## 🏗️ Architecture

```
[ STAGE 0: Accumulation Radar ]  ← Pre-pump prediction (runs every cycle)
       ↓ Score ≥ 55 → Candidate | ≥ 70 → Alert
[ STAGE 1: Asset Discovery ]     ← ccxt market fetch (1x per session)
       ↓
[ STAGE 2: Breakout Gatekeeper ] ← Vol > 3x AND Price > 1.5% (every cycle)
       ↓ On breakout only
[ STAGE 3: Deep Enrichment ]     ← OI delta + Reddit sentiment + CoinGecko
       ↓ Compound score ≥ 65
[ STAGE 4: AI Agent + Dispatch ] ← DeepSeek decision → Webhook
```

---

## 📄 License

MIT — free to use, modify, and deploy.
