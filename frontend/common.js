import { translations } from './translations.js';

// Global variables
export let currentUser = null;
export let currentLang = localStorage.getItem('lang') || 'en';

const API_BASE = `${window.location.protocol}//${window.location.host}`;

document.addEventListener('DOMContentLoaded', () => {

    // Auth DOM Elements injected from app.js
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




    // Auth Form Handlers injected from app.js
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



    initCommon();
});

async function initCommon() {
    initTheme();
    initLanguage();
    await checkAuth();
    initMobileUX();
    if (currentUser) {
        fetchStatus();
        setInterval(fetchStatus, 5000);
    }
}

// 1. Theme Initialization & Control
function initTheme() {
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (btnThemeToggle) btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('light-mode');
        if (btnThemeToggle) btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            btnThemeToggle.innerHTML = isLight 
                ? '<i class="fa-solid fa-sun"></i>' 
                : '<i class="fa-solid fa-moon"></i>';
            
            // Dispatch event for page-specific chart reloads
            window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: isLight ? 'light' : 'dark' } }));
        });
    }
}

// 2. Language Initialization & Control
function initLanguage() {
    const btnLangToggle = document.getElementById('btn-lang-toggle');
    if (btnLangToggle) {
        btnLangToggle.querySelector('span').innerText = currentLang === 'en' ? 'ES' : 'EN';
        btnLangToggle.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'es' : 'en';
            localStorage.setItem('lang', currentLang);
            btnLangToggle.querySelector('span').innerText = currentLang === 'en' ? 'ES' : 'EN';
            applyTranslations();
            applyNavigationGates();
        });
    }
    applyTranslations();
}

export function applyTranslations() {
    // Translate text elements
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[currentLang] && translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });

    // Translate input placeholders
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        if (translations[currentLang] && translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });
}

// 3. Authentication & Gating
async function checkAuth() {
    try {
        const resp = await fetch(`${API_BASE}/api/auth/user`);
        if (resp.status === 200) {
            currentUser = await resp.json();
            
            // Populate profile badge
            const userName = document.getElementById('user-name');
            const userAvatar = document.getElementById('user-avatar');
            const userRoleBadge = document.getElementById('user-role-badge');
            
            if (userName) userName.innerText = currentUser.name;
            if (userAvatar) userAvatar.src = currentUser.picture || 'https://api.dicebear.com/7.x/bottts/svg?seed=default';
            if (userRoleBadge) {
                userRoleBadge.innerText = currentUser.role.replace('_', ' ').toUpperCase();
                userRoleBadge.className = `badge badge-${currentUser.role}`;
            }

            // Show navigation & badge
            const headerNav = document.getElementById('header-nav');
            const userProfileBadge = document.getElementById('user-profile-badge');
            const loginOverlay = document.getElementById('login-overlay');
            const mobileBottomNav = document.getElementById('mobile-bottom-nav');

            if (headerNav) headerNav.style.display = 'flex';
            if (mobileBottomNav) mobileBottomNav.style.display = 'flex';
            if (userProfileBadge) userProfileBadge.style.display = 'flex';
            if (loginOverlay) loginOverlay.style.display = 'none';

            // Wire logout button
            const btnLogout = document.getElementById('btn-logout');
            if (btnLogout) {
                btnLogout.addEventListener('click', async () => {
                    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
                    window.location.href = '/';
                });
            }

            applyNavigationGates();
            setActiveNavigationTab();
            checkPageSpecificAccess();

            // Dispatch auth ready event
            window.dispatchEvent(new CustomEvent('authReady', { detail: currentUser }));
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
    const path = window.location.pathname;
    
    // Redirect to home page if on gated page and unauthorized
    if (path !== '/' && path !== '/index.html') {
        window.location.href = '/';
        return;
    }

    const headerNav = document.getElementById('header-nav');
    const userProfileBadge = document.getElementById('user-profile-badge');
    const loginOverlay = document.getElementById('login-overlay');
    const mobileBottomNav = document.getElementById('mobile-bottom-nav');

    if (headerNav) headerNav.style.display = 'none';
    if (mobileBottomNav) mobileBottomNav.style.display = 'none';
    if (userProfileBadge) userProfileBadge.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'flex';
}

function applyNavigationGates() {
    if (!currentUser) return;
    
    const isAdmin = currentUser.role === 'admin';
    const features = currentUser.features || {};
    
    // Admin Console visibility
    const navAdmin = document.getElementById('nav-admin');
    const mobBtnAdmin = document.getElementById('mob-btn-admin');
    if (navAdmin) navAdmin.style.display = isAdmin ? 'inline-block' : 'none';
    if (mobBtnAdmin) mobBtnAdmin.style.display = isAdmin ? 'flex' : 'none';

    // Calculator visibility
    const navCompound = document.getElementById('nav-compound');
    const mobBtnCalc = document.getElementById('mob-btn-calc');
    const hasCalculator = !!features.calculator_enabled;
    if (navCompound) navCompound.style.display = hasCalculator ? 'inline-block' : 'none';
    if (mobBtnCalc) mobBtnCalc.style.display = hasCalculator ? 'flex' : 'none';

    // Ledger labeling / locks
    const hasLedger = isAdmin || !!features.ledger_enabled;
    const navLedger = document.getElementById('nav-ledger');
    const mobBtnTrades = document.getElementById('mob-btn-trades');
    
    if (navLedger) {
        const span = navLedger.querySelector('span');
        if (span) {
            span.innerText = hasLedger 
                ? (currentLang === 'en' ? 'MY_TRADES' : 'MIS_OPERACIONES')
                : (currentLang === 'en' ? 'MY_TRADES (🔒)' : 'MIS_OPERACIONES (🔒)');
        }
    }
    
    if (mobBtnTrades) {
        const span = mobBtnTrades.querySelector('span');
        if (span) {
            span.innerText = hasLedger 
                ? (currentLang === 'en' ? 'MY TRADES' : 'MIS REGISTROS')
                : (currentLang === 'en' ? 'MY TRADES (🔒)' : 'MIS REGISTROS (🔒)');
        }
    }

    // Intercept ledger clicks if locked
    const handleLedgerClick = (e) => {
        if (!hasLedger) {
            e.preventDefault();
            const ledgerLockedModal = document.getElementById('ledger-locked-modal');
            if (ledgerLockedModal) {
                ledgerLockedModal.style.display = 'flex';
                // Bind close modal events
                const btnCloseLedgerModal = document.getElementById('btn-close-ledger-modal');
                const btnCloseLedgerModalOk = document.getElementById('btn-close-ledger-modal-ok');
                if (btnCloseLedgerModal) {
                    btnCloseLedgerModal.onclick = () => ledgerLockedModal.style.display = 'none';
                }
                if (btnCloseLedgerModalOk) {
                    btnCloseLedgerModalOk.onclick = () => ledgerLockedModal.style.display = 'none';
                }
            }
        }
    };

    if (navLedger) navLedger.onclick = handleLedgerClick;
    if (mobBtnTrades) mobBtnTrades.onclick = handleLedgerClick;
}

function setActiveNavigationTab() {
    const path = window.location.pathname;
    
    const tabs = {
        '/': ['nav-dashboard', 'mob-btn-dash'],
        '/index.html': ['nav-dashboard', 'mob-btn-dash'],
        '/calculator': ['nav-compound', 'mob-btn-calc'],
        '/calculator.html': ['nav-compound', 'mob-btn-calc'],
        '/admin': ['nav-admin', 'mob-btn-admin'],
        '/admin.html': ['nav-admin', 'mob-btn-admin'],
        '/trades': ['nav-ledger', 'mob-btn-trades'],
        '/trades.html': ['nav-ledger', 'mob-btn-trades']
    };

    // Remove active class from all tabs
    document.querySelectorAll('.nav-item, .mob-nav-btn').forEach(el => el.classList.remove('active'));

    const activeIds = tabs[path];
    if (activeIds) {
        activeIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('active');
        });
    }
}

