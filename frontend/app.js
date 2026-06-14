// -------------------------------------------------------------------------- //
// CRYPTO PUMP SCANNER FRONTEND LOGIC                                         //
// -------------------------------------------------------------------------- //

document.addEventListener('DOMContentLoaded', () => {
    // API endpoint references
    const API_BASE = `${window.location.protocol}//${window.location.host}`;
    const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const WS_URL = `${WS_PROTOCOL}//${window.location.host}/api/ws/logs`;

    // DOM Elements - Status & Controls
    const scannerStatePulse = document.getElementById('scanner-state-pulse');
    const systemStatusText = document.getElementById('system-status-text');
    const trackedPairsCount = document.getElementById('tracked-pairs-count');
    const rateLimitStatus = document.getElementById('rate-limit-status');

    const btnStartScanner = document.getElementById('btn-start-scanner');
    const btnStopScanner = document.getElementById('btn-stop-scanner');
    const btnTriggerSimulation = document.getElementById('btn-trigger-simulation');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    
    // Theme & Language Toggles
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const btnLangToggle = document.getElementById('btn-lang-toggle');

    // DOM Elements - Configuration Form
    const configForm = document.getElementById('scanner-config-form');
    const inputWebhookUrl = document.getElementById('input-webhook-url');
    const inputDeepseekKey = document.getElementById('input-deepseek-key');
    const chkExchangeBinance = document.getElementById('chk-exchange-binance');
    const chkExchangeBybit = document.getElementById('chk-exchange-bybit');
    const chkExchangeHyperliquid = document.getElementById('chk-exchange-hyperliquid');
    const chkInstSpot = document.getElementById('chk-inst-spot');
    const chkInstFuture = document.getElementById('chk-inst-future');
    const inputIntervalSec = document.getElementById('input-interval-sec');
    const inputMaxPairs = document.getElementById('input-max-pairs');
    const inputVolumeThreshold = document.getElementById('input-volume-threshold');
    const inputPriceThreshold = document.getElementById('input-price-threshold');
    const btnSaveSettings = document.getElementById('btn-save-settings');

    // DOM Elements - Watchlist & Console
    const inputSearchPairs = document.getElementById('input-search-pairs');
    const watchlistTableBody = document.getElementById('watchlist-table-body');
    const consoleViewport = document.getElementById('console-viewport');

    // DOM Elements - Pipeline Schematic Nodes & Connectors
    const nodeDiscovery = document.getElementById('node-discovery');
    const nodeScan = document.getElementById('node-scan');
    const nodeEnrich = document.getElementById('node-enrich');
    const nodeWebhook = document.getElementById('node-webhook');
    const conn1 = document.getElementById('conn-1');
    const conn2 = document.getElementById('conn-2');
    const conn3 = document.getElementById('conn-3');

    // DOM Elements - Alerts Feed
    const alertsFeedContainer = document.getElementById('alerts-feed-container');
    const noAlertsPlaceholder = document.getElementById('no-alerts-placeholder');

    // DOM Elements - Accumulation Radar (Stage 0)
    const accumFeed            = document.getElementById('accum-feed');
    const accumPlaceholder     = document.getElementById('accum-placeholder');
    const accumCandidateCount  = document.getElementById('accum-candidate-count');
    const btnTriggerAccumSim   = document.getElementById('btn-trigger-accum-sim');
    const nodeAccum            = document.getElementById('node-accum');
    const conn0                = document.getElementById('conn-0');

    // State Variables
    let ws = null;
    let watchlistData = [];
    let wsReconnectInterval = 3000;
    let watchlistPollInterval = null;
    let accumPollInterval = null;

    // Sorting State
    let sortKey = 'symbol';
    let sortOrder = 'asc';

    // Theme Management
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (btnThemeToggle) {
            if (savedTheme === 'light') {
                document.body.classList.add('light-mode');
                btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            } else {
                document.body.classList.remove('light-mode');
                btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
        }
    }

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-mode');
            if (isLight) {
                localStorage.setItem('theme', 'light');
                btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            } else {
                localStorage.setItem('theme', 'dark');
                btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
            
            // Reload chart to apply theme
            const currentTicker = document.getElementById('current-chart-ticker');
            if (currentTicker && currentTicker.innerText !== 'NONE') {
                loadTradingViewChart(currentTicker.innerText);
            }
        });
    }

    // Language / Localization Management
    const translations = {
        en: {
            SYSTEM_STATUS: "SYSTEM_STATUS",
            TRACKED_PAIRS: "TRACKED_PAIRS",
            RATE_LIMIT: "RATE_LIMIT",
            CONTROL_DECK: "CONTROL_DECK",
            START_SCANNER: "START SCANNER",
            STOP_SCANNER: "STOP SCANNER",
            WEBHOOK_ALERT_URL: "WEBHOOK_ALERT_URL",
            EXCHANGES: "EXCHANGES",
            INSTRUMENTS: "INSTRUMENTS",
            SCAN_INTERVAL: "SCAN_INTERVAL (SEC)",
            MAX_PAIRS_TRACKED: "MAX_PAIRS_TRACKED",
            VOL_MULTIPLIER_GATE: "VOL_MULTIPLIER_GATE",
            PRICE_VELOCITY_GATE: "PRICE_VELOCITY_GATE",
            SAVE_CONFIGURATION: "SAVE_CONFIGURATION",
            INTELLIGENCE_SIMULATOR: "INTELLIGENCE_SIMULATOR",
            SIMULATOR_SUBTEXT: "Trigger a mock Stage 3 breakout to test alerts, metrics calculations, and webhook payload routing.",
            FIRE_SIMULATED_ALERT: "FIRE SIMULATED ALERT",
            BREAKOUT_RADAR: "BREAKOUT_RADAR",
            DISCOVERY: "DISCOVERY",
            GATING_SCAN: "GATING_SCAN",
            ENRICHMENT: "ENRICHMENT",
            DISPATCH: "DISPATCH",
            ACTIVE_BREAKOUTS_HEADER: "ACTIVE_BREAKOUT_ALERTS (SCORE ≥ 65/100)",
            NO_ACTIVE_BREAKOUTS: "NO ACTIVE BREAKOUTS DETECTED",
            AWAITING_BREAKOUTS: "Awaiting Stage 2 breakout metrics...",
            LIVE_WATCHLIST: "LIVE_WATCHLIST",
            FILTER_TICKER_PLACEHOLDER: "FILTER TICKER...",
            SYMBOL: "SYMBOL",
            PRICE: "PRICE",
            VOL_MULT: "VOL_MULT",
            VELOCITY: "VELOCITY (10m)",
            STATUS: "STATUS",
            SYSTEM_LOGS: "SYSTEM_LOGS",
            LIVE_CHART: "LIVE CHART",
            CHART_PLACEHOLDER: "Select a ticker from the watchlist to display its live chart.",
            DEEPSEEK_API_KEY: "DEEPSEEK_API_KEY (OPTIONAL)",
            ACCUM_RADAR: "ACCUM_RADAR",
            ACCUM_RADAR_TITLE: "ACCUM_RADAR",
            ACCUM_SUBTEXT: "Detecting pre-pump accumulation patterns before breakout develops.",
            FIRE_ACCUM_SIM: "SIMULATE ACCUM",
            ACCUM_EMPTY: "No accumulation patterns detected yet.",
            ACCUM_EMPTY_SUB: "Stage 0 radar scanning on each cycle...",
            
            // Tooltips
            TOOLTIP_WEBHOOK_URL: "Target URL to dispatch JSON alerts when a pump score matches or exceeds the threshold.",
            TOOLTIP_DEEPSEEK_KEY: "Input your DeepSeek API key to activate the AI Agent Decision Layer. If left empty, local heuristics will evaluate breakouts.",
            TOOLTIP_EXCHANGES: "Select the API liquidity pools to source assets from.",
            TOOLTIP_INSTRUMENTS: "Target spot exchange books or futures leverage swaps contracts.",
            TOOLTIP_INTERVAL: "Refresh cooldown period between active scanning cycles.",
            TOOLTIP_MAX_PAIRS: "Limit discoverable pairs sorted by 24h volume to focus processing bandwidth.",
            TOOLTIP_VOL_MULT: "How many times the current 5m candle volume must exceed the average volume of the previous 49 candles.",
            TOOLTIP_PRICE_VEL: "The minimum price gain percentage over the last 2 periods (10 minutes) to trigger breakout status."
        },
        es: {
            SYSTEM_STATUS: "ESTADO_SISTEMA",
            TRACKED_PAIRS: "PARES_RASTREADOS",
            RATE_LIMIT: "LIMITE_VELOCIDAD",
            CONTROL_DECK: "PANEL_CONTROL",
            START_SCANNER: "INICIAR ESCANER",
            STOP_SCANNER: "DETENER ESCANER",
            WEBHOOK_ALERT_URL: "URL_ALERTA_WEBHOOK",
            EXCHANGES: "EXCHANGES",
            INSTRUMENTS: "INSTRUMENTOS",
            SCAN_INTERVAL: "INTERVALO_ESCANEO (SEG)",
            MAX_PAIRS_TRACKED: "MAX_PARES_SEGUIDOS",
            VOL_MULTIPLIER_GATE: "COMPENSACION_VOLUMEN",
            PRICE_VELOCITY_GATE: "COMPENSACION_PRECIO",
            SAVE_CONFIGURATION: "GUARDAR_CONFIGURACION",
            INTELLIGENCE_SIMULATOR: "SIMULADOR_INTELIGENCIA",
            SIMULATOR_SUBTEXT: "Active una ruptura simulada de la Etapa 3 para probar alertas, cálculos de métricas y enrutamiento de carga de webhook.",
            FIRE_SIMULATED_ALERT: "DISPARAR ALERTA SIMULADA",
            BREAKOUT_RADAR: "RADAR_RUPTURAS",
            DISCOVERY: "DESCUBRIMIENTO",
            GATING_SCAN: "ESCANEO_FILTRADO",
            ENRICHMENT: "ENRIQUECIMIENTO",
            DISPATCH: "DESPACHO",
            ACTIVE_BREAKOUTS_HEADER: "ALERTAS DE RUPTURA ACTIVA (PUNTAJE ≥ 65/100)",
            NO_ACTIVE_BREAKOUTS: "NO SE DETECTARON RUPTURAS ACTIVAS",
            AWAITING_BREAKOUTS: "Esperando métricas de ruptura de la Etapa 2...",
            LIVE_WATCHLIST: "LISTA_SEGUIMIENTO_VIVO",
            FILTER_TICKER_PLACEHOLDER: "FILTRAR PAR...",
            SYMBOL: "SIMBOLO",
            PRICE: "PRECIO",
            VOL_MULT: "MULT_VOL",
            VELOCITY: "VELOCIDAD (10m)",
            STATUS: "ESTADO",
            SYSTEM_LOGS: "REGISTROS_SISTEMA",
            LIVE_CHART: "GRÁFICO EN VIVO",
            CHART_PLACEHOLDER: "Seleccione un par de la lista para mostrar su gráfico en vivo.",
            DEEPSEEK_API_KEY: "CLAVE_API_DEEPSEEK (OPCIONAL)",
            ACCUM_RADAR: "RADAR_ACUM",
            ACCUM_RADAR_TITLE: "RADAR_ACUMULACION",
            ACCUM_SUBTEXT: "Detectando patrones de acumulación pre-pump antes del movimiento.",
            FIRE_ACCUM_SIM: "SIMULAR ACUM",
            ACCUM_EMPTY: "No se detectaron patrones de acumulación.",
            ACCUM_EMPTY_SUB: "Radar Etapa 0 activo en cada ciclo...",
            
            // Tooltips
            TOOLTIP_WEBHOOK_URL: "URL del servidor de destino para recibir cargas útiles de alertas JSON en tiempo real cuando se alcancen los umbrales de bombeo.",
            TOOLTIP_DEEPSEEK_KEY: "Ingrese su clave API de DeepSeek para activar la Capa de Decisión del Agente de IA. Si se deja vacío, las heurísticas locales evaluarán las rupturas.",
            TOOLTIP_EXCHANGES: "Seleccione los libros de mercado de intercambio centralizados o descentralizados para consultar en el descubrimiento.",
            TOOLTIP_INSTRUMENTS: "Seleccione libros de divisas al contado o contratos de permuta financiera de futuros perpetuos para el escaneo.",
            TOOLTIP_INTERVAL: "Segundos de espera entre ciclos de escaneo consecutivos. Los valores más bajos escanean más rápido pero aumentan el riesgo de límite de velocidad.",
            TOOLTIP_MAX_PAIRS: "Limite el número de pares de mayor volumen obtenidos de la fase de descubrimiento para concentrar el ancho de banda de escaneo.",
            TOOLTIP_VOL_MULT: "Factor de umbral para activar rupturas. El volumen actual de la vela de 5m debe superar el promedio de las últimas 49 velas por este multiplicador.",
            TOOLTIP_PRICE_VEL: "Ganancia porcentual mínima de precio en las últimas dos velas (10 minutos en total) para activar una ruptura técnica."
        }
    };

    let currentLang = localStorage.getItem('lang') || 'en';

    function applyTranslations() {
        // Translate elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            if (translations[currentLang] && translations[currentLang][key]) {
                el.innerText = translations[currentLang][key];
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
            const key = el.getAttribute('data-translate-placeholder');
            if (translations[currentLang] && translations[currentLang][key]) {
                el.placeholder = translations[currentLang][key];
            }
        });

        // Toggle UI language button text representation
        if (btnLangToggle) {
            const span = btnLangToggle.querySelector('span');
            if (span) {
                span.innerText = currentLang === 'en' ? 'ES' : 'EN';
            } else {
                btnLangToggle.innerText = currentLang === 'en' ? 'ES' : 'EN';
            }
        }
        
        // Re-render components with translated dynamic text
        renderWatchlist();
    }

    if (btnLangToggle) {
        btnLangToggle.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'es' : 'en';
            localStorage.setItem('lang', currentLang);
            applyTranslations();
            
            // Reload chart to apply language
            const currentTicker = document.getElementById('current-chart-ticker');
            if (currentTicker && currentTicker.innerText !== 'NONE') {
                loadTradingViewChart(currentTicker.innerText);
            }
        });
    }

    // -------------------------------------------------------------------------- //
    // 1. WEBSOCKET LOGGING & TELEMETRY STREAM                                    //
    // -------------------------------------------------------------------------- //

    function connectWebSocket() {
        console.log(`Connecting to WebSocket at ${WS_URL}...`);
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log("WebSocket linked. Raw streaming online.");
            const msg = currentLang === 'en' 
                ? "[SYSTEM] WebSocket link established. Real-time telemetry streaming."
                : "[SISTEMA] Conexión WebSocket establecida. Transmisión de telemetría en tiempo real.";
            appendConsoleLine(msg, "line-success");
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                
                if (payload.type === 'HISTORY') {
                    // Initialize logs history
                    consoleViewport.innerHTML = '';
                    payload.logs.forEach(log => {
                        const styleClass = getLogStyleClass(log);
                        appendConsoleLine(log, styleClass);
                    });
                    // Sync system configurations
                    syncSystemState(payload.status);
                } 
                else if (payload.type === 'LOG') {
                    const styleClass = getLogStyleClass(payload.message);
                    appendConsoleLine(payload.message, styleClass);
                    // Analyze log keywords to trigger pipeline schematic animations
                    animatePipelineFlow(payload.message);
                } 
                else if (payload.type === 'ALERT') {
                    renderAlertCard(payload.data);
                    
                    // Inject or update breakout pair in watchlistData instantly
                    const alertData = payload.data;
                    const existingIdx = watchlistData.findIndex(item => item.symbol === alertData.ticker);
                    const mockWatchlistItem = {
                        symbol: alertData.ticker,
                        price: alertData.metrics.price,
                        volume_multiplier: alertData.metrics.volume_multiplier,
                        price_change_2vec: alertData.metrics.price_change_2vec,
                        price_change_abs: alertData.metrics.price_change_abs || 0.0,
                        is_breakout: true
                    };
                    
                    if (existingIdx !== -1) {
                        watchlistData[existingIdx] = mockWatchlistItem;
                    } else {
                        watchlistData.push(mockWatchlistItem);
                    }
                    renderWatchlist();
                }
                else if (payload.type === 'ACCUM_ALERT') {
                    // Real-time accumulation candidate from WebSocket
                    renderAccumCard(payload.data);
                    // Update candidate count badge
                    if (accumCandidateCount && accumFeed) {
                        const cardCount = accumFeed.querySelectorAll('[data-symbol]').length;
                        accumCandidateCount.textContent = `${cardCount} CANDIDATE${cardCount !== 1 ? 'S' : ''}`;
                    }
                    // Pulse the Stage 0 node
                    if (nodeAccum) {
                        nodeAccum.classList.add('active');
                        if (conn0) conn0.classList.add('active');
                        setTimeout(() => {
                            nodeAccum.classList.remove('active');
                            if (conn0) conn0.classList.remove('active');
                        }, 4000);
                    }
                }
                else if (payload.type === 'STATUS_REFRESH') {
                    syncSystemState(payload.status);
                }
            } catch (e) {
                console.error("Failed to parse WebSocket message:", e);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket link closed. Attempting auto-reconnect...");
            const msg = currentLang === 'en'
                ? "[SYSTEM] WebSocket link severed. Re-establishing connection in 3 seconds..."
                : "[SISTEMA] Conexión WebSocket rota. Reestableciendo conexión en 3 segundos...";
            appendConsoleLine(msg, "line-error");
            setTimeout(connectWebSocket, wsReconnectInterval);
        };

        ws.onerror = (err) => {
            console.error("WebSocket connection fault:", err);
        };
    }

    // Append raw lines to Console Viewport
    function appendConsoleLine(message, styleClass = "line-info") {
        const line = document.createElement('div');
        line.className = `console-line ${styleClass}`;
        line.innerText = message;
        consoleViewport.appendChild(line);
        consoleViewport.scrollTop = consoleViewport.scrollHeight;
    }

    // Determine color codes for logs based on content keywords
    function getLogStyleClass(msg) {
        if (msg.includes("CRITICAL") || msg.includes("Failure") || msg.includes("Failed")) return "line-error";
        if (msg.includes("🚨") || msg.includes("Rate limit") || msg.includes("⚠️")) return "line-warn";
        if (msg.includes("💥") || msg.includes("✅") || msg.includes("dispatched") || msg.includes("success")) return "line-success";
        if (msg.includes("Stage") || msg.includes("Scanning") || msg.includes("initialized")) return "line-dim";
        return "line-info";
    }

    // -------------------------------------------------------------------------- //
    // 2. STATE SYNCHRONIZATION                                                   //
    // -------------------------------------------------------------------------- //

    function syncSystemState(status) {
        // Status Indicators
        if (status.active) {
            systemStatusText.innerText = "ONLINE";
            systemStatusText.className = "stat-value text-green";
            
            scannerStatePulse.className = "pulse-icon green-pulse";
            
            btnStartScanner.classList.add('disabled');
            btnStartScanner.disabled = true;
            btnStopScanner.classList.remove('disabled');
            btnStopScanner.disabled = false;
        } else {
            systemStatusText.innerText = "OFFLINE";
            systemStatusText.className = "stat-value text-red";
            
            scannerStatePulse.className = "pulse-icon red-pulse";
            
            btnStartScanner.classList.remove('disabled');
            btnStartScanner.disabled = false;
            btnStopScanner.classList.add('disabled');
            btnStopScanner.disabled = true;
        }

        // Stats
        trackedPairsCount.innerText = status.monitored_count;
        
        if (status.sequential_mode) {
            rateLimitStatus.innerText = "SATURATED";
            rateLimitStatus.className = "stat-value text-orange";
        } else {
            rateLimitStatus.innerText = "NOMINAL";
            rateLimitStatus.className = "stat-value text-green";
        }

        // Sync form values (if not focused)
        if (document.activeElement.tagName !== 'INPUT') {
            inputWebhookUrl.value = status.settings.webhook_url || '';
            if (inputDeepseekKey) {
                inputDeepseekKey.value = status.settings.deepseek_api_key || '';
            }
            
            chkExchangeBinance.checked = status.settings.exchanges.includes('binance');
            chkExchangeBybit.checked = status.settings.exchanges.includes('bybit');
            chkExchangeHyperliquid.checked = status.settings.exchanges.includes('hyperliquid');
            
            chkInstSpot.checked = status.settings.instruments.includes('spot');
            chkInstFuture.checked = status.settings.instruments.includes('future');
            
            inputIntervalSec.value = status.settings.interval_sec;
            inputMaxPairs.value = status.settings.max_pairs;
            inputVolumeThreshold.value = status.settings.volume_multiplier;
            inputPriceThreshold.value = status.settings.price_velocity_pct;
        }
    }

    // Poll current watchlist details
    async function pollWatchlist() {
        try {
            const resp = await fetch(`${API_BASE}/api/pairs_summary`);
            if (resp.ok) {
                const data = await resp.json();
                watchlistData = data.results || [];
                renderWatchlist();
            }
        } catch (e) {
            console.error("Error polling watchlist summary:", e);
        }
    }

    // -------------------------------------------------------------------------- //
    // 3. RENDER WATCHLIST TABLE                                                  //
    // -------------------------------------------------------------------------- //

    function renderWatchlist() {
        const query = inputSearchPairs.value.toLowerCase().trim();
        let filtered = watchlistData.filter(item => {
            return item.symbol.toLowerCase().includes(query);
        });

        // Perform Interactive Sorting
        filtered.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (valA === undefined) valA = 0;
            if (valB === undefined) valB = 0;

            if (typeof valA === 'string') {
                return sortOrder === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }

            // Boolean or number sorting
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        if (filtered.length === 0) {
            const placeholderText = watchlistData.length === 0 
                ? (currentLang === 'en' ? "Awaiting first scan loop results..." : "Esperando primeros resultados del escaneo...")
                : (currentLang === 'en' ? "No tickers match query." : "Ningún par coincide con la búsqueda.");

            watchlistTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-placeholder">
                        ${placeholderText}
                    </td>
                </tr>`;
            return;
        }

        watchlistTableBody.innerHTML = '';
        filtered.forEach(item => {
            const row = document.createElement('tr');
            if (item.is_breakout) {
                row.className = 'breakout-row';
            }

            const velocityClass = item.price_change_2vec >= 0 ? "text-green" : "text-red";
            const velocitySign = item.price_change_2vec >= 0 ? "+" : "";

            let velocityText = "";
            if (item.price_change_abs !== undefined) {
                const absSign = item.price_change_abs >= 0 ? "+" : "";
                const absFormatted = absSign + "$" + formatPrice(Math.abs(item.price_change_abs));
                velocityText = `${absFormatted} (${velocitySign}${item.price_change_2vec.toFixed(2)}%)`;
            } else {
                const pricePrev = item.price / (1 + item.price_change_2vec / 100);
                const computedAbs = item.price - pricePrev;
                const absSign = computedAbs >= 0 ? "+" : "";
                const absFormatted = absSign + "$" + formatPrice(Math.abs(computedAbs));
                velocityText = `${absFormatted} (${velocitySign}${item.price_change_2vec.toFixed(2)}%)`;
            }

            const volClass = item.volume_multiplier >= 3 ? "text-orange" : "text-dim";

            const statusCell = item.is_breakout 
                ? `<span class="status-badge status-breakout">${currentLang === 'en' ? 'BREAKOUT' : 'RUPTURA'}</span>` 
                : `<span class="status-badge status-nominal">${currentLang === 'en' ? 'STABLE' : 'ESTABLE'}</span>`;

            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                document.querySelectorAll('#watchlist-table-body tr').forEach(r => r.classList.remove('selected-row'));
                row.classList.add('selected-row');
                loadTradingViewChart(item.symbol);
            });

            row.innerHTML = `
                <td><strong>${item.symbol}</strong></td>
                <td>$${formatPrice(item.price)}</td>
                <td class="${volClass}">${item.volume_multiplier.toFixed(2)}x</td>
                <td class="${velocityClass}">${velocityText}</td>
                <td>${statusCell}</td>
            `;
            watchlistTableBody.appendChild(row);
        });
    }

    function formatPrice(price) {
        if (price >= 1) return price.toFixed(2);
        if (price >= 0.01) return price.toFixed(4);
        return price.toFixed(6);
    }

    function loadTradingViewChart(symbol) {
        const titleEl = document.getElementById('current-chart-ticker');
        if (titleEl) {
            titleEl.innerText = symbol;
        }

        let cleanSymbol = symbol.split(':')[0];
        let parts = cleanSymbol.split('/');
        let base = parts[0] ? parts[0].toUpperCase() : '';
        let quote = parts[1] ? parts[1].toUpperCase() : '';
        
        if (!quote) quote = 'USDT';
        let tvSymbol = `BINANCE:${base}${quote}`;
        
        const isLight = document.body.classList.contains('light-mode');
        const container = document.getElementById('tv-chart-container');
        if (container) {
            container.innerHTML = '';
            
            if (window.TradingView) {
                new TradingView.widget({
                    "width": "100%",
                    "height": "100%",
                    "symbol": tvSymbol,
                    "interval": "5",
                    "timezone": "Etc/UTC",
                    "theme": isLight ? "light" : "dark",
                    "style": "1",
                    "locale": currentLang === 'en' ? "en" : "es",
                    "toolbar_bg": isLight ? "#f1f3f6" : "#101622",
                    "enable_publishing": false,
                    "hide_side_toolbar": true,
                    "allow_symbol_change": true,
                    "container_id": "tv-chart-container"
                });
            } else {
                container.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--red); font-family:var(--font-mono); font-size:11px;">
                        TradingView widget library load failure. Check Internet connection.
                    </div>
                `;
            }
        }
    }

    // Wire Interactive Watchlist Headers Sorting click handlers
    document.querySelectorAll('.watchlist-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort');
            if (sortKey === key) {
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortOrder = 'desc'; // Default to highest value first for metrics
                if (key === 'symbol') sortOrder = 'asc'; // Alphabetical default
            }

            // Sync sort arrows UI classes
            document.querySelectorAll('.watchlist-table th.sortable').forEach(header => {
                header.classList.remove('asc', 'desc');
                const icon = header.querySelector('i');
                if (icon) {
                    icon.className = 'fa-solid fa-sort';
                }
            });

            th.classList.add(sortOrder);
            const activeIcon = th.querySelector('i');
            if (activeIcon) {
                activeIcon.className = sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            }

            renderWatchlist();
        });
    });

    // -------------------------------------------------------------------------- //
    // 4. ANIMATED PIPELINE SCHEMATIC                                            //
    // -------------------------------------------------------------------------- //

    function animatePipelineFlow(logMessage) {
        const msg = logMessage.toLowerCase();
        
        // Reset all nodes
        if (nodeAccum)    nodeAccum.classList.remove('active');
        nodeDiscovery.classList.remove('active');
        nodeScan.classList.remove('active');
        nodeEnrich.classList.remove('active');
        nodeWebhook.classList.remove('active');
        if (conn0) conn0.classList.remove('active');
        conn1.classList.remove('active');
        conn2.classList.remove('active');
        conn3.classList.remove('active');

        if (msg.includes('[accum]') || msg.includes('[stage 0]') || msg.includes('accumulation')) {
            if (nodeAccum) { nodeAccum.classList.add('active'); }
            if (conn0)     { conn0.classList.add('active'); }
            nodeDiscovery.classList.add('active');
        } else if (msg.includes("stage 1") || msg.includes("discovery") || msg.includes("fetching markets")) {
            nodeDiscovery.classList.add('active');
        } else if (msg.includes("starting technical scan") || msg.includes("scanning top") || msg.includes("ticker loop check")) {
            nodeDiscovery.classList.add('active');
            conn1.classList.add('active');
            nodeScan.classList.add('active');
        } else if (msg.includes("breakout detected") || msg.includes("enrichment") || msg.includes("reddit") || msg.includes("open interest")) {
            nodeDiscovery.classList.add('active');
            conn1.classList.add('active');
            nodeScan.classList.add('active');
            conn2.classList.add('active');
            nodeEnrich.classList.add('active');
        } else if (msg.includes("sending webhook") || msg.includes("webhook successfully dispatched") || msg.includes("alert matched")) {
            nodeDiscovery.classList.add('active');
            conn1.classList.add('active');
            nodeScan.classList.add('active');
            conn2.classList.add('active');
            nodeEnrich.classList.add('active');
            conn3.classList.add('active');
            nodeWebhook.classList.add('active');
        } else {
            nodeDiscovery.classList.add('active');
            conn1.classList.add('active');
            nodeScan.classList.add('active');
        }
    }

    // -------------------------------------------------------------------------- //
    // 5. RENDER ALERTS FEED                                                      //
    // -------------------------------------------------------------------------- //

    function renderAlertCard(alertData) {
        // Remove placeholder if present
        if (noAlertsPlaceholder) {
            noAlertsPlaceholder.style.display = 'none';
        }

        const card = document.createElement('div');
        card.className = 'alert-card';
        
        // Is simulated or live
        const isSim = alertData.exchange.includes("simulated");
        const badgeText = isSim 
            ? (currentLang === 'en' ? "SIMULATED BREAKOUT" : "RUPTURA SIMULADA")
            : (currentLang === 'en' ? "LIVE BREAKOUT" : "RUPTURA EN VIVO");
            
        if (isSim) {
            card.style.borderLeftColor = "var(--cyan)";
        } else {
            card.style.borderLeftColor = "var(--orange)";
        }

        const date = new Date(alertData.timestamp);
        const timeStr = date.toTimeString().split(' ')[0];

        const scoreColorClass = alertData.metrics.compound_score >= 80 ? "text-red" : "text-orange";

        let coingeckoHTML = '';
        if (alertData.coingecko) {
            const mcap = alertData.coingecko.market_cap;
            const rank = alertData.coingecko.rank;
            const mcapStr = mcap ? `$${(mcap / 1e6).toFixed(1)}M` : 'N/A';
            const rankStr = rank ? `#${rank}` : 'N/A';
            coingeckoHTML = `
                <div class="alert-coingecko-strip" style="display:flex; justify-content:space-between; margin-top:8px; font-size:10px; color:var(--text-secondary); font-family:var(--font-mono); border-top:1px solid rgba(255,255,255,0.05); padding-top:6px;">
                    <span>MCAP: <strong style="color:var(--text-primary)">${mcapStr}</strong></span>
                    <span>CG RANK: <strong style="color:var(--text-primary)">${rankStr}</strong></span>
                </div>
            `;
        }

        let agentHTML = '';
        if (alertData.agent) {
            const reasoning = currentLang === 'en' ? alertData.agent.reasoning_en : alertData.agent.reasoning_es;
            const conviction = alertData.agent.conviction_score;
            agentHTML = `
                <div class="alert-agent-thought">
                    <span class="agent-title"><i class="fa-solid fa-robot"></i> DEEPSEEK_AGENT:</span>
                    <p class="agent-thought">${reasoning}</p>
                    <div class="agent-meta">
                        <span>CONVICTION:</span>
                        <div class="agent-conviction-bar">
                            <div class="agent-conviction-fill" style="width: ${conviction}%"></div>
                        </div>
                        <span style="color:var(--cyan); font-weight:bold;">${conviction}%</span>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="alert-card-header">
                <div>
                    <h4>${alertData.ticker}</h4>
                    <span class="alert-time"><i class="fa-solid fa-clock"></i> ${timeStr} UTC</span>
                </div>
                <span class="alert-badge" style="color:${isSim ? 'var(--cyan)' : 'var(--orange)'}; border-color:${isSim ? 'var(--cyan)' : 'var(--orange)'}; background-color:${isSim ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255, 94, 0, 0.05)'}">${badgeText}</span>
            </div>
            
            <div class="alert-metrics-grid">
                <div class="metric-box">
                    <span class="m-label">VOL_MULT</span>
                    <span class="m-val text-green">${alertData.metrics.volume_multiplier.toFixed(2)}x</span>
                </div>
                <div class="metric-box">
                    <span class="m-label">${currentLang === 'en' ? 'VELOCITY' : 'VELOCIDAD'} (10m)</span>
                    <span class="m-val text-green">+${alertData.metrics.price_velocity_2vec.toFixed(2)}%</span>
                </div>
                <div class="metric-box">
                    <span class="m-label">OI_DELTA</span>
                    <span class="m-val text-cyan">${alertData.metrics.open_interest_delta_pct.toFixed(2)}%</span>
                </div>
                <div class="metric-box">
                    <span class="m-label">REDDIT_SENTIMENT</span>
                    <span class="m-val text-cyan">${(alertData.metrics.vader_sentiment_score * 100).toFixed(0)}%</span>
                </div>
            </div>
            
            <div class="alert-score-strip">
                <span class="stat-label">COMPOUND_SCORE</span>
                <div class="score-track">
                    <div class="score-fill" style="width: ${alertData.metrics.compound_score}%; background-color:${isSim ? 'var(--cyan)' : 'var(--orange)'}"></div>
                </div>
                <span class="score-digit ${scoreColorClass}" style="color:${isSim ? 'var(--cyan)' : 'var(--orange)'}">${alertData.metrics.compound_score}/100</span>
            </div>
            ${coingeckoHTML}
            ${agentHTML}
        `;

        // Prepend card to Alerts container
        alertsFeedContainer.insertBefore(card, alertsFeedContainer.firstChild);

        // Keep alerts to maximum of 25 items
        if (alertsFeedContainer.children.length > 25) {
            alertsFeedContainer.removeChild(alertsFeedContainer.lastChild);
        }
    }

    // -------------------------------------------------------------------------- //
    // 6. ACTION EVENT HANDLERS & API POSTS                                       //
    // -------------------------------------------------------------------------- //

    // START SCANNER
    btnStartScanner.addEventListener('click', async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/start`, { method: 'POST' });
            if (resp.ok) {
                const msg = currentLang === 'en'
                    ? "[SYSTEM] Scan initiation command received."
                    : "[SISTEMA] Comando de inicio de escaneo recibido.";
                appendConsoleLine(msg, "line-success");
                if (ws) ws.send("refresh");
            }
        } catch (e) {
            appendConsoleLine(`[SYSTEM] Failure: ${e.message}`, "line-error");
        }
    });

    // STOP SCANNER
    btnStopScanner.addEventListener('click', async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/stop`, { method: 'POST' });
            if (resp.ok) {
                const msg = currentLang === 'en'
                    ? "[SYSTEM] Scan termination command received."
                    : "[SISTEMA] Comando de parada de escaneo recibido.";
                appendConsoleLine(msg, "line-warn");
                if (ws) ws.send("refresh");
            }
        } catch (e) {
            appendConsoleLine(`[SYSTEM] Failure: ${e.message}`, "line-error");
        }
    });

    // TRIGGER SIMULATION ALERT
    btnTriggerSimulation.addEventListener('click', async () => {
        try {
            btnTriggerSimulation.disabled = true;
            btnTriggerSimulation.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${currentLang === 'en' ? 'DISPATCHING...' : 'DESPACHANDO...'}`;
            
            const resp = await fetch(`${API_BASE}/api/trigger_simulation`, { method: 'POST' });
            if (resp.ok) {
                const msg = currentLang === 'en'
                    ? "[SYSTEM] Simulation triggered. Emitting mock Stage 3 telemetry."
                    : "[SISTEMA] Simulación activada. Emitiendo telemetría simulada de Etapa 3.";
                appendConsoleLine(msg, "line-success");
            }
        } catch (e) {
            appendConsoleLine(`[SYSTEM] Simulation fault: ${e.message}`, "line-error");
        } finally {
            setTimeout(() => {
                btnTriggerSimulation.disabled = false;
                btnTriggerSimulation.innerHTML = `<i class="fa-solid fa-bolt"></i> ${currentLang === 'en' ? 'FIRE SIMULATED ALERT' : 'DISPARAR ALERTA SIMULADA'}`;
            }, 1000);
        }
    });

    // SAVE SETTINGS
    configForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Gather selected exchanges
        const exchanges = [];
        if (chkExchangeBinance.checked) exchanges.push('binance');
        if (chkExchangeBybit.checked) exchanges.push('bybit');
        if (chkExchangeHyperliquid.checked) exchanges.push('hyperliquid');
        
        // Gather selected instruments
        const instruments = [];
        if (chkInstSpot.checked) instruments.push('spot');
        if (chkInstFuture.checked) instruments.push('future');

        if (exchanges.length === 0) {
            alert(currentLang === 'en' ? "Please select at least one Exchange." : "Por favor, seleccione al menos un Exchange.");
            return;
        }
        if (instruments.length === 0) {
            alert(currentLang === 'en' ? "Please select at least one Instrument." : "Por favor, seleccione al menos un Instrumento.");
            return;
        }

        const settings = {
            webhook_url: inputWebhookUrl.value.trim(),
            deepseek_api_key: inputDeepseekKey ? inputDeepseekKey.value.trim() : "",
            interval_sec: parseInt(inputIntervalSec.value),
            volume_multiplier: parseFloat(inputVolumeThreshold.value),
            price_velocity_pct: parseFloat(inputPriceThreshold.value),
            exchanges: exchanges,
            instruments: instruments,
            max_pairs: parseInt(inputMaxPairs.value)
        };

        try {
            btnSaveSettings.disabled = true;
            btnSaveSettings.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${currentLang === 'en' ? 'SAVING...' : 'GUARDANDO...'}`;

            const resp = await fetch(`${API_BASE}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (resp.ok) {
                const msg = currentLang === 'en'
                    ? "[SYSTEM] Settings updated successfully."
                    : "[SISTEMA] Configuración actualizada correctamente.";
                appendConsoleLine(msg, "line-success");
                if (ws) ws.send("refresh");
            } else {
                const msg = currentLang === 'en'
                    ? "[SYSTEM] Failed to save configurations. Check formatting."
                    : "[SISTEMA] Error al guardar configuraciones. Compruebe el formato.";
                appendConsoleLine(msg, "line-error");
            }
        } catch (e) {
            appendConsoleLine(`[SYSTEM] API Connection fault on settings write: ${e.message}`, "line-error");
        } finally {
            btnSaveSettings.disabled = false;
            btnSaveSettings.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${currentLang === 'en' ? 'SAVE_CONFIGURATION' : 'GUARDAR_CONFIGURACION'}`;
        }
    });

    // CLEAR LOGS
    btnClearLogs.addEventListener('click', () => {
        const msg = currentLang === 'en'
            ? "[SYSTEM] Terminal logs cleared. Link active."
            : "[SISTEMA] Registros de terminal borrados. Enlace activo.";
        consoleViewport.innerHTML = `<div class="console-line line-dim">${msg}</div>`;
    });

    // FILTER WATCHLIST
    inputSearchPairs.addEventListener('input', renderWatchlist);

    // -------------------------------------------------------------------------- //
    // 7. ACCUMULATION RADAR — RENDER & POLLING                                   //
    // -------------------------------------------------------------------------- //

    function renderAccumCard(data) {
        if (!accumFeed) return;
        if (accumPlaceholder) accumPlaceholder.style.display = 'none';

        const status = (data.accum_status || 'WATCHING').toUpperCase();
        const score  = parseFloat(data.accum_score || 0);
        const sigs   = data.signals || {};

        // Score bar color
        let scoreColor;
        let cardClass;
        let badgeClass;
        if (status === 'PRE-PUMP') {
            scoreColor = 'var(--red)';    cardClass = 'status-prepump'; badgeClass = 'badge-prepump';
        } else if (status === 'COILING') {
            scoreColor = 'var(--orange)'; cardClass = 'status-coiling'; badgeClass = 'badge-coiling';
        } else {
            scoreColor = 'var(--yellow)'; cardClass = '';               badgeClass = 'badge-watching';
        }

        // Signal maxes: vol_coiling=30, bb_squeeze=25, cvd=20, rsi=15, support=10
        const sigMeta = [
            { key: 'volume_coiling',  max: 30, label: 'VOL\nCOIL' },
            { key: 'bb_squeeze',      max: 25, label: 'BB\nSQZ' },
            { key: 'cvd_divergence',  max: 20, label: 'CVD\nDIV' },
            { key: 'rsi_reclamation', max: 15, label: 'RSI\nRECL' },
            { key: 'support_zone',    max: 10, label: 'SUP\nZONE' },
        ];

        const signalBarsHTML = sigMeta.map(({ key, max, label }) => {
            const val    = parseFloat(sigs[key] || 0);
            const pct    = Math.min((val / max) * 100, 100);
            const isHot  = pct >= 70;
            const isActive = pct >= 40;
            const wrapClass = isHot ? 'hot' : (isActive ? 'active' : '');
            return `
                <div class="signal-bar-wrap ${wrapClass}">
                    <span class="signal-label">${label}</span>
                    <div class="signal-track">
                        <div class="signal-fill" style="height:${pct}%"></div>
                    </div>
                    <span class="signal-val">${val.toFixed(1)}</span>
                </div>`;
        }).join('');

        // First detected - show relative time
        let detectedStr = '';
        if (data.first_detected) {
            const d = new Date(data.first_detected);
            const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
            detectedStr = diffMin <= 1 ? 'Just now' : `${diffMin}m ago`;
        }

        const card = document.createElement('div');
        card.className = `accum-card ${cardClass}`;
        card.dataset.symbol = data.ticker || data.symbol;
        card.innerHTML = `
            <div class="accum-card-header">
                <div>
                    <span class="accum-symbol">${data.ticker || data.symbol}</span>
                    <div class="accum-price">$${parseFloat(data.price || 0).toFixed(4)}</div>
                </div>
                <span class="accum-status-badge ${badgeClass}">${status}</span>
            </div>
            <div class="accum-score-row">
                <span class="accum-score-label">ACCUM</span>
                <div class="accum-score-track">
                    <div class="accum-score-fill" style="width:${score}%; background-color:${scoreColor}; box-shadow:0 0 6px ${scoreColor}"></div>
                </div>
                <span class="accum-score-digit" style="color:${scoreColor}">${score.toFixed(1)}/100</span>
            </div>
            <div class="accum-signals">${signalBarsHTML}</div>
            ${detectedStr ? `<div class="accum-first-detected"><i class="fa-regular fa-clock"></i> Detected: ${detectedStr}</div>` : ''}
        `;

        // Click to chart
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => loadTradingViewChart(data.ticker || data.symbol));

        // Remove existing card for same symbol if present (update in place)
        const existing = accumFeed.querySelector(`[data-symbol="${card.dataset.symbol}"]`);
        if (existing) accumFeed.removeChild(existing);

        // Prepend (highest score first via polling sort, newest first for WS pushes)
        accumFeed.insertBefore(card, accumFeed.firstChild);

        // Cap feed at 20 cards
        while (accumFeed.children.length > 20) {
            accumFeed.removeChild(accumFeed.lastChild);
        }
    }

    async function pollAccumulationCandidates() {
        try {
            const resp = await fetch(`${API_BASE}/api/accumulation-candidates`);
            if (!resp.ok) return;
            const data = await resp.json();
            const candidates = data.candidates || [];

            // Update badge count
            if (accumCandidateCount) {
                accumCandidateCount.textContent = `${candidates.length} CANDIDATES`;
            }

            if (candidates.length === 0) {
                if (accumPlaceholder) accumPlaceholder.style.display = 'flex';
                // Clear non-placeholder children
                Array.from(accumFeed.children).forEach(el => {
                    if (!el.classList.contains('accum-placeholder')) el.remove();
                });
                return;
            }

            if (accumPlaceholder) accumPlaceholder.style.display = 'none';

            // Reconcile feed — render cards in score order
            // Build set of current symbols in feed
            const existingSymbols = new Set(
                Array.from(accumFeed.querySelectorAll('[data-symbol]')).map(el => el.dataset.symbol)
            );
            const incomingSymbols = new Set(candidates.map(c => c.symbol));

            // Remove stale cards
            existingSymbols.forEach(sym => {
                if (!incomingSymbols.has(sym)) {
                    const el = accumFeed.querySelector(`[data-symbol="${sym}"]`);
                    if (el) el.remove();
                }
            });

            // Render / update each candidate
            candidates.forEach(c => {
                renderAccumCard({ ...c, ticker: c.symbol });
            });

        } catch (e) {
            console.error('Error polling accumulation candidates:', e);
        }
    }

    // ACCUMULATION SIMULATION BUTTON
    if (btnTriggerAccumSim) {
        btnTriggerAccumSim.addEventListener('click', async () => {
            try {
                btnTriggerAccumSim.disabled = true;
                btnTriggerAccumSim.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${currentLang === 'en' ? 'SCANNING...' : 'ESCANEANDO...'}`;
                const resp = await fetch(`${API_BASE}/api/trigger_accum_simulation`, { method: 'POST' });
                if (resp.ok) {
                    appendConsoleLine('[SYSTEM] Accumulation simulation fired. Check ACCUM_RADAR panel.', 'line-success');
                }
            } catch (e) {
                appendConsoleLine(`[SYSTEM] Accum simulation fault: ${e.message}`, 'line-error');
            } finally {
                setTimeout(() => {
                    btnTriggerAccumSim.disabled = false;
                    btnTriggerAccumSim.innerHTML = `<i class="fa-solid fa-eye"></i> ${currentLang === 'en' ? 'SIMULATE ACCUM' : 'SIMULAR ACUM'}`;
                }, 1000);
            }
        });
    }

    // -------------------------------------------------------------------------- //
    // 8. INITIALIZATION FLOW                                                      //
    // -------------------------------------------------------------------------- //

    // Setup initial theme & language overrides
    initTheme();
    applyTranslations();

    // Set initial sort indicator classes
    const defaultSortHeader = document.querySelector(`.watchlist-table th[data-sort="${sortKey}"]`);
    if (defaultSortHeader) {
        defaultSortHeader.classList.add(sortOrder);
        const icon = defaultSortHeader.querySelector('i');
        if (icon) {
            icon.className = sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
        }
    }

    // Launch WebSocket link
    connectWebSocket();

    // Start polling watchlist summary every 5 seconds
    pollWatchlist();
    watchlistPollInterval = setInterval(pollWatchlist, 5000);

    // Start polling accumulation candidates every 10 seconds
    pollAccumulationCandidates();
    accumPollInterval = setInterval(pollAccumulationCandidates, 10000);
});
