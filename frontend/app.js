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

    async function checkAuth() {
        try {
            const resp = await fetch(`${API_BASE}/api/auth/user`);
            if (resp.status === 200) {
                currentUser = await resp.json();
                
                // Populate profile badge
                if (userName) userName.innerText = currentUser.name;
                if (userAvatar) userAvatar.src = currentUser.picture || 'https://api.dicebear.com/7.x/bottts/svg?seed=default';
                
                if (userRoleBadge) {
                    userRoleBadge.innerText = currentUser.role.replace('_', ' ').toUpperCase();
                    userRoleBadge.className = `badge badge-${currentUser.role}`;
                }
                
                // Show navigation & badge
                if (headerNav) headerNav.style.display = 'flex';
                if (userProfileBadge) userProfileBadge.style.display = 'flex';
                if (loginOverlay) loginOverlay.style.display = 'none';
                
                // Apply RBAC UI Gates
                applyRoleGates();
                
                // Initialize background data feeds
                initSystem();
            } else {
                handleUnauthorized();
            }
        } catch (e) {
            console.error("Auth check failed:", e);
            handleUnauthorized();
        }
    }

    function handleUnauthorized() {
        currentUser = null;
        if (headerNav) headerNav.style.display = 'none';
        if (userProfileBadge) userProfileBadge.style.display = 'none';
        if (loginOverlay) loginOverlay.style.display = 'flex';
        
        // Reset sub auth view to main panel
        showAuthView('main');
        hideDevCode();
        
        // Stop polling and socket
        if (watchlistPollInterval) clearInterval(watchlistPollInterval);
        if (accumPollInterval) clearInterval(accumPollInterval);
        if (ws) {
            ws.onclose = null; // Prevent reconnect loops
            ws.close();
        }
    }

    function showAuthView(viewName) {
        if (!authPanelMain || !authPanelConfirm || !authPanelForgot || !authPanelReset) return;
        authPanelMain.style.display = 'none';
        authPanelConfirm.style.display = 'none';
        authPanelForgot.style.display = 'none';
        authPanelReset.style.display = 'none';
        
        if (viewName === 'main') {
            authPanelMain.style.display = 'block';
        } else if (viewName === 'confirm') {
            authPanelConfirm.style.display = 'block';
        } else if (viewName === 'forgot') {
            authPanelForgot.style.display = 'block';
        } else if (viewName === 'reset') {
            authPanelReset.style.display = 'block';
        }
    }

    function showDevCode(type, code) {
        if (devCodeToast && devCodeText) {
            devCodeText.innerHTML = `${type.toUpperCase()} CODE: <strong style="color:var(--yellow); font-size:14px; letter-spacing:1px;">${code}</strong>`;
            devCodeToast.style.display = 'flex';
        }
    }
    
    function hideDevCode() {
        if (devCodeToast) devCodeToast.style.display = 'none';
    }

    // Bind login/signup tabs
    if (tabLogin) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            if (tabSignup) tabSignup.classList.remove('active');
            if (formLogin) formLogin.style.display = 'block';
            if (formSignup) formSignup.style.display = 'none';
        });
    }
    
    if (tabSignup) {
        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('active');
            if (tabLogin) tabLogin.classList.remove('active');
            if (formSignup) formSignup.style.display = 'block';
            if (formLogin) formLogin.style.display = 'none';
        });
    }

    // Forgot password view switch
    if (linkForgotPassword) {
        linkForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthView('forgot');
        });
    }

    const backToLogin = (e) => {
        e.preventDefault();
        hideDevCode();
        showAuthView('main');
    };

    if (linkForgotBack) linkForgotBack.addEventListener('click', backToLogin);
    if (linkConfirmBack) linkConfirmBack.addEventListener('click', backToLogin);
    if (linkResetBack) linkResetBack.addEventListener('click', backToLogin);

    // Password visibility toggle logic
    const togglePasswordButtons = document.querySelectorAll('.btn-toggle-password');
    togglePasswordButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input && (input.type === 'password' || input.type === 'text')) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.innerHTML = isPassword 
                    ? '<i class="fa-solid fa-eye-slash"></i>' 
                    : '<i class="fa-solid fa-eye"></i>';
            }
        });
    });

    // Form Submits: Login
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = inputLoginUsername.value.trim();
            const password = inputLoginPassword.value;
            
            try {
                const resp = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                if (resp.ok) {
                    window.location.reload();
                } else if (resp.status === 403) {
                    // Email confirmation needed
                    const data = await resp.json();
                    confirmEmailState = data.email || username;
                    alert("Email verification required before accessing terminal.");
                    showAuthView('confirm');
                } else {
                    const err = await resp.json();
                    alert(err.detail || "Authentication failed.");
                }
            } catch (err) {
                alert("Connection failed: " + err.message);
            }
        });
    }

    // Form Submits: Signup
    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = inputSignupName.value.trim();
            const email = inputSignupEmail.value.trim();
            const password = inputSignupPassword.value;
            
            try {
                const resp = await fetch(`${API_BASE}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name, password })
                });
                
                if (resp.ok) {
                    const data = await resp.json();
                    confirmEmailState = data.email;
                    showAuthView('confirm');
                    if (data.dev_code) {
                        showDevCode("Verification", data.dev_code);
                    }
                } else {
                    const err = await resp.json();
                    alert(err.detail || "Registration failed.");
                }
            } catch (err) {
                alert("Connection failed: " + err.message);
            }
        });
    }

    // Form Submits: Confirm Email Code
    if (formConfirm) {
        formConfirm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = inputConfirmCode.value.trim();
            
            try {
                const resp = await fetch(`${API_BASE}/api/auth/confirm-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: confirmEmailState, code })
                });
                
                if (resp.ok) {
                    alert("Email verified successfully! You can now log in.");
                    hideDevCode();
                    showAuthView('main');
                    if (tabLogin) tabLogin.click();
                } else {
                    const err = await resp.json();
                    alert(err.detail || "Invalid confirmation code.");
                }
            } catch (err) {
                alert("Connection failed: " + err.message);
            }
        });
    }

    // Form Submits: Forgot Password (request token)
    if (formForgot) {
        formForgot.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = inputForgotEmail.value.trim();
            resetEmailState = email;
            
            try {
                const resp = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                if (resp.ok) {
                    const data = await resp.json();
                    showAuthView('reset');
                    if (data.dev_token) {
                        showDevCode("Reset Code", data.dev_token);
                    }
                } else {
                    const err = await resp.json();
                    alert(err.detail || "Failed to trigger reset.");
                }
            } catch (err) {
                alert("Connection failed: " + err.message);
            }
        });
    }

    // Form Submits: Reset Password
    if (formReset) {
        formReset.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = inputResetToken.value.trim();
            const password = inputResetPassword.value;
            
            try {
                const resp = await fetch(`${API_BASE}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmailState, token, password })
                });
                
                if (resp.ok) {
                    alert("Password updated successfully! Log in with your new credentials.");
                    hideDevCode();
                    showAuthView('main');
                    if (tabLogin) tabLogin.click();
                } else {
                    const err = await resp.json();
                    alert(err.detail || "Failed to reset password.");
                }
            } catch (err) {
                alert("Connection failed: " + err.message);
            }
        });
    }

    function applyRoleGates() {
        if (!currentUser) return;
        
        const isAdmin = currentUser.role === 'admin';
        const features = currentUser.features || {
            webhook_enabled: 0,
            deepseek_enabled: 0,
            calculator_enabled: 1,
            ledger_enabled: 0
        };
        
        // Admin Console tab visibility
        if (navAdmin) {
            navAdmin.style.display = isAdmin ? 'inline-block' : 'none';
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
        if (inputWebhookUrl) {
            if (hasWebhooks) {
                inputWebhookUrl.removeAttribute('disabled');
                inputWebhookUrl.placeholder = "Enter webhook url...";
                inputWebhookUrl.title = "";
                inputWebhookUrl.parentElement.classList.remove('gated-feature-lock');
            } else {
                inputWebhookUrl.setAttribute('disabled', 'true');
                inputWebhookUrl.value = "";
                inputWebhookUrl.placeholder = "🔒 LOCKED (UPGRADE REQUIRED)";
                inputWebhookUrl.title = "WEBHOOK DISPATCH IS GATED FOR PREMIUM ROLES";
            }
        }

        // DeepSeek inputs gating
        const hasDeepSeek = !!features.deepseek_enabled;
        if (inputDeepseekKey) {
            if (hasDeepSeek) {
                inputDeepseekKey.removeAttribute('disabled');
                inputDeepseekKey.placeholder = "Enter DeepSeek api key...";
                inputDeepseekKey.title = "";
            } else {
                inputDeepseekKey.setAttribute('disabled', 'true');
                inputDeepseekKey.value = "";
                inputDeepseekKey.placeholder = "🔒 LOCKED (UPGRADE REQUIRED)";
                inputDeepseekKey.title = "DEEPSEEK AI ANALYSIS GATED FOR PREMIUM ROLES";
            }
        }

        // Calculator tab visibility
        const hasCalculator = !!features.calculator_enabled;
        const navCompound = document.getElementById('nav-compound');
        if (navCompound) {
            navCompound.style.display = hasCalculator ? 'inline-block' : 'none';
        }

        // Ledger tab visibility / labeling
        const hasLedger = !!features.ledger_enabled;
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
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
                if (resp.ok) {
                    window.location.reload();
                }
            } catch (e) {
                console.error("Logout failed:", e);
            }
        });
    }

    // View Navigation Router
    const compoundInterestPanel = document.getElementById('compound-interest-panel');
    const navCompound = document.getElementById('nav-compound');

    if (navDashboard) {
        navDashboard.addEventListener('click', () => {
            navDashboard.classList.add('active');
            if (navAdmin) navAdmin.classList.remove('active');
            if (navCompound) navCompound.classList.remove('active');
            if (navLedger) navLedger.classList.remove('active');
            if (terminalGrid) terminalGrid.style.display = 'grid';
            if (adminConsolePanel) adminConsolePanel.style.display = 'none';
            if (compoundInterestPanel) compoundInterestPanel.style.display = 'none';
        });
    }

    if (navAdmin) {
        navAdmin.addEventListener('click', () => {
            if (currentUser && currentUser.role === 'admin') {
                navAdmin.classList.add('active');
                if (navDashboard) navDashboard.classList.remove('active');
                if (navCompound) navCompound.classList.remove('active');
                if (navLedger) navLedger.classList.remove('active');
                if (terminalGrid) terminalGrid.style.display = 'none';
                if (adminConsolePanel) adminConsolePanel.style.display = 'block';
                if (compoundInterestPanel) compoundInterestPanel.style.display = 'none';
                
                // Reset admin sub-tabs to users view
                if (adminTabUsers) adminTabUsers.classList.add('active');
                if (adminTabStats) adminTabStats.classList.remove('active');
                const adminTabFeatures = document.getElementById('admin-tab-features');
                if (adminTabFeatures) adminTabFeatures.classList.remove('active');

                if (adminViewUsers) adminViewUsers.style.display = 'block';
                if (adminViewStats) adminViewStats.style.display = 'none';
                const adminViewFeatures = document.getElementById('admin-view-features');
                if (adminViewFeatures) adminViewFeatures.style.display = 'none';

                if (adminSubTitle) adminSubTitle.textContent = 'USER_ROLES';
                
                loadAdminUsers();
            }
        });
    }

    if (navCompound) {
        navCompound.addEventListener('click', () => {
            const hasCalc = currentUser && currentUser.features && currentUser.features.calculator_enabled;
            if (!hasCalc) return;

            navCompound.classList.add('active');
            if (navDashboard) navDashboard.classList.remove('active');
            if (navAdmin) navAdmin.classList.remove('active');
            if (navLedger) navLedger.classList.remove('active');
            if (terminalGrid) terminalGrid.style.display = 'none';
            if (adminConsolePanel) adminConsolePanel.style.display = 'none';
            if (compoundInterestPanel) compoundInterestPanel.style.display = 'grid';

            initCompoundCalculator();
        });
    }

    if (navLedger) {
        navLedger.addEventListener('click', () => {
            const hasLedger = currentUser && currentUser.features && currentUser.features.ledger_enabled;
            if (!hasLedger) {
                if (ledgerLockedModal) ledgerLockedModal.style.display = 'flex';
            } else {
                alert(currentLang === 'en' 
                    ? "Trades ledger backend initialized. Interface is prepared for later integration." 
                    : "Registro de operaciones inicializado. Interfaz preparada para futura integración.");
            }
        });
    }

    if (btnCloseLedgerModal) {
        btnCloseLedgerModal.addEventListener('click', () => {
            if (ledgerLockedModal) ledgerLockedModal.style.display = 'none';
        });
    }
    if (btnCloseLedgerModalOk) {
        btnCloseLedgerModalOk.addEventListener('click', () => {
            if (ledgerLockedModal) ledgerLockedModal.style.display = 'none';
        });
    }

    // Bind Admin sub-tabs
    const adminTabFeatures = document.getElementById('admin-tab-features');
    const adminViewFeatures = document.getElementById('admin-view-features');

    if (adminTabUsers) {
        adminTabUsers.addEventListener('click', () => {
            adminTabUsers.classList.add('active');
            if (adminTabStats) adminTabStats.classList.remove('active');
            if (adminTabFeatures) adminTabFeatures.classList.remove('active');
            if (adminViewUsers) adminViewUsers.style.display = 'block';
            if (adminViewStats) adminViewStats.style.display = 'none';
            if (adminViewFeatures) adminViewFeatures.style.display = 'none';
            if (adminSubTitle) adminSubTitle.textContent = 'USER_ROLES';
            loadAdminUsers();
        });
    }
    
    if (adminTabStats) {
        adminTabStats.addEventListener('click', () => {
            adminTabStats.classList.add('active');
            if (adminTabUsers) adminTabUsers.classList.remove('active');
            if (adminTabFeatures) adminTabFeatures.classList.remove('active');
            if (adminViewUsers) adminViewUsers.style.display = 'none';
            if (adminViewStats) adminViewStats.style.display = 'block';
            if (adminViewFeatures) adminViewFeatures.style.display = 'none';
            if (adminSubTitle) adminSubTitle.textContent = 'SYSTEM_DIAGNOSTICS';
            loadAdminStats();
        });
    }

    if (adminTabFeatures) {
        adminTabFeatures.addEventListener('click', () => {
            adminTabFeatures.classList.add('active');
            if (adminTabUsers) adminTabUsers.classList.remove('active');
            if (adminTabStats) adminTabStats.classList.remove('active');
            if (adminViewUsers) adminViewUsers.style.display = 'none';
            if (adminViewStats) adminViewStats.style.display = 'none';
            if (adminViewFeatures) adminViewFeatures.style.display = 'block';
            if (adminSubTitle) adminSubTitle.textContent = 'ROLE_FEATURE_FLAGS';
            loadAdminFeatures();
        });
    }

    // Load Admin Panel Users Database
    async function loadAdminUsers() {
        if (!adminUsersTableBody) return;
        
        adminUsersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="table-placeholder">Loading users database...</td>
            </tr>`;
            
        try {
            const resp = await fetch(`${API_BASE}/api/admin/users`);
            if (resp.ok) {
                const users = await resp.json();
                
                if (users.length === 0) {
                    adminUsersTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="table-placeholder">No registered users in database.</td>
                        </tr>`;
                    return;
                }
                
                adminUsersTableBody.innerHTML = '';
                users.forEach(user => {
                    const row = document.createElement('tr');
                    
                    const isSelf = user.email === currentUser.email || user.id === currentUser.id;
                    const roles = ['admin', 'black_diamond', 'premium', 'user'];
                    const optionsHTML = roles.map(r => `
                        <option value="${r}" ${user.role === r ? 'selected' : ''} ${isSelf && r !== 'admin' ? 'disabled' : ''}>
                            ${r.replace('_', ' ').toUpperCase()}
                        </option>
                    `).join('');
                    
                    const isConfirmed = user.email_confirmed === 1;
                    const verifiedBadgeHTML = isConfirmed
                        ? '<span class="badge badge-watching" style="font-size: 8px; padding: 1px 4px; margin-left: 5px;">VERIFIED</span>'
                        : '<span class="badge badge-coiling" style="font-size: 8px; padding: 1px 4px; margin-left: 5px;">UNVERIFIED</span>';
                        
                    const date = new Date(user.created_at || Date.now());
                    const dateFormatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    row.innerHTML = `
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <img src="${user.picture || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid var(--border-color);">
                                <strong>${user.name}</strong> ${isSelf ? '<span class="text-dim">(YOU)</span>' : ''}
                            </div>
                        </td>
                        <td>
                            <div>
                                <span>${user.email}</span>
                                <div><small style="color:var(--text-dim); font-size:10px; font-family:monospace;">ID: ${user.id}</small>${verifiedBadgeHTML}</div>
                            </div>
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <span class="badge badge-${user.role}" style="font-size: 9px; padding: 2px 6px; width: fit-content;">${user.role.replace('_', ' ').toUpperCase()}</span>
                                <select class="admin-role-select" data-user-id="${user.id}" ${isSelf ? 'disabled' : ''} style="margin-top:2px;">
                                    ${optionsHTML}
                                </select>
                            </div>
                        </td>
                        <td>${dateFormatted}</td>
                        <td>
                            <div style="display:flex; gap:5px;">
                                <button class="btn btn-xs ${isConfirmed ? 'btn-outline-red' : 'btn-outline-green'} btn-toggle-verify" data-user-id="${user.id}" data-confirmed="${user.email_confirmed}">
                                    ${isConfirmed ? 'UNVERIFY' : 'VERIFY'}
                                </button>
                                <button class="btn btn-xs btn-outline-blue btn-admin-reset-pw" data-user-id="${user.id}">
                                    RESET PW
                                </button>
                                <button class="btn btn-xs btn-outline-red btn-admin-delete" data-user-id="${user.id}" ${isSelf ? 'disabled' : ''}>
                                    DELETE
                                </button>
                            </div>
                        </td>
                    `;
                    
                    // Bind change listener for role update
                    const select = row.querySelector('.admin-role-select');
                    if (select) {
                        select.addEventListener('change', async (e) => {
                            const newRole = e.target.value;
                            await updateUserRole(user.id, newRole);
                        });
                    }

                    // Bind verification toggle
                    const verifyBtn = row.querySelector('.btn-toggle-verify');
                    if (verifyBtn) {
                        verifyBtn.addEventListener('click', async () => {
                            const currentVal = parseInt(verifyBtn.dataset.confirmed) === 1;
                            const newVal = !currentVal;
                            try {
                                const actionText = newVal ? "confirm" : "unconfirm";
                                const confirmResp = await fetch(`${API_BASE}/api/admin/users/${user.id}/confirm`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ confirm: newVal })
                                });
                                if (confirmResp.ok) {
                                    appendConsoleLine(`[SYSTEM] Manual verification updated for ${user.email} (${actionText.toUpperCase()}).`, 'line-success');
                                    loadAdminUsers();
                                } else {
                                    appendConsoleLine(`[SYSTEM] Failed to toggle verification status for ${user.email}.`, 'line-error');
                                }
                            } catch (err) {
                                appendConsoleLine(`[SYSTEM] Manual verification update error: ${err.message}`, 'line-error');
                            }
                        });
                    }

                    // Bind reset password
                    const resetBtn = row.querySelector('.btn-admin-reset-pw');
                    if (resetBtn) {
                        resetBtn.addEventListener('click', async () => {
                            const newPw = prompt(`Enter new password for ${user.name} (${user.email}):`);
                            if (newPw === null) return; // Cancelled
                            if (newPw.trim() === '') {
                                alert("Password cannot be empty!");
                                return;
                            }
                            try {
                                const resetResp = await fetch(`${API_BASE}/api/admin/users/${user.id}/reset-password`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ password: newPw })
                                });
                                if (resetResp.ok) {
                                    appendConsoleLine(`[SYSTEM] Password reset for user ${user.email} successful.`, 'line-success');
                                    alert(`Password reset successful for ${user.email}`);
                                } else {
                                    const errJson = await resetResp.json();
                                    appendConsoleLine(`[SYSTEM] Password reset failed for ${user.email}: ${errJson.detail}`, 'line-error');
                                }
                            } catch (err) {
                                appendConsoleLine(`[SYSTEM] Admin password reset error: ${err.message}`, 'line-error');
                            }
                        });
                    }

                    // Bind delete user
                    const deleteBtn = row.querySelector('.btn-admin-delete');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', async () => {
                            if (!confirm(`Are you sure you want to permanently delete user ${user.name} (${user.email})? This action is irreversible.`)) {
                                return;
                            }
                            try {
                                const delResp = await fetch(`${API_BASE}/api/admin/users/${user.id}`, {
                                    method: 'DELETE'
                                });
                                if (delResp.ok) {
                                    appendConsoleLine(`[SYSTEM] User ${user.email} deleted successfully.`, 'line-warn');
                                    loadAdminUsers();
                                } else {
                                    appendConsoleLine(`[SYSTEM] Failed to delete user ${user.email}.`, 'line-error');
                                }
                            } catch (err) {
                                appendConsoleLine(`[SYSTEM] Delete user error: ${err.message}`, 'line-error');
                            }
                        });
                    }
                    
                    adminUsersTableBody.appendChild(row);
                });
            }
        } catch (e) {
            console.error("Failed to load admin users:", e);
            adminUsersTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-placeholder text-red">Error loading users.</td>
                </tr>`;
        }
    }

    async function updateUserRole(userId, newRole) {
        try {
            const resp = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            
            if (resp.ok) {
                appendConsoleLine(`[SYSTEM] Role for user ID ${userId} updated to ${newRole.toUpperCase()} successfully.`, 'line-success');
                loadAdminUsers();
            } else {
                appendConsoleLine(`[SYSTEM] Failed to update role for user ID ${userId}.`, 'line-error');
            }
        } catch (e) {
            appendConsoleLine(`[SYSTEM] Error updating user role: ${e.message}`, 'line-error');
        }
    }

    async function loadAdminStats() {
        try {
            const resp = await fetch(`${API_BASE}/api/admin/system-stats`);
            if (resp.ok) {
                const stats = await resp.json();
                if (statTotalUsers) statTotalUsers.textContent = stats.total_users;
                if (statActiveSessions) statActiveSessions.textContent = stats.active_sessions;
                if (statMonitoredPairs) statMonitoredPairs.textContent = stats.monitored_pairs;
                if (statAlertsDispatched) statAlertsDispatched.textContent = stats.alerts_dispatched;
            }
        } catch (e) {
            console.error("Failed to load admin stats:", e);
        }
    }

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
            ADMIN_CONSOLE: "ADMIN CONSOLE",

            // Compound calculator strings
            COMPOUND_INTEREST: "COMPOUND INTEREST",
            INVESTMENT_SETTINGS: "INVESTMENT SETTINGS",
            ASSET_CLASS: "ASSET CLASS",
            STOCKS: "STOCKS",
            CRYPTO: "CRYPTO",
            REAL_ESTATE: "REAL ESTATE",
            SAVINGS: "SAVINGS",
            CUSTOM: "CUSTOM",
            INITIAL_PRINCIPAL: "INITIAL PRINCIPAL",
            MONTHLY_CONTRIBUTION: "MONTHLY CONTRIBUTION",
            ANNUAL_RETURN: "ANNUAL RETURN",
            INFLATION_RATE: "INFLATION RATE",
            COMPOUND_FREQUENCY: "COMPOUND FREQUENCY",
            ANNUALLY: "ANNUALLY",
            QUARTERLY: "QUARTERLY",
            MONTHLY_FREQ: "MONTHLY",
            WEEKLY: "WEEKLY",
            DAILY: "DAILY",
            TIME_HORIZON: "TIME HORIZON",
            YEARS: "YEARS",
            CALCULATE_GROWTH: "CALCULATE GROWTH",
            GROWTH_PROJECTIONS: "GROWTH PROJECTIONS",
            TOTAL_BALANCE: "TOTAL BALANCE",
            TOTAL_INTEREST: "TOTAL INTEREST",
            REAL_VALUE_ADJ: "REAL VALUE (ADJ. INFLATION)",
            INSPECT_YEAR_PROJECTION: "INSPECT YEAR PROJECTION",
            PRINCIPAL: "PRINCIPAL",
            CONTRIBUTIONS: "CONTRIBUTIONS",
            INTEREST_GAINS: "INTEREST / GAINS",
            TOTAL_BALANCE_ABBR: "TOTAL BAL",
            REAL_VALUE_ABBR: "REAL VAL",
            YEAR_BY_YEAR_BREAKDOWN: "YEAR-BY-YEAR BREAKDOWN",
            YEAR: "YEAR",
            INTEREST: "INTEREST",
            REAL_VALUE: "REAL VALUE",
            
            // Tooltips
            TOOLTIP_WEBHOOK_URL: "Target URL to dispatch JSON alerts when a pump score matches or exceeds the threshold.",
            TOOLTIP_DEEPSEEK_KEY: "Input your DeepSeek API key to activate the AI Agent Decision Layer. If left empty, local heuristics will evaluate breakouts.",
            TOOLTIP_EXCHANGES: "Select the API liquidity pools to source assets from.",
            TOOLTIP_INSTRUMENTS: "Target spot exchange books or futures leverage swaps contracts.",
            TOOLTIP_INTERVAL: "Refresh cooldown period between active scanning cycles.",
            TOOLTIP_MAX_PAIRS: "Limit discoverable pairs sorted by 24h volume to focus processing bandwidth.",
            TOOLTIP_VOL_MULT: "How many times the current 5m candle volume must exceed the average volume of the previous 49 candles.",
            TOOLTIP_PRICE_VEL: "The minimum price gain percentage over the last 2 periods (10 minutes) to trigger breakout status.",
            TOOLTIP_PRINCIPAL: "The starting amount of your investment.",
            TOOLTIP_CONTRIBUTION: "The regular amount you add to the investment every month.",
            TOOLTIP_RETURN: "The expected average annual rate of return on your investment.",
            TOOLTIP_INFLATION: "The expected rate of price increases over time. Decreases purchasing power.",
            TOOLTIP_FREQUENCY: "How often interest is calculated and added to your balance.",
            TOOLTIP_HORIZON: "The total number of years you plan to keep your money invested."
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
            ADMIN_CONSOLE: "CONSOLA DE ADMIN",

            // Compound calculator strings
            COMPOUND_INTEREST: "INTERÉS COMPUESTO",
            INVESTMENT_SETTINGS: "CONFIGURACIÓN DE INVERSIÓN",
            ASSET_CLASS: "CLASE DE ACTIVO",
            STOCKS: "ACCIONES",
            CRYPTO: "CRIPTO",
            REAL_ESTATE: "BIENES RAÍCES",
            SAVINGS: "AHORROS",
            CUSTOM: "PERSONALIZADO",
            INITIAL_PRINCIPAL: "PRINCIPAL INICIAL",
            MONTHLY_CONTRIBUTION: "CONTRIBUCIÓN MENSUAL",
            ANNUAL_RETURN: "RETORNO ANUAL",
            INFLATION_RATE: "TASA DE INFLACIÓN",
            COMPOUND_FREQUENCY: "FRECUENCIA DE COMPOSICIÓN",
            ANNUALLY: "ANUALMENTE",
            QUARTERLY: "TRIMESTRALMENTE",
            MONTHLY_FREQ: "MENSUALMENTE",
            WEEKLY: "SEMANALMENTE",
            DAILY: "DIARIAMENTE",
            TIME_HORIZON: "HORIZONTE DE TIEMPO",
            YEARS: "AÑOS",
            CALCULATE_GROWTH: "CALCULAR CRECIMIENTO",
            GROWTH_PROJECTIONS: "PROYECCIONES DE CRECIMIENTO",
            TOTAL_BALANCE: "SALDO TOTAL",
            TOTAL_INTEREST: "INTERÉS TOTAL",
            REAL_VALUE_ADJ: "VALOR REAL (AJUSTADO POR INFLACIÓN)",
            INSPECT_YEAR_PROJECTION: "INSPECCIONAR PROYECCIÓN DE AÑO",
            PRINCIPAL: "CAPITAL",
            CONTRIBUTIONS: "CONTRIBUCIONES",
            INTEREST_GAINS: "INTERESES / GANANCIAS",
            TOTAL_BALANCE_ABBR: "BAL TOTAL",
            REAL_VALUE_ABBR: "VAL REAL",
            YEAR_BY_YEAR_BREAKDOWN: "DESGLOSE AÑO POR AÑO",
            YEAR: "AÑO",
            INTEREST: "INTERÉS",
            REAL_VALUE: "VALOR REAL",
            
            // Tooltips
            TOOLTIP_WEBHOOK_URL: "URL del servidor de destino para recibir cargas útiles de alertas JSON en tiempo real cuando se alcancen los umbrales de bombeo.",
            TOOLTIP_DEEPSEEK_KEY: "Ingrese su clave API de DeepSeek para activar la Capa de Decisión del Agente de IA. Si se deja vacío, las heurísticas locales evaluarán las rupturas.",
            TOOLTIP_EXCHANGES: "Seleccione los libros de mercado de intercambio centralizados o descentralizados para consultar en el descubrimiento.",
            TOOLTIP_INSTRUMENTS: "Seleccione libros de divisas al contado o contratos de permuta financiera de futuros perpetuos para el escaneo.",
            TOOLTIP_INTERVAL: "Segundos de espera entre ciclos de escaneo consecutivos. Los valores más bajos escanean más rápido pero aumentan el riesgo de límite de velocidad.",
            TOOLTIP_MAX_PAIRS: "Limite el número de pares de mayor volumen obtenidos de la fase de descubrimiento para concentrar el ancho de banda de escaneo.",
            TOOLTIP_VOL_MULT: "Factor de umbral para activar rupturas. El volumen actual de la vela de 5m debe superar el promedio de las últimas 49 velas por este multiplicador.",
            TOOLTIP_PRICE_VEL: "Ganancia porcentual mínima de precio en las últimas dos velas (10 minutos en total) para activar una ruptura técnica.",
            TOOLTIP_PRINCIPAL: "El capital inicial de su inversión.",
            TOOLTIP_CONTRIBUTION: "La cantidad regular que agrega a la inversión cada mes.",
            TOOLTIP_RETURN: "La tasa de rendimiento anual promedio esperada para su inversión.",
            TOOLTIP_INFLATION: "La tasa de aumento de precios esperada. Disminuye el poder adquisitivo.",
            TOOLTIP_FREQUENCY: "Con qué frecuencia se calculan y se agregan los intereses a su saldo.",
            TOOLTIP_HORIZON: "El número total de años que planea mantener su dinero invertido."
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
    // 7A. CMDB ROLE FEATURES LOADER & UPDATER                                    //
    // -------------------------------------------------------------------------- //

    async function loadAdminFeatures() {
        const tbody = document.getElementById('admin-features-table-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-placeholder">Loading features configuration...</td>
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
                    
                    const isSelfRole = roleName === 'admin';
                    const disabledAttr = isSelfRole ? 'disabled' : '';

                    row.innerHTML = `
                        <td>${roleName.replace('_', ' ').toUpperCase()}</td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="webhook_enabled" ${isWebhookChecked} ${disabledAttr}></td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="deepseek_enabled" ${isDeepseekChecked} ${disabledAttr}></td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="calculator_enabled" ${isCalcChecked} ${disabledAttr}></td>
                        <td><input type="checkbox" class="feature-toggle" data-role="${roleName}" data-feature="ledger_enabled" ${isLedgerChecked} ${disabledAttr}></td>
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
                        <td colspan="5" class="table-placeholder text-red">Error loading feature flags.</td>
                    </tr>`;
            }
        } catch (e) {
            console.error("Failed to load admin features:", e);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-placeholder text-red">Connection error.</td>
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
                ledger_enabled: 0
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

        // ── Element refs ──────────────────────────────────────────────
        const bottomNav       = document.getElementById('mobile-bottom-nav');
        const statusStrip     = document.getElementById('mobile-status-strip');
        const drawer          = document.getElementById('mobile-drawer');
        const drawerOverlay   = document.getElementById('mobile-drawer-overlay');
        const btnOpenDrawer   = document.getElementById('btn-mobile-settings');
        const btnCloseDrawer  = document.getElementById('btn-drawer-close');

        // Mobile mirrors of desktop stats
        const mssStatus   = document.getElementById('mss-status');
        const mssDot      = document.getElementById('mss-pulse');
        const mssPairs    = document.getElementById('mss-pairs');
        const mssRate     = document.getElementById('mss-rate');
        const drawerStatusTxt = document.getElementById('drawer-status-text');
        const drawerPairs     = document.getElementById('drawer-pairs-count');
        const drawerRate      = document.getElementById('drawer-rate-status');

        // Mobile bottom nav buttons
        const mobBtns = {
            dashboard: document.getElementById('mob-nav-dashboard'),
            accum:     document.getElementById('mob-nav-accum'),
            watchlist: document.getElementById('mob-nav-watchlist'),
            compound:  document.getElementById('mob-nav-compound'),
            admin:     document.getElementById('mob-nav-admin'),
        };

        // Desktop panels that exist in the grid
        const panels = {
            dashboard: document.querySelector('.breakout-radar'),
            accum:     document.querySelector('.accum-radar-panel'),
            watchlist: document.querySelector('.telemetry-deck'),
            compound:  document.getElementById('compound-interest-panel'),
            admin:     document.getElementById('admin-console-panel'),
        };

        // ── Drawer open / close ───────────────────────────────────────
        function openDrawer() {
            drawer.classList.add('open');
            drawerOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            syncDrawerStats();
        }
        function closeDrawer() {
            drawer.classList.remove('open');
            drawerOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }
        if (btnOpenDrawer)  btnOpenDrawer.addEventListener('click', openDrawer);
        if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
        if (drawerOverlay)  drawerOverlay.addEventListener('click', closeDrawer);

        // ── Mobile bottom nav view switching ─────────────────────────
        let activeView = 'dashboard';

        function showMobileView(view) {
            if (!IS_MOBILE()) return;
            activeView = view;

            // Update bottom nav active state
            Object.entries(mobBtns).forEach(([key, btn]) => {
                if (btn) btn.classList.toggle('active', key === view);
            });

            // For mobile: show only the target panel, hide others in the grid
            // We do this by stacking panels vertically and hiding non-active ones
            const grid = document.querySelector('.terminal-grid');
            if (!grid) return;

            // On mobile grid is 1-col — just scroll to the right panel
            // Better: hide/show panels so only one is visible at a time
            Object.entries(panels).forEach(([key, panel]) => {
                if (!panel) return;
                if (key === view) {
                    panel.style.display = '';
                    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (key !== 'compound' && key !== 'admin') {
                    // Standard grid panels hide/show
                    panel.style.display = (key === view) ? '' : 'none';
                }
            });

            // Special handling for compound / admin (they live outside the grid)
            const compoundPanel = document.getElementById('compound-interest-panel');
            const adminPanel    = document.getElementById('admin-console-panel');
            const mainGrid      = document.querySelector('.terminal-grid');

            if (view === 'compound') {
                if (mainGrid)      mainGrid.style.display = 'none';
                if (compoundPanel) { compoundPanel.style.display = 'grid'; compoundPanel.style.marginTop = '0'; }
                if (adminPanel)    adminPanel.style.display = 'none';
            } else if (view === 'admin') {
                if (mainGrid)      mainGrid.style.display = 'none';
                if (compoundPanel) compoundPanel.style.display = 'none';
                if (adminPanel)    { adminPanel.style.display = 'block'; adminPanel.style.marginTop = '0'; }
            } else {
                if (compoundPanel) compoundPanel.style.display = 'none';
                if (adminPanel)    adminPanel.style.display = 'none';
                if (mainGrid)      mainGrid.style.display = 'grid';

                // Show only the relevant grid panel
                Object.entries(panels).forEach(([key, panel]) => {
                    if (!panel || key === 'compound' || key === 'admin') return;
                    panel.style.display = (key === view) ? '' : 'none';
                });
            }

            // Close drawer if open
            closeDrawer();
        }

        // Wire bottom nav buttons
        Object.entries(mobBtns).forEach(([view, btn]) => {
            if (btn) btn.addEventListener('click', () => showMobileView(view));
        });

        // Also expose compound nav button in top nav to mobile nav
        const navCompound = document.getElementById('nav-compound');
        if (navCompound) {
            navCompound.addEventListener('click', () => {
                if (IS_MOBILE()) showMobileView('compound');
            });
        }

        // ── Desktop/Mobile mode toggle on resize ─────────────────────
        function applyResponsiveMode() {
            if (IS_MOBILE()) {
                if (bottomNav)  bottomNav.style.display = 'flex';
                if (statusStrip) statusStrip.style.display = 'flex';
                // Restore view after resize
                showMobileView(activeView);
            } else {
                if (bottomNav)  bottomNav.style.display = 'none';
                if (statusStrip) statusStrip.style.display = 'none';
                // Desktop: show all panels
                const mainGrid = document.querySelector('.terminal-grid');
                if (mainGrid) mainGrid.style.display = '';
                const compoundPanel = document.getElementById('compound-interest-panel');
                const adminPanel    = document.getElementById('admin-console-panel');
                // Panels: restore desktop visibility
                Object.values(panels).forEach(p => { if (p) p.style.display = ''; });
                if (compoundPanel) compoundPanel.style.display = 'none'; // controlled by top nav
                if (adminPanel)    adminPanel.style.display = 'none';
                closeDrawer();
            }
        }

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(applyResponsiveMode, 80);
        });

        // Initial apply
        applyResponsiveMode();

        // ── Status strip sync (poll desktop stat elements) ───────────
        function syncStatusStrip() {
            if (!IS_MOBILE()) return;
            // Sync from desktop stat elements
            if (systemStatusText && mssStatus) {
                mssStatus.textContent = systemStatusText.textContent;
                if (drawerStatusTxt) drawerStatusTxt.textContent = systemStatusText.textContent;
            }
            if (trackedPairsCount && mssPairs) {
                mssPairs.textContent = trackedPairsCount.textContent + ' PAIRS';
                if (drawerPairs) drawerPairs.textContent = trackedPairsCount.textContent;
            }
            if (rateLimitStatus && mssRate) {
                mssRate.textContent = rateLimitStatus.textContent;
                if (drawerRate) drawerRate.textContent = rateLimitStatus.textContent;
            }
            // Sync status dot color
            if (mssDot && systemStatusText) {
                const isOnline = systemStatusText.textContent.includes('ONLINE');
                mssDot.classList.toggle('online', isOnline);
            }
        }
        setInterval(syncStatusStrip, 1500);

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
        function syncDrawerStats() {
            const mobInterval = document.getElementById('mob-interval-sec');
            const mobMaxPairs = document.getElementById('mob-max-pairs');
            const mobVol      = document.getElementById('mob-vol-threshold');
            const mobPrice    = document.getElementById('mob-price-threshold');
            if (mobInterval && inputIntervalSec && inputIntervalSec.value) mobInterval.value = inputIntervalSec.value;
            if (mobMaxPairs && inputMaxPairs && inputMaxPairs.value)        mobMaxPairs.value = inputMaxPairs.value;
            if (mobVol && inputVolumeThreshold && inputVolumeThreshold.value) mobVol.value = inputVolumeThreshold.value;
            if (mobPrice && inputPriceThreshold && inputPriceThreshold.value) mobPrice.value = inputPriceThreshold.value;
            syncStatusStrip();
        }

        // Simulate alert from drawer
        const mobSim = document.getElementById('btn-sim-mobile');
        if (mobSim && btnTriggerSimulation) {
            mobSim.addEventListener('click', () => { btnTriggerSimulation.click(); closeDrawer(); });
        }

        // Theme toggle from drawer
        const btnThemeMobile = document.getElementById('btn-theme-mobile');
        if (btnThemeMobile && btnThemeToggle) {
            btnThemeMobile.addEventListener('click', () => btnThemeToggle.click());
        }

        // Language toggle from drawer
        const btnLangMobile = document.getElementById('btn-lang-mobile');
        const drawerLangLabel = document.getElementById('drawer-lang-label');
        if (btnLangMobile && btnLangToggle) {
            btnLangMobile.addEventListener('click', () => {
                btnLangToggle.click();
                if (drawerLangLabel) drawerLangLabel.textContent = btnLangToggle.textContent.trim();
            });
        }

        // Logout from drawer
        const btnLogoutMobile = document.getElementById('btn-logout-mobile');
        if (btnLogoutMobile && btnLogout) {
            btnLogoutMobile.addEventListener('click', () => { closeDrawer(); btnLogout.click(); });
        }

        // ── Admin nav button visibility sync ─────────────────────────
        // Mirror admin nav visibility to mobile bottom nav
        function syncAdminNav() {
            const mobAdminBtn = document.getElementById('mob-nav-admin');
            if (!mobAdminBtn || !navAdmin) return;
            mobAdminBtn.style.display = navAdmin.style.display === 'none' ? 'none' : '';
        }
        if (navAdmin) {
            new MutationObserver(syncAdminNav).observe(navAdmin, { attributes: true, attributeFilter: ['style'] });
        }
        syncAdminNav();

        // ── Expose showMobileView for external callers (e.g. router) ──
        window._showMobileView = showMobileView;
    }

    initMobileUX();
});