function checkPageSpecificAccess() {
    const path = window.location.pathname;
    const isAdmin = currentUser.role === 'admin';
    const features = currentUser.features || {};

    if ((path === '/admin' || path === '/admin.html') && !isAdmin) {
        alert("ACCESS DENIED: Admin credentials required.");
        window.location.href = '/';
    }

    if ((path === '/trades' || path === '/trades.html') && !isAdmin && !features.ledger_enabled) {
        alert("ACCESS DENIED: Trades Journal feature flag is disabled.");
        window.location.href = '/';
    }

    if ((path === '/calculator' || path === '/calculator.html') && !features.calculator_enabled) {
        alert("ACCESS DENIED: Calculator is disabled.");
        window.location.href = '/';
    }
}

// Mobile Drawer & Status Strip setup
function initMobileUX() {
    const bottomNav = document.getElementById('mobile-bottom-nav');
    const statusStrip = document.getElementById('mobile-status-strip');
    const drawer = document.getElementById('mobile-drawer');
    const btnOpenDrawer = document.getElementById('btn-mobile-settings');
    const btnCloseDrawer = document.getElementById('btn-drawer-close');
    
    // Create drawer overlay dynamically if missing
    let drawerOverlay = document.getElementById('mobile-drawer-overlay');
    if (!drawerOverlay && drawer) {
        drawerOverlay = document.createElement('div');
        drawerOverlay.id = 'mobile-drawer-overlay';
        drawerOverlay.className = 'mobile-drawer-overlay';
        document.body.appendChild(drawerOverlay);
    }
    
    function openDrawer() {
        if (drawer) drawer.classList.add('open');
        if (drawerOverlay) drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        syncDrawerStats();
    }
    
    function closeDrawer() {
        if (drawer) drawer.classList.remove('open');
        if (drawerOverlay) drawerOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }
    
    if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
    
    // Mirror theme/lang/logout buttons to mobile drawer
    const btnThemeMobile = document.getElementById('btn-theme-mobile');
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeMobile && btnThemeToggle) {
        btnThemeMobile.addEventListener('click', () => btnThemeToggle.click());
    }
    
    const btnLangMobile = document.getElementById('btn-lang-mobile');
    const btnLangToggle = document.getElementById('btn-lang-toggle');
    const drawerLangLabel = document.getElementById('drawer-lang-label');
    if (btnLangMobile && btnLangToggle) {
        btnLangMobile.addEventListener('click', () => {
            btnLangToggle.click();
            if (drawerLangLabel) {
                drawerLangLabel.textContent = currentLang === 'en' ? 'ES' : 'EN';
            }
        });
    }
    
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogoutMobile && btnLogout) {
        btnLogoutMobile.addEventListener('click', () => {
            closeDrawer();
            btnLogout.click();
        });
    }
    
    // Auto-display mobile bars based on width
    const IS_MOBILE = () => window.innerWidth <= 768;
    function applyResponsiveMode() {
        if (IS_MOBILE()) {
            if (bottomNav) bottomNav.style.display = 'flex';
            if (statusStrip) statusStrip.style.display = 'flex';
            syncDrawerStats();
        } else {
            if (bottomNav) bottomNav.style.display = 'none';
            if (statusStrip) statusStrip.style.display = 'none';
            closeDrawer();
        }
    }
    
    window.addEventListener('resize', applyResponsiveMode);
    applyResponsiveMode();
    syncDrawerStats();
}

