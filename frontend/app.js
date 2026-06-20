// -------------------------------------------------------------------------- //
// CRYPTO PUMP SCANNER FRONTEND LOGIC                                         //
// -------------------------------------------------------------------------- //

import { currentUser as commonUser, currentLang } from './common.js';

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
    const inputOpenaiKey = document.getElementById('input-openai-key');
    const inputAnthropicKey = document.getElementById('input-anthropic-key');
    const inputGeminiKey = document.getElementById('input-gemini-key');
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

    // DOM Elements - Auth & Navigation Console
    const navDashboard = document.getElementById('nav-dashboard');
    const navAdmin = document.getElementById('nav-admin');
    const navLedger = document.getElementById('nav-ledger');
    const headerNav = document.getElementById('header-nav');
    
    const loginOverlay = document.getElementById('login-overlay');
    const userProfileBadge = document.getElementById('user-profile-badge');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userRoleBadge = document.getElementById('user-role-badge');
    const btnLogout = document.getElementById('btn-logout');
    
    const adminConsolePanel = document.getElementById('admin-console-panel');
    const adminUsersTableBody = document.getElementById('admin-users-table-body');
    const terminalGrid = document.querySelector('.terminal-grid');
    
    const ledgerLockedModal = document.getElementById('ledger-locked-modal');
    const btnCloseLedgerModal = document.getElementById('btn-close-ledger-modal');
    const btnCloseLedgerModalOk = document.getElementById('btn-close-ledger-modal-ok');
    const tradesLedgerPanel = document.getElementById('trades-ledger-panel');
    const tradeJournalForm = document.getElementById('trade-journal-form');
    const tradeJournalTableBody = document.getElementById('trade-journal-table-body');
    const tradeSearch = document.getElementById('trade-search');
    const btnJournalAnalytics = document.getElementById('btn-journal-analytics');

    // Email/Password Auth Forms & Panels
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const formConfirm = document.getElementById('form-confirm');
    const formForgot = document.getElementById('form-forgot');
    const formReset = document.getElementById('form-reset');

    const authPanelMain = document.getElementById('auth-panel-main');
    const authPanelConfirm = document.getElementById('auth-panel-confirm');
    const authPanelForgot = document.getElementById('auth-panel-forgot');
    const authPanelReset = document.getElementById('auth-panel-reset');

    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');

    const linkForgotPassword = document.getElementById('link-forgot-password');
    const linkForgotBack = document.getElementById('link-forgot-back');
    const linkConfirmBack = document.getElementById('link-confirm-back');
    const linkResetBack = document.getElementById('link-reset-back');

    const inputLoginUsername = document.getElementById('login-username');
    const inputLoginPassword = document.getElementById('login-password');
    const inputSignupName = document.getElementById('signup-name');
    const inputSignupEmail = document.getElementById('signup-email');
    const inputSignupPassword = document.getElementById('signup-password');
    const inputConfirmCode = document.getElementById('confirm-code');
    const inputForgotEmail = document.getElementById('forgot-email');
    const inputResetToken = document.getElementById('reset-token');
    const inputResetPassword = document.getElementById('reset-password');

    const devCodeToast = document.getElementById('dev-code-toast');
    const devCodeText = document.getElementById('dev-code-text');

    // Admin Console Sub-Tabs
    const adminTabUsers = document.getElementById('admin-tab-users');
    const adminTabStats = document.getElementById('admin-tab-stats');
    const adminViewUsers = document.getElementById('admin-view-users');
    const adminViewStats = document.getElementById('admin-view-stats');
    const adminSubTitle = document.getElementById('admin-sub-title');

    const statTotalUsers = document.getElementById('stat-total-users');
    const statActiveSessions = document.getElementById('stat-active-sessions');
    const statMonitoredPairs = document.getElementById('stat-monitored-pairs');
    const statAlertsDispatched = document.getElementById('stat-alerts-dispatched');

    // State Variables
    let ws = null;
    let watchlistData = [];
    let wsReconnectInterval = 3000;
    let watchlistPollInterval = null;
    let poolInterval = null; // Stale interval reference
    let accumPollInterval = null;
    
    let currentUser = null;
    let isAuthInitialized = false;
    let confirmEmailState = '';
    let resetEmailState = '';
    let tradeJournalEntries = [];

    // Sorting State
    let sortKey = 'symbol';
    let sortOrder = 'asc';
    let compoundChartInstance = null;
    const presets = {
        stocks: { rate: 8.0, inflation: 3.0, frequency: 12 },
        crypto: { rate: 25.0, inflation: 3.0, frequency: 365 },
        realestate: { rate: 6.0, inflation: 3.0, frequency: 1 },
        savings: { rate: 4.0, inflation: 3.0, frequency: 12 },
        custom: { rate: 8.0, inflation: 3.0, frequency: 12 }
    };

    // -------------------------------------------------------------------------- //
    // 0. AUTHENTICATION & ROLE-BASED ACCESS CONTROL                              //
    // -------------------------------------------------------------------------- //

    function applyRoleGates() {
        if (!currentUser) return;
        
        const isAdmin = currentUser.role === 'admin';
        const features = currentUser.features || {
            webhook_enabled: 0,
            deepseek_enabled: 0,
            calculator_enabled: 1,
            ledger_enabled: 0,
            simulation_enabled: 0
        };
        
        // Admin Console tab visibility
        if (navAdmin) {
            navAdmin.style.display = isAdmin ? 'inline-block' : 'none';
        }
        
        // Simulation panel/deck gating (admins only & simulation feature flag enabled)
        const hasSimulation = isAdmin && !!features.simulation_enabled;
        const simulationDeck = document.getElementById('simulation_deck') || document.getElementById('simulation-deck');
        const mobileSimulationSection = document.getElementById('mobile-simulation-section');
        if (simulationDeck) {
            simulationDeck.style.display = hasSimulation ? 'block' : 'none';
        }
        if (mobileSimulationSection) {
            mobileSimulationSection.style.display = hasSimulation ? 'block' : 'none';
        }
        
        // Disable/enable admin controls
        const adminElements = [
            btnStartScanner,
            btnStopScanner,
            btnTriggerSimulation,
            btnTriggerAccumSim,
            btnSaveSettings
        ];
        
        adminElements.forEach(btn => {
            if (btn) {
                if (isAdmin) {
                    btn.removeAttribute('disabled');
                    btn.classList.remove('disabled');
                } else {
                    btn.setAttribute('disabled', 'true');
                    btn.classList.add('disabled');
                    btn.title = "ADMIN PRIVILEGE REQUIRED";
                }
            }
        });
        
        // Webhook inputs gating
        const hasWebhooks = !!features.webhook_enabled;
        const nodeWebhook = document.getElementById('node-webhook');
        const fgWebhook = document.getElementById('fg-webhook');
        console.log('[RBAC] webhook_enabled=', features.webhook_enabled, 'hasWebhooks=', hasWebhooks);
        if (fgWebhook) {
            fgWebhook.style.display = hasWebhooks ? '' : 'none';
        }
        if (inputWebhookUrl) {
            if (hasWebhooks) {
                inputWebhookUrl.removeAttribute('disabled');
                inputWebhookUrl.placeholder = "Enter webhook url...";
                inputWebhookUrl.title = "";
                inputWebhookUrl.parentElement.classList.remove('gated-feature-lock');
                if (nodeWebhook) nodeWebhook.style.display = 'block';
            } else {
                inputWebhookUrl.setAttribute('disabled', 'true');
                inputWebhookUrl.value = "";
                inputWebhookUrl.placeholder = "🔒 LOCKED (UPGRADE REQUIRED)";
                inputWebhookUrl.title = "WEBHOOK DISPATCH IS GATED FOR PREMIUM ROLES";
                if (nodeWebhook) nodeWebhook.style.display = 'none';
            }
        }

        // LLM inputs gating
        const hasDeepSeek = !!features.deepseek_enabled;
        const selectLlmProvider = document.getElementById('select-llm-provider');
        const fgDeepseek = document.getElementById('fg-deepseek');
        const fgLlmKeys = document.getElementById('fg-llm-keys');
        
        console.log('[RBAC] deepseek_enabled=', features.deepseek_enabled, 'hasLLM=', hasDeepSeek);
        
        if (fgDeepseek) fgDeepseek.style.display = hasDeepSeek ? '' : 'none';
        if (fgLlmKeys) fgLlmKeys.style.display = hasDeepSeek ? '' : 'none';
        
        if (selectLlmProvider) {
            if (hasDeepSeek) selectLlmProvider.removeAttribute('disabled');
            else selectLlmProvider.setAttribute('disabled', 'true');
        }
        
        const keyInputs = [inputOpenaiKey, inputAnthropicKey, inputGeminiKey, inputDeepseekKey];
        keyInputs.forEach(input => {
            if (input) {
                if (hasDeepSeek) {
                    input.removeAttribute('disabled');
                    input.placeholder = "Enter API key...";
                    input.title = "";
                    if (input.parentElement) input.parentElement.classList.remove('gated-feature-lock');
                } else {
                    input.setAttribute('disabled', 'true');
                    input.value = "";
                    input.placeholder = "🔒 LOCKED (UPGRADE REQUIRED)";
                    input.title = "LLM INTEGRATION GATED FOR PREMIUM ROLES";
                    if (input.parentElement) input.parentElement.classList.add('gated-feature-lock');
                }
            }
        });

        // Advanced Features section gating (webhook & deepseek)
        const advSection = document.getElementById('advanced_features_section') || document.getElementById('advanced-features-section');
        if (advSection) {
            // Show if either webhook or deepseek is enabled for the user
            const showAdv = !!features.webhook_enabled || !!features.deepseek_enabled;
            advSection.style.display = showAdv ? '' : 'none';
        }
        const hasCalculator = !!features.calculator_enabled;
        const navCompound = document.getElementById('nav-compound');
        if (navCompound) {
            navCompound.style.display = hasCalculator ? 'inline-block' : 'none';
        }

        // Ledger tab visibility / labeling
        const hasLedger = isAdmin || !!features.ledger_enabled;
        if (navLedger) {
            const span = navLedger.querySelector('span');
            if (span) {
                if (hasLedger) {
                    span.innerText = currentLang === 'en' ? 'MY_TRADES' : 'MIS_OPERACIONES';
                } else {
                    span.innerText = currentLang === 'en' ? 'MY_TRADES (🔒)' : 'MIS_OPERACIONES (🔒)';
                }
            }
        }
    }

    function initSystem() {
        if (isAuthInitialized) return;
        isAuthInitialized = true;
        
        // Launch WebSocket link
        connectWebSocket();

        // Start polling watchlist summary every 5 seconds
        pollWatchlist();
        watchlistPollInterval = setInterval(pollWatchlist, 5000);

        // Start polling accumulation candidates every 10 seconds
        pollAccumulationCandidates();
        accumPollInterval = setInterval(pollAccumulationCandidates, 10000);
    }

    // Logout operation
    // Initialize on authReady event
    window.addEventListener('authReady', (e) => {
        currentUser = e.detail;
        applyRoleGates();
        initSystem();
    });
    
    if (commonUser) {
        currentUser = commonUser;
        applyRoleGates();
        initSystem();
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
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
            // Only sync values for enabled features
            const userFeatures = currentUser && currentUser.features ? currentUser.features : {};
            if (userFeatures.webhook_enabled) {
                inputWebhookUrl.value = status.settings.webhook_url || '';
            }
            const selectLlmProvider = document.getElementById('select-llm-provider');
            if (selectLlmProvider) {
                selectLlmProvider.value = status.settings.llm_provider || 'deepseek';
            }
            if (userFeatures.deepseek_enabled) {
                if (inputOpenaiKey) inputOpenaiKey.value = status.settings.openai_api_key || '';
                if (inputAnthropicKey) inputAnthropicKey.value = status.settings.anthropic_api_key || '';
                if (inputGeminiKey) inputGeminiKey.value = status.settings.gemini_api_key || '';
                if (inputDeepseekKey) inputDeepseekKey.value = status.settings.deepseek_api_key || '';
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
                loadAITradeIdea(item.symbol, "breakout", {
                    price: item.price,
                    volume_multiplier: item.volume_multiplier,
                    price_velocity_2vec: item.price_change_2vec,
                    open_interest_delta_pct: 5.0,
                    vader_sentiment_score: 0.75
                });
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

    let selectedTicker = null;
    let selectedSignalType = null;
    let selectedMetrics = null;
    let selectedLlmTab = 'gemini';

    async function loadAITradeIdea(symbol, signalType, metrics) {
        selectedTicker = symbol;
        selectedSignalType = signalType;
        selectedMetrics = metrics;

        const currentIdeasTicker = document.getElementById('current-ideas-ticker');
        const ideasPlaceholder = document.getElementById('ideas-placeholder');
        const ideasLoading = document.getElementById('ideas-loading');
        const ideasLocked = document.getElementById('ideas-locked');
        const ideasMainBody = document.getElementById('ideas-main-body');

        if (currentIdeasTicker) {
            currentIdeasTicker.innerText = `${symbol} (${signalType.toUpperCase()})`;
        }

        if (ideasPlaceholder) ideasPlaceholder.style.display = 'none';
        if (ideasLocked) ideasLocked.style.display = 'none';
        if (ideasMainBody) ideasMainBody.style.display = 'none';
        if (ideasLoading) ideasLoading.style.display = 'flex';

        try {
            const hasLlmAccess = currentUser && currentUser.features && currentUser.features.deepseek_enabled;
            
            if (!hasLlmAccess) {
                if (ideasLoading) ideasLoading.style.display = 'none';
                if (ideasLocked) ideasLocked.style.display = 'block';
                return;
            }

            const payload = {
                ticker: symbol,
                signal_type: signalType,
                metrics: metrics,
                provider: selectedLlmTab
            };

            const resp = await fetch(`${API_BASE}/api/generate_trade_idea`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                const result = await resp.json();
                
                if (ideasLoading) ideasLoading.style.display = 'none';
                if (ideasMainBody) ideasMainBody.style.display = 'flex';

                const dirEl = document.getElementById('idea-val-direction');
                if (dirEl) {
                    dirEl.innerText = result.direction || 'BUY';
                    dirEl.className = result.direction === 'SELL' ? 'box-value text-red' : 'box-value text-green';
                    dirEl.style.color = result.direction === 'SELL' ? 'var(--red)' : 'var(--green)';
                }

                const convEl = document.getElementById('idea-val-conviction');
                if (convEl) convEl.innerText = `${result.conviction_score}%`;

                const tgtEl = document.getElementById('idea-val-target');
                if (tgtEl) tgtEl.innerText = `$${formatPrice(result.target_price)}`;

                const stopEl = document.getElementById('idea-val-stop');
                if (stopEl) stopEl.innerText = `$${formatPrice(result.stop_loss)}`;

                const expEl = document.getElementById('idea-text-explanation');
                if (expEl) expEl.innerText = currentLang === 'en' ? result.reasoning_en : result.reasoning_es;

                const setEl = document.getElementById('idea-text-setup');
                if (setEl) setEl.innerText = currentLang === 'en' ? result.setup_en : result.setup_es;
            } else {
                if (ideasLoading) ideasLoading.style.display = 'none';
                if (ideasLocked) ideasLocked.style.display = 'block';
            }
        } catch (e) {
            console.error("Error generating trade idea:", e);
            if (ideasLoading) ideasLoading.style.display = 'none';
            if (ideasPlaceholder) ideasPlaceholder.style.display = 'flex';
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

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            loadAITradeIdea(alertData.ticker, "breakout", alertData.metrics);
        });

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

        const selectLlmProvider = document.getElementById('select-llm-provider');
        const settings = {
            webhook_url: inputWebhookUrl.value.trim(),
            openai_api_key: inputOpenaiKey ? inputOpenaiKey.value.trim() : "",
            anthropic_api_key: inputAnthropicKey ? inputAnthropicKey.value.trim() : "",
            gemini_api_key: inputGeminiKey ? inputGeminiKey.value.trim() : "",
            deepseek_api_key: inputDeepseekKey ? inputDeepseekKey.value.trim() : "",
            llm_provider: selectLlmProvider ? selectLlmProvider.value : "deepseek",
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

    // SSO LOGIN BUTTON SIMULATION
    const btnLlmSso = document.getElementById('btn-llm-sso');
    const btnLockSsoLogin = document.getElementById('btn-lock-sso-login');

    function openSSOModal(provider) {
        const modal = document.createElement('div');
        modal.className = 'sso-modal-overlay';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.style.backdropFilter = 'blur(6px)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '99999';
        modal.style.fontFamily = 'var(--font-mono)';

        const logoIcon = provider === 'gemini' ? 'fa-sparkles text-cyan' :
                         provider === 'claude' ? 'fa-feather text-orange' :
                         provider === 'chatgpt' ? 'fa-bolt text-green' : 'fa-robot text-purple';

        modal.innerHTML = `
            <div class="sso-modal-card" style="background:var(--bg-card); border:1px solid var(--cyan); box-shadow: 0 0 20px rgba(0, 240, 255, 0.2); padding:30px; border-radius:6px; max-width:400px; width:90%; text-align:center; position:relative;">
                <div style="font-size:48px; margin-bottom:15px;"><i class="fa-solid ${logoIcon}"></i></div>
                <h3 style="color:var(--text-primary); margin-bottom:10px; font-size:14px; text-transform:uppercase; letter-spacing:1px;">${provider.toUpperCase()} SSO LOGIN</h3>
                <div id="sso-step-text" style="color:var(--cyan); font-size:10px; margin-bottom:20px;">Initializing connection...</div>
                
                <div class="progress-bar-container" style="background:rgba(255,255,255,0.05); height:4px; border-radius:2px; overflow:hidden; margin-bottom:20px;">
                    <div id="sso-progress" style="background:var(--cyan); width:0%; height:100%; transition:width 0.4s ease;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const steps = [
            { text: currentLang === 'en' ? "Establishing secure link to gateway..." : "Estableciendo enlace seguro con el servidor...", pct: 25 },
            { text: currentLang === 'en' ? "Authorizing credentials via OAuth token..." : "Autorizando credenciales mediante token OAuth...", pct: 55 },
            { text: currentLang === 'en' ? "Authenticating premium user flags..." : "Autenticando funciones de usuario premium...", pct: 85 },
            { text: currentLang === 'en' ? "SSO Authentication Successful!" : "¡Autenticación SSO Exitosa!", pct: 100 }
        ];

        let stepIndex = 0;
        const interval = setInterval(() => {
            if (stepIndex < steps.length) {
                const step = steps[stepIndex];
                const stepEl = document.getElementById('sso-step-text');
                const progressEl = document.getElementById('sso-progress');
                if (stepEl) stepEl.innerText = step.text;
                if (progressEl) {
                    progressEl.style.width = `${step.pct}%`;
                    if (step.pct === 100) {
                        stepEl.style.color = 'var(--green)';
                        progressEl.style.backgroundColor = 'var(--green)';
                    }
                }
                stepIndex++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    if (modal.parentNode) document.body.removeChild(modal);
                    if (inputDeepseekKey) {
                        inputDeepseekKey.value = `sso_token_${provider}_authenticated`;
                    }
                    appendConsoleLine(currentLang === 'en' ? `[SYSTEM] SSO authorization success for ${provider.toUpperCase()}` : `[SISTEMA] Autorización SSO exitosa para ${provider.toUpperCase()}`, "line-success");
                    
                    const saveBtn = document.getElementById('btn-save-settings');
                    if (saveBtn) {
                        saveBtn.click();
                    }
                }, 800);
            }
        }, 500);
    }

    if (btnLlmSso) {
        btnLlmSso.addEventListener('click', () => {
            const selectLlmProvider = document.getElementById('select-llm-provider');
            const provider = selectLlmProvider ? selectLlmProvider.value : "deepseek";
            openSSOModal(provider);
        });
    }

    if (btnLockSsoLogin) {
        btnLockSsoLogin.addEventListener('click', () => {
            const selectLlmProvider = document.getElementById('select-llm-provider');
            const provider = selectLlmProvider ? selectLlmProvider.value : "deepseek";
            openSSOModal(provider);
        });
    }

    // PROVIDER TABS SWITCHER
    const providerTabs = document.getElementById('provider-tabs');
    if (providerTabs) {
        providerTabs.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                providerTabs.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = 'var(--text-secondary)';
                });
                btn.classList.add('active');
                btn.style.borderBottomColor = 'var(--cyan)';
                btn.style.color = 'var(--text-primary)';
                
                selectedLlmTab = btn.getAttribute('data-provider');
                
                if (selectedTicker && selectedSignalType && selectedMetrics) {
                    loadAITradeIdea(selectedTicker, selectedSignalType, selectedMetrics);
                }
            });
        });
    }

    // REGENERATE IDEA
    const btnRegenerateIdea = document.getElementById('btn-regenerate-idea');
    if (btnRegenerateIdea) {
        btnRegenerateIdea.addEventListener('click', () => {
            if (selectedTicker && selectedSignalType && selectedMetrics) {
                loadAITradeIdea(selectedTicker, selectedSignalType, selectedMetrics);
            }
        });
    }

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

        // Click to load AI Trade Idea
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            loadAITradeIdea(data.ticker || data.symbol, "accumulation", {
                price: data.price,
                accum_score: data.accum_score,
                accum_status: data.accum_status,
                signals: data.signals
            });
        });

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
    // 7A. CMDB ROLE FEATURES LOADER & UPDATER                                    //
    // -------------------------------------------------------------------------- //

    async function loadAdminFeatures() {
        const tbody = document.getElementById('admin-features-table-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-placeholder">Loading features configuration...</td>
            </tr>`;

        try {
            const resp = await fetch(`${API_BASE}/api/admin/features`);
            if (resp.ok) {
                const features = await resp.json();
                tbody.innerHTML = '';
                
                const roleOrder = ['admin', 'black_diamond', 'premium', 'user'];
                roleOrder.forEach(roleName => {
                    const data = features[roleName];
                    if (!data) return;

                    const row = document.createElement('tr');
                    
                    const isWebhookChecked = data.webhook_enabled ? 'checked' : '';
                    const isDeepseekChecked = data.deepseek_enabled ? 'checked' : '';
                    const isCalcChecked = data.calculator_enabled ? 'checked' : '';
                    const isLedgerChecked = data.ledger_enabled ? 'checked' : '';
                    const isSimulationChecked = data.simulation_enabled ? 'checked' : '';
                    
                    const isSelfRole = roleName === 'admin';
                    const disabledAttr = isSelfRole ? 'disabled' : '';

                    row.innerHTML = `
                        <td>${roleName.replace('_', ' ').toUpperCase()}</td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="webhook_enabled" ${isWebhookChecked} ${disabledAttr}></td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="deepseek_enabled" ${isDeepseekChecked} ${disabledAttr}></td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="calculator_enabled" ${isCalcChecked} ${disabledAttr}></td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="ledger_enabled" ${isLedgerChecked} ${disabledAttr}></td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="simulation_enabled" ${isSimulationChecked} ${disabledAttr}></td>
                    `;
                    
                    row.querySelectorAll('.feature-toggle').forEach(checkbox => {
                        checkbox.addEventListener('change', async (e) => {
                            const r = e.target.dataset.role;
                            const feat = e.target.dataset.feature;
                            const isChecked = e.target.checked ? 1 : 0;
                            await updateRoleFeatureFlag(r, feat, isChecked);
                        });
                    });

                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="table-placeholder text-red">Error loading feature flags.</td>
                    </tr>`;
            }
        } catch (e) {
            console.error("Failed to load admin features:", e);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-placeholder text-red">Connection error.</td>
                </tr>`;
        }
    }

    async function updateRoleFeatureFlag(role, featureName, enabledValue) {
        try {
            const getResp = await fetch(`${API_BASE}/api/admin/features`);
            if (!getResp.ok) throw new Error("Failed to fetch current config");
            const allFeatures = await getResp.json();
            const currentRoleFeats = allFeatures[role] || {
                webhook_enabled: 0,
                deepseek_enabled: 0,
                calculator_enabled: 0,
                ledger_enabled: 0,
                simulation_enabled: 0
            };
            
            currentRoleFeats[featureName] = enabledValue;

            const resp = await fetch(`${API_BASE}/api/admin/features/${role}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentRoleFeats)
            });

            if (resp.ok) {
                appendConsoleLine(`[SYSTEM] Feature flags updated for role ${role.toUpperCase()}.`, 'line-success');
            } else {
                appendConsoleLine(`[SYSTEM] Failed to update feature flags for ${role.toUpperCase()}.`, 'line-error');
            }
        } catch (e) {
            appendConsoleLine(`[SYSTEM] Error updating feature flags: ${e.message}`, 'line-error');
        }
    }

    // -------------------------------------------------------------------------- //
    // 7B. COMPOUND INTEREST CALCULATOR INTERACTIVE LOGIC                         //
    // -------------------------------------------------------------------------- //

    function initCompoundCalculator() {
        const principalInput = document.getElementById('principal');
        const principalSlider = document.getElementById('principalRange');
        const monthlyInput = document.getElementById('monthly');
        const monthlySlider = document.getElementById('monthlyRange');
        const rateInput = document.getElementById('rate');
        const rateSlider = document.getElementById('rateRange');
        const inflationInput = document.getElementById('inflation');
        const inflationSlider = document.getElementById('inflationRange');
        const freqSelect = document.getElementById('frequency');
        const yearsSlider = document.getElementById('yearsRange');
        const yearsLabel = document.getElementById('yearsLabel');
        const inspectYearSlider = document.getElementById('inspectYear');
        const inspectYearLabel = document.getElementById('inspectYearLabel');
        const btnCalc = document.getElementById('btnCalc');
        const tableToggle = document.getElementById('tableToggle');
        const tableWrap = document.getElementById('tableWrap');
        const assetPicker = document.getElementById('assetPicker');

        if (!principalInput) return;

        const formatCur = (num) => new Intl.NumberFormat(currentLang === 'en' ? 'en-US' : 'es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

        const parseNum = (val) => {
            const clean = val.replace(/[^0-9.-]/g, '');
            return parseFloat(clean) || 0;
        };

        const syncSliderAndInput = (inputEl, sliderEl, isInt = true) => {
            inputEl.addEventListener('input', () => {
                let val = parseNum(inputEl.value);
                sliderEl.value = val;
                inputEl.value = isInt ? Math.round(val).toLocaleString() : val;
                calculateGrowth();
            });
            sliderEl.addEventListener('input', () => {
                inputEl.value = isInt ? Math.round(sliderEl.value).toLocaleString() : sliderEl.value;
                calculateGrowth();
            });
        };

        syncSliderAndInput(principalInput, principalSlider, true);
        syncSliderAndInput(monthlyInput, monthlySlider, true);
        syncSliderAndInput(rateInput, rateSlider, false);
        syncSliderAndInput(inflationInput, inflationSlider, false);

        if (freqSelect) freqSelect.addEventListener('change', calculateGrowth);
        if (yearsSlider) {
            yearsSlider.addEventListener('input', () => {
                if (yearsLabel) yearsLabel.textContent = yearsSlider.value;
                if (inspectYearSlider) {
                    inspectYearSlider.max = yearsSlider.value;
                    if (parseInt(inspectYearSlider.value) > parseInt(yearsSlider.value)) {
                        inspectYearSlider.value = yearsSlider.value;
                    }
                }
                calculateGrowth();
            });
        }

        if (inspectYearSlider) {
            inspectYearSlider.addEventListener('input', () => {
                inspectYearLabel.textContent = (currentLang === 'en' ? 'Year ' : 'Año ') + inspectYearSlider.value;
                updateInspectorDetails();
            });
        }

        if (tableToggle && tableWrap) {
            tableToggle.onclick = () => {
                const isHidden = tableWrap.style.display === 'none';
                tableWrap.style.display = isHidden ? 'block' : 'none';
                const chevron = tableToggle.querySelector('.table-toggle-chevron');
                if (chevron) {
                    if (isHidden) chevron.classList.add('collapsed');
                    else chevron.classList.remove('collapsed');
                }
            };
        }

        if (assetPicker) {
            const buttons = assetPicker.querySelectorAll('.asset-btn');
            buttons.forEach(btn => {
                btn.onclick = () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const asset = btn.dataset.asset;
                    const preset = presets[asset];
                    if (preset) {
                        rateInput.value = preset.rate;
                        rateSlider.value = preset.rate;
                        inflationInput.value = preset.inflation;
                        inflationSlider.value = preset.inflation;
                        freqSelect.value = preset.frequency;
                        calculateGrowth();
                    }
                };
            });
        }

        if (btnCalc) {
            btnCalc.onclick = calculateGrowth;
        }

        let calculatedPoints = [];

        function calculateGrowth() {
            const principal = parseNum(principalInput.value);
            const monthly = parseNum(monthlyInput.value);
            const rate = parseFloat(rateInput.value) / 100;
            const inflation = parseFloat(inflationInput.value) / 100;
            const frequency = parseInt(freqSelect.value);
            const years = parseInt(yearsSlider.value);

            calculatedPoints = [];
            let balance = principal;
            let contributions = 0;
            let interestGains = 0;

            for (let year = 1; year <= years; year++) {
                for (let month = 1; month <= 12; month++) {
                    balance += monthly;
                    contributions += monthly;

                    if (frequency === 12) {
                        const interest = balance * (rate / 12);
                        balance += interest;
                        interestGains += interest;
                    } 
                    else if (frequency >= 12) {
                        const interest = balance * (Math.pow(1 + rate / frequency, frequency / 12) - 1);
                        balance += interest;
                        interestGains += interest;
                    } 
                    else if (frequency === 4 && month % 3 === 0) {
                        const interest = balance * (rate / 4);
                        balance += interest;
                        interestGains += interest;
                    } 
                    else if (frequency === 1 && month === 12) {
                        const interest = balance * rate;
                        balance += interest;
                        interestGains += interest;
                    }
                }

                const realValue = balance / Math.pow(1 + inflation, year);

                calculatedPoints.push({
                    year: year,
                    principal: principal,
                    contributions: contributions,
                    interest: interestGains,
                    balance: balance,
                    realValue: realValue
                });
            }

            const finalData = calculatedPoints[calculatedPoints.length - 1];
            document.getElementById('sumTotal').textContent = formatCur(finalData.balance);
            document.getElementById('sumInterest').textContent = formatCur(finalData.interest);
            document.getElementById('sumReal').textContent = formatCur(finalData.realValue);

            const tbody = document.getElementById('tableBody');
            if (tbody) {
                tbody.innerHTML = calculatedPoints.map(p => `
                    <tr>
                        <td style="text-align:left;">${currentLang === 'en' ? 'Year' : 'Año'} ${p.year}</td>
                        <td>${formatCur(p.principal)}</td>
                        <td>${formatCur(p.contributions)}</td>
                        <td>${formatCur(p.interest)}</td>
                        <td><strong>${formatCur(p.balance)}</strong></td>
                        <td class="text-orange">${formatCur(p.realValue)}</td>
                    </tr>
                `).join('');
            }

            if (inspectYearSlider) {
                inspectYearSlider.max = years;
                if (parseInt(inspectYearSlider.value) > years) {
                    inspectYearSlider.value = years;
                }
                inspectYearLabel.textContent = (currentLang === 'en' ? 'Year ' : 'Año ') + inspectYearSlider.value;
            }

            updateInspectorDetails();
            drawChart();
        }

        function updateInspectorDetails() {
            if (calculatedPoints.length === 0) return;
            const inspectIdx = parseInt(inspectYearSlider.value) - 1;
            const data = calculatedPoints[inspectIdx] || calculatedPoints[calculatedPoints.length - 1];

            document.getElementById('inspPrincipal').textContent = formatCur(data.principal);
            document.getElementById('inspContrib').textContent = formatCur(data.contributions);
            document.getElementById('inspInterest').textContent = formatCur(data.interest);
            document.getElementById('inspTotal').textContent = formatCur(data.balance);
            document.getElementById('inspReal').textContent = formatCur(data.realValue);
        }

        function drawChart() {
            const ctx = document.getElementById('compoundChart').getContext('2d');
            if (compoundChartInstance) {
                compoundChartInstance.destroy();
            }

            const yearsLabels = calculatedPoints.map(p => (currentLang === 'en' ? 'Yr ' : 'Año ') + p.year);
            const balanceData = calculatedPoints.map(p => p.balance);
            const contributionsData = calculatedPoints.map(p => p.principal + p.contributions);
            const realValueData = calculatedPoints.map(p => p.realValue);

            const isLight = document.body.classList.contains('light-mode');
            const gridColor = isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.05)';
            const textColor = isLight ? '#0f172a' : '#94a3b8';

            const activeBtn = assetPicker.querySelector('.asset-btn.active');
            let primaryColor = '#00f3ff';
            if (activeBtn) {
                const accent = activeBtn.dataset.accent;
                if (accent === 'emerald') primaryColor = '#10b981';
                else if (accent === 'purple') primaryColor = '#a855f7';
                else if (accent === 'orange') primaryColor = '#f97316';
                else if (accent === 'blue') primaryColor = '#3b82f6';
                else if (accent === 'gold') primaryColor = '#eab308';
            }

            compoundChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: yearsLabels,
                    datasets: [
                        {
                            label: currentLang === 'en' ? 'Total Balance' : 'Saldo Total',
                            data: balanceData,
                            borderColor: primaryColor,
                            backgroundColor: isLight ? 'rgba(0, 243, 255, 0.05)' : 'rgba(0, 243, 255, 0.02)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2
                        },
                        {
                            label: currentLang === 'en' ? 'Total Contributions' : 'Contribuciones Totales',
                            data: contributionsData,
                            borderColor: isLight ? '#64748b' : 'rgba(255, 255, 255, 0.3)',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1.5
                        },
                        {
                            label: currentLang === 'en' ? 'Real Value (Inflation Adj.)' : 'Valor Real (Ajustado Inflación)',
                            data: realValueData,
                            borderColor: '#f97316',
                            fill: false,
                            tension: 0.2,
                            borderWidth: 1.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: { family: 'JetBrains Mono, monospace', size: 9 }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: isLight ? '#ffffff' : '#0d121e',
                            titleColor: isLight ? '#0f172a' : '#ffffff',
                            bodyColor: isLight ? '#0f172a' : '#ffffff',
                            borderColor: primaryColor,
                            borderWidth: 1,
                            titleFont: { family: 'JetBrains Mono, monospace', size: 10 },
                            bodyFont: { family: 'JetBrains Mono, monospace', size: 10 }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { family: 'JetBrains Mono, monospace', size: 9 } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { 
                                color: textColor, 
                                font: { family: 'JetBrains Mono, monospace', size: 9 },
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        calculateGrowth();
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

    // Trigger secure check auth flow
    checkAuth();

    // -------------------------------------------------------------------------- //
    // 9. MOBILE UX — BOTTOM NAV, DRAWER, STATUS STRIP                           //
    // -------------------------------------------------------------------------- //

    function initMobileUX() {
        const IS_MOBILE = () => window.innerWidth <= 768;

        // Mobile bottom nav buttons (internal dashboard sections)
        const mobBtns = {
            dashboard: document.getElementById('mob-btn-dash'),
            accum:     document.getElementById('mob-btn-accum'),
            watchlist: document.getElementById('mob-btn-watchlist')
        };

        // Desktop panels that exist in the grid
        const panels = {
            dashboard: document.querySelector('.breakout-radar'),
            accum:     document.querySelector('.accum-radar-panel'),
            watchlist: document.querySelector('.telemetry-deck')
        };

        function closeDrawer() {
            const drawer = document.getElementById('mobile-drawer');
            const drawerOverlay = document.getElementById('mobile-drawer-overlay');
            if (drawer) drawer.classList.remove('open');
            if (drawerOverlay) drawerOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        // ── Mobile bottom nav view switching ─────────────────────────
        let activeView = 'dashboard';
        const hash = window.location.hash;
        if (hash === '#accum') activeView = 'accum';
        else if (hash === '#watchlist') activeView = 'watchlist';

        function showMobileView(view) {
            if (!IS_MOBILE()) return;
            activeView = view;

            // Update bottom nav active state
            Object.entries(mobBtns).forEach(([key, btn]) => {
                if (btn) btn.classList.toggle('active', key === view);
            });

            // For mobile: show only the target panel, hide others in the grid
            Object.entries(panels).forEach(([key, panel]) => {
                if (!panel) return;
                panel.style.display = (key === view) ? '' : 'none';
                if (key === view) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        // Wire bottom nav buttons
        Object.entries(mobBtns).forEach(([view, btn]) => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    // Update URL hash
                    window.location.hash = (view === 'dashboard') ? 'radar' : view;
                    showMobileView(view);
                });
            }
        });

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const h = window.location.hash;
            if (h === '#accum') showMobileView('accum');
            else if (h === '#watchlist') showMobileView('watchlist');
            else showMobileView('dashboard');
        });

        // ── Desktop/Mobile mode toggle on resize ─────────────────────
        function applyResponsiveMode() {
            if (IS_MOBILE()) {
                showMobileView(activeView);
            } else {
                // Desktop: show all panels
                Object.values(panels).forEach(p => { if (p) p.style.display = ''; });
            }
        }

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(applyResponsiveMode, 80);
        });

        // Initial apply
        applyResponsiveMode();

        // ── Mobile drawer button mirrors ──────────────────────────────
        // Start / Stop scanner
        const mobStart = document.getElementById('btn-start-scanner-mobile');
        const mobStop  = document.getElementById('btn-stop-scanner-mobile');
        if (mobStart && btnStartScanner) {
            mobStart.addEventListener('click', () => { btnStartScanner.click(); closeDrawer(); });
        }
        if (mobStop && btnStopScanner) {
            mobStop.addEventListener('click', () => { btnStopScanner.click(); closeDrawer(); });
        }

        // Mirror scanner state to mobile buttons
        function syncMobileButtons(isRunning) {
            if (mobStart) {
                mobStart.disabled = isRunning;
                mobStart.classList.toggle('disabled', isRunning);
            }
            if (mobStop) {
                mobStop.disabled = !isRunning;
                mobStop.classList.toggle('disabled', !isRunning);
            }
        }

        // Observe desktop button state changes with MutationObserver
        if (btnStartScanner) {
            new MutationObserver(() => {
                const isRunning = btnStartScanner.disabled;
                syncMobileButtons(isRunning);
            }).observe(btnStartScanner, { attributes: true, attributeFilter: ['disabled'] });
        }

        // Save config from drawer
        const mobSave = document.getElementById('btn-save-settings-mobile');
        if (mobSave) {
            mobSave.addEventListener('click', () => {
                const mobInterval = document.getElementById('mob-interval-sec');
                const mobMaxPairs = document.getElementById('mob-max-pairs');
                const mobVol      = document.getElementById('mob-vol-threshold');
                const mobPrice    = document.getElementById('mob-price-threshold');
                if (mobInterval && mobInterval.value && inputIntervalSec) inputIntervalSec.value = mobInterval.value;
                if (mobMaxPairs && mobMaxPairs.value && inputMaxPairs)     inputMaxPairs.value = mobMaxPairs.value;
                if (mobVol && mobVol.value && inputVolumeThreshold)         inputVolumeThreshold.value = mobVol.value;
                if (mobPrice && mobPrice.value && inputPriceThreshold)      inputPriceThreshold.value = mobPrice.value;
                // Sync exchanges
                const mobBinance     = document.getElementById('mob-chk-binance');
                const mobBybit       = document.getElementById('mob-chk-bybit');
                const mobHyperliquid = document.getElementById('mob-chk-hyperliquid');
                const mobSpot        = document.getElementById('mob-chk-spot');
                const mobFutures     = document.getElementById('mob-chk-futures');
                if (mobBinance && chkExchangeBinance)         chkExchangeBinance.checked = mobBinance.checked;
                if (mobBybit && chkExchangeBybit)             chkExchangeBybit.checked = mobBybit.checked;
                if (mobHyperliquid && chkExchangeHyperliquid) chkExchangeHyperliquid.checked = mobHyperliquid.checked;
                if (mobSpot && chkInstSpot)                   chkInstSpot.checked = mobSpot.checked;
                if (mobFutures && chkInstFuture)              chkInstFuture.checked = mobFutures.checked;
                // Trigger desktop save
                if (btnSaveSettings) btnSaveSettings.click();
                closeDrawer();
            });
        }

        // Sync desktop values INTO drawer when opened
        function syncDrawerSettings() {
            const mobInterval = document.getElementById('mob-interval-sec');
            const mobMaxPairs = document.getElementById('mob-max-pairs');
            const mobVol      = document.getElementById('mob-vol-threshold');
            const mobPrice    = document.getElementById('mob-price-threshold');
            if (mobInterval && inputIntervalSec && inputIntervalSec.value) mobInterval.value = inputIntervalSec.value;
            if (mobMaxPairs && inputMaxPairs && inputMaxPairs.value)        mobMaxPairs.value = inputMaxPairs.value;
            if (mobVol && inputVolumeThreshold && inputVolumeThreshold.value) mobVol.value = inputVolumeThreshold.value;
            if (mobPrice && inputPriceThreshold && inputPriceThreshold.value) mobPrice.value = inputPriceThreshold.value;
        }

        // Expose function for common.js drawer integration
        const btnOpenDrawer = document.getElementById('btn-mobile-settings');
        if (btnOpenDrawer) {
            btnOpenDrawer.addEventListener('click', syncDrawerSettings);
        }

        // Simulate alert from drawer
        const mobSim = document.getElementById('btn-sim-mobile');
        if (mobSim && btnTriggerSimulation) {
            mobSim.addEventListener('click', () => { btnTriggerSimulation.click(); closeDrawer(); });
        }
    }

    initMobileUX();
});

