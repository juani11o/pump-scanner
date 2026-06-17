import { currentUser as commonUser } from './common.js';

// ADMIN CONSOLE CODE
    const API_BASE = `${window.location.protocol}//${window.location.host}`;
    function appendConsoleLine(msg, level) {
        console.log(`[Admin Console] [${level || 'info'}] ${msg}`);
    }
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
    }