function syncDrawerStats() {
    const systemStatusText = document.getElementById('system-status-text');
    const trackedPairsCount = document.getElementById('tracked-pairs-count');
    const rateLimitStatus = document.getElementById('rate-limit-status');

    const drawerStatusTxt = document.getElementById('drawer-status-text');
    const drawerPairs = document.getElementById('drawer-pairs-count');
    const drawerRate = document.getElementById('drawer-rate-status');

    const mssStatus = document.getElementById('mss-status');
    const mssPairs = document.getElementById('mss-pairs');
    const mssRate = document.getElementById('mss-rate');

    if (systemStatusText) {
        const txt = systemStatusText.textContent;
        if (drawerStatusTxt) {
            drawerStatusTxt.textContent = txt;
            drawerStatusTxt.className = systemStatusText.className;
        }
        if (mssStatus) mssStatus.textContent = txt;
        
        // Update mss-pulse color class
        const mssPulse = document.getElementById('mss-pulse');
        if (mssPulse) {
            const isOnline = txt.includes('ONLINE');
            mssPulse.className = isOnline ? "mss-dot green-pulse" : "mss-dot red-pulse";
        }
    }
    if (trackedPairsCount) {
        const val = trackedPairsCount.textContent;
        if (drawerPairs) drawerPairs.textContent = val;
        if (mssPairs) mssPairs.textContent = val + (val.includes('PAIRS') ? '' : ' PAIRS');
    }
    if (rateLimitStatus) {
        const val = rateLimitStatus.textContent;
        if (drawerRate) drawerRate.textContent = val;
        if (mssRate) mssRate.textContent = val;
    }
}

async function fetchStatus() {
    if (!currentUser) return;
    try {
        const resp = await fetch(`${API_BASE}/api/status`);
        if (resp.status === 200) {
            const status = await resp.json();
            
            const systemStatusText = document.getElementById('system-status-text');
            const trackedPairsCount = document.getElementById('tracked-pairs-count');
            
            const mssStatus = document.getElementById('mss-status');
            const mssPulse = document.getElementById('mss-pulse');
            const mssPairs = document.getElementById('mss-pairs');
            
            const drawerStatusTxt = document.getElementById('drawer-status-text');
            const drawerPairs = document.getElementById('drawer-pairs-count');
            
            const active = status.active;
            const statusStr = active ? "ONLINE" : "OFFLINE";
            const statusClass = active ? "stat-value text-green" : "stat-value text-red";
            const mssPulseClass = active ? "mss-dot green-pulse" : "mss-dot red-pulse";
            
            if (systemStatusText) {
                systemStatusText.innerText = statusStr;
                systemStatusText.className = statusClass;
            }
            if (trackedPairsCount) {
                trackedPairsCount.innerText = status.monitored_count;
            }
            
            if (mssStatus) {
                mssStatus.innerText = statusStr;
            }
            if (mssPulse) {
                mssPulse.className = mssPulseClass;
            }
            if (mssPairs) {
                mssPairs.innerText = status.monitored_count + ' PAIRS';
            }
            
            if (drawerStatusTxt) {
                drawerStatusTxt.innerText = statusStr;
                drawerStatusTxt.className = active ? "drawer-stat-value text-green" : "drawer-stat-value text-red";
            }
            if (drawerPairs) {
                drawerPairs.innerText = status.monitored_count;
            }
        }
    } catch (e) {
        console.error("Failed to fetch scanner status:", e);
    }
}
