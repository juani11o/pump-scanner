import { currentUser as commonUser } from './common.js';

// ADMIN CONSOLE CODE
    const API_BASE = `${window.location.protocol}//${window.location.host}`;
    function appendConsoleLine(msg, level) {
        console.log(`[Admin Console] [${level || 'info'}] ${msg}`);
        const consoleViewport = document.getElementById('console-viewport');
        if (consoleViewport) {
            const line = document.createElement('div');
            line.className = `console-line ${level}`;
            line.innerText = msg;
            consoleViewport.appendChild(line);
            consoleViewport.scrollTop = consoleViewport.scrollHeight;
        }
    }
    
    // Add Start/Stop logic
    const btnStartScanner = document.getElementById('btn-start-scanner');
    const btnStopScanner = document.getElementById('btn-stop-scanner');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    
    if (btnClearLogs) {
        btnClearLogs.addEventListener('click', () => {
            const consoleViewport = document.getElementById('console-viewport');
            if (consoleViewport) consoleViewport.innerHTML = '';
        });
    }

    if (btnStartScanner) {
        btnStartScanner.addEventListener('click', async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/start`, { method: 'POST' });
                if (resp.ok) {
                    appendConsoleLine("[SYSTEM] Scan initiation command received.", "line-success");
                    if (window.adminWs) window.adminWs.send("refresh");
                }
            } catch (e) {
                appendConsoleLine(`[SYSTEM] Failure: ${e.message}`, "line-error");
            }
        });
    }

    if (btnStopScanner) {
        btnStopScanner.addEventListener('click', async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/stop`, { method: 'POST' });
                if (resp.ok) {
                    appendConsoleLine("[SYSTEM] Scan termination command received.", "line-warn");
                    if (window.adminWs) window.adminWs.send("refresh");
                }
            } catch (e) {
                appendConsoleLine(`[SYSTEM] Failure: ${e.message}`, "line-error");
            }
        });
    }

    function getLogStyleClass(msg) {
        if (msg.includes("CRITICAL") || msg.includes("Failure") || msg.includes("Failed")) return "line-error";
        if (msg.includes("🚨") || msg.includes("Rate limit") || msg.includes("⚠️")) return "line-warn";
        if (msg.includes("💥") || msg.includes("✅") || msg.includes("dispatched") || msg.includes("success")) return "line-success";
        if (msg.includes("Stage") || msg.includes("Scanning") || msg.includes("initialized")) return "line-dim";
        return "line-info";
    }

    // Settings Form Logic
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

    if (configForm) {
        configForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const exchanges = [];
            if (chkExchangeBinance && chkExchangeBinance.checked) exchanges.push('binance');
            if (chkExchangeBybit && chkExchangeBybit.checked) exchanges.push('bybit');
            if (chkExchangeHyperliquid && chkExchangeHyperliquid.checked) exchanges.push('hyperliquid');
            
            const instruments = [];
            if (chkInstSpot && chkInstSpot.checked) instruments.push('spot');
            if (chkInstFuture && chkInstFuture.checked) instruments.push('future');

            if (exchanges.length === 0) {
                alert("Please select at least one Exchange.");
                return;
            }
            if (instruments.length === 0) {
                alert("Please select at least one Instrument.");
                return;
            }

            try {
                if(btnSaveSettings) {
                    btnSaveSettings.disabled = true;
                    btnSaveSettings.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> SAVING...`;
                }

                // Fetch current settings to preserve LLM keys that are no longer in this form
                const statusResp = await fetch(`${API_BASE}/api/status`);
                let currentSettings = {};
                if (statusResp.ok) {
                    const statusData = await statusResp.json();
                    currentSettings = statusData.settings || {};
                }

                const selectLlmProvider = document.getElementById('select-llm-provider');
                const settings = {
                    ...currentSettings,
                    interval_sec: inputIntervalSec ? parseInt(inputIntervalSec.value) : 60,
                    volume_multiplier: inputVolumeThreshold ? parseFloat(inputVolumeThreshold.value) : 1.8,
                    price_velocity_pct: inputPriceThreshold ? parseFloat(inputPriceThreshold.value) : 0.8,
                    exchanges: exchanges,
                    instruments: instruments,
                    max_pairs: inputMaxPairs ? parseInt(inputMaxPairs.value) : 300
                };

                const resp = await fetch(`${API_BASE}/api/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });

                if (resp.ok) {
                    appendConsoleLine("[SYSTEM] Settings updated successfully.", "line-success");
                    if (window.adminWs) window.adminWs.send("refresh");
                } else {
                    appendConsoleLine("[SYSTEM] Failed to save configurations. Check formatting.", "line-error");
                }
            } catch (e) {
                appendConsoleLine(`[SYSTEM] API Connection fault on settings write: ${e.message}`, "line-error");
            } finally {
                if(btnSaveSettings) {
                    btnSaveSettings.disabled = false;
                    btnSaveSettings.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> SAVE CONFIGURATION`;
                }
            }
        });
    }

    // TRIGGER SIMULATION ALERTS
    const btnTriggerSimulation = document.getElementById('btn-trigger-simulation');
    const btnTriggerAccumSim = document.getElementById('btn-trigger-accum-sim');

    if (btnTriggerSimulation) {
        btnTriggerSimulation.addEventListener('click', async () => {
            try {
                btnTriggerSimulation.disabled = true;
                btnTriggerSimulation.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> DISPATCHING...`;
                
                const resp = await fetch(`${API_BASE}/api/trigger_simulation`, { method: 'POST' });
                if (resp.ok) {
                    appendConsoleLine("[SYSTEM] Simulation triggered. Emitting mock Stage 3 telemetry.", "line-success");
                }
            } catch (e) {
                appendConsoleLine(`[SYSTEM] Simulation fault: ${e.message}`, "line-error");
            } finally {
                setTimeout(() => {
                    btnTriggerSimulation.disabled = false;
                    btnTriggerSimulation.innerHTML = `<i class="fa-solid fa-bolt"></i> FIRE BREAKOUT`;
                }, 1000);
            }
        });
    }

    if (btnTriggerAccumSim) {
        btnTriggerAccumSim.addEventListener('click', async () => {
            try {
                btnTriggerAccumSim.disabled = true;
                btnTriggerAccumSim.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> SCANNING...`;
                const resp = await fetch(`${API_BASE}/api/trigger_accum_simulation`, { method: 'POST' });
                if (resp.ok) {
                    appendConsoleLine('[SYSTEM] Accumulation simulation fired. Check ACCUM_RADAR panel.', 'line-success');
                }
            } catch (e) {
                appendConsoleLine(`[SYSTEM] Accum simulation fault: ${e.message}`, 'line-error');
            } finally {
                setTimeout(() => {
                    btnTriggerAccumSim.disabled = false;
                    btnTriggerAccumSim.innerHTML = `<i class="fa-solid fa-eye"></i> SIMULATE ACCUM`;
                }, 1000);
            }
        });
    }

    // Connect admin websocket
    function connectAdminWebSocket() {
        const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const WS_URL = `${WS_PROTOCOL}//${window.location.host}/api/ws/logs`;
        const ws = new WebSocket(WS_URL);
        window.adminWs = ws;
        
        ws.onopen = () => appendConsoleLine("[SYSTEM] Admin WebSocket linked. Streaming logs.", "line-success");
        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === 'HISTORY') {
                    const consoleViewport = document.getElementById('console-viewport');
                    if (consoleViewport) consoleViewport.innerHTML = '';
                    payload.logs.forEach(log => appendConsoleLine(log, getLogStyleClass(log)));
                    
                    if (payload.status.active) {
                        if (btnStartScanner) { btnStartScanner.disabled = true; btnStartScanner.classList.add('disabled'); }
                        if (btnStopScanner) { btnStopScanner.disabled = false; btnStopScanner.classList.remove('disabled'); }
                    } else {
                        if (btnStartScanner) { btnStartScanner.disabled = false; btnStartScanner.classList.remove('disabled'); }
                        if (btnStopScanner) { btnStopScanner.disabled = true; btnStopScanner.classList.add('disabled'); }
                    }
                    
                    // Populate config inputs from backend state
                    if (payload.status.settings) {
                        const s = payload.status.settings;
                        if (inputIntervalSec) inputIntervalSec.value = s.interval_sec;
                        if (inputMaxPairs) inputMaxPairs.value = s.max_pairs;
                        if (inputVolumeThreshold) inputVolumeThreshold.value = s.volume_multiplier;
                        if (inputPriceThreshold) inputPriceThreshold.value = s.price_velocity_pct;
                        
                        if (chkExchangeBinance) chkExchangeBinance.checked = s.exchanges.includes('binance');
                        if (chkExchangeBybit) chkExchangeBybit.checked = s.exchanges.includes('bybit');
                        if (chkExchangeHyperliquid) chkExchangeHyperliquid.checked = s.exchanges.includes('hyperliquid');
                        
                        if (chkInstSpot) chkInstSpot.checked = s.instruments.includes('spot');
                        if (chkInstFuture) chkInstFuture.checked = s.instruments.includes('future');
                        
                        if (inputWebhookUrl) inputWebhookUrl.value = s.webhook_url || "";
                        if (inputOpenaiKey && s.openai_api_key) inputOpenaiKey.value = s.openai_api_key;
                        if (inputAnthropicKey && s.anthropic_api_key) inputAnthropicKey.value = s.anthropic_api_key;
                        if (inputGeminiKey && s.gemini_api_key) inputGeminiKey.value = s.gemini_api_key;
                        if (inputDeepseekKey && s.deepseek_api_key) inputDeepseekKey.value = s.deepseek_api_key;
                        
                        const selectLlmProvider = document.getElementById('select-llm-provider');
                        if (selectLlmProvider && s.llm_provider) {
                            selectLlmProvider.value = s.llm_provider;
                        }
                    }
                } else if (payload.type === 'LOG') {
                    appendConsoleLine(payload.message, getLogStyleClass(payload.message));
                } else if (payload.type === 'STATUS_REFRESH') {
                    if (payload.status.active) {
                        if (btnStartScanner) { btnStartScanner.disabled = true; btnStartScanner.classList.add('disabled'); }
                        if (btnStopScanner) { btnStopScanner.disabled = false; btnStopScanner.classList.remove('disabled'); }
                    } else {
                        if (btnStartScanner) { btnStartScanner.disabled = false; btnStartScanner.classList.remove('disabled'); }
                        if (btnStopScanner) { btnStopScanner.disabled = true; btnStopScanner.classList.add('disabled'); }
                    }
                }
            } catch(e){}
        };
        ws.onclose = () => setTimeout(connectAdminWebSocket, 3000);
    }
    
    connectAdminWebSocket();
    const adminConsolePanel = document.getElementById('admin-console-panel');
    const adminUsersTableBody = document.getElementById('admin-users-table-body');
    const adminTabUsers = document.getElementById('admin-tab-users');
    const adminTabStats = document.getElementById('admin-tab-stats');
    const adminTabFeatures = document.getElementById('admin-tab-features');
    const adminViewUsers = document.getElementById('admin-view-users');
    const adminViewStats = document.getElementById('admin-view-stats');
    const adminViewFeatures = document.getElementById('admin-view-features');
    const adminSubTitle = document.getElementById('admin-sub-title');
    const statTotalUsers = document.getElementById('stat-total-users');
    const statActiveSessions = document.getElementById('stat-active-sessions');
    const statMonitoredPairs = document.getElementById('stat-monitored-pairs');
    const statAlertsDispatched = document.getElementById('stat-alerts-dispatched');

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
                    
                    const isSelf = user.email === commonUser.email || user.id === commonUser.id;
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
                appendConsoleLine(`Feature flags updated for role ${role.toUpperCase()}.`, 'line-success');
            } else {
                appendConsoleLine(`Failed to update feature flags for ${role.toUpperCase()}.`, 'line-error');
            }
        } catch (e) {
            appendConsoleLine(`Error updating feature flags: ${e.message}`, 'line-error');
        }
    }

    if (commonUser) {
        initAdminConsoleEvents();
        loadAdminUsers();
    } else {
        window.addEventListener('authReady', () => {
            initAdminConsoleEvents();
            loadAdminUsers();
        });
    }

    function initAdminConsoleEvents() {
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
                if (adminViewStats) adminViewStats.style.display = 'flex';
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
    }