import { currentUser as commonUser } from './common.js';
// TRADES LEDGER CODE

    const API_BASE = `${window.location.protocol}//${window.location.host}`;
    const ledgerLockedModal = document.getElementById('ledger-locked-modal');
    const tradesLedgerPanel = document.getElementById('trades-ledger-panel');
    const tradeJournalForm = document.getElementById('trade-journal-form');
    const tradeJournalTableBody = document.getElementById('trade-journal-table-body');
    const tradeSearch = document.getElementById('trade-search');
    const btnJournalAnalytics = document.getElementById('btn-journal-analytics');
    const btnNewTrade = document.getElementById('btn-new-trade');
    let tradeJournalEntries = [];

    function getTradeFormPayload() {
        const value = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };
        const numberValue = (id) => {
            const raw = value(id);
            return raw === '' ? null : Number(raw);
        };

        const pnl = numberValue('trade-pnl');
        const entry = numberValue('trade-entry-price') || 0;
        const exit = numberValue('trade-exit-price');
        const qty = numberValue('trade-quantity') || 0;
        const fees = numberValue('trade-fees') || 0;
        let profitPct = null;

        if (pnl !== null && entry && qty) {
            profitPct = (pnl / (entry * qty)) * 100;
        }

        return {
            platform: value('trade-platform'),
            asset_class: value('trade-asset-class'),
            symbol: value('trade-symbol'),
            trade_type: value('trade-type'),
            side: value('trade-side'),
            status: value('trade-status'),
            entry_date: value('trade-entry-date'),
            exit_date: value('trade-exit-date'),
            entry_price: entry,
            exit_price: exit,
            quantity: qty,
            fees,
            profit_loss: pnl,
            profit_pct: profitPct,
            strategy: value('trade-strategy'),
            setup: value('trade-setup'),
            timeframe: value('trade-timeframe'),
            conviction: numberValue('trade-conviction') || 5,
            emotion: value('trade-emotion'),
            mistakes: value('trade-mistakes'),
            lessons: value('trade-lessons'),
            tags: value('trade-tags'),
            notes: value('trade-notes')
        };
    }

    function formatMoney(value) {
        const num = Number(value || 0);
        return `${num < 0 ? '-' : ''}$${Math.abs(num).toFixed(2)}`;
    }

    function formatPct(value) {
        return `${Number(value || 0).toFixed(2)}%`;
    }

    async function loadTradeJournal() {
        if (!tradeJournalTableBody) return;
        tradeJournalTableBody.innerHTML = '<tr><td colspan="8" class="table-placeholder">Loading journal...</td></tr>';
        try {
            const resp = await fetch(`${API_BASE}/api/user/trades`);
            if (!resp.ok) throw new Error('Failed to load trade journal');
            tradeJournalEntries = await resp.json();
            renderTradeJournal();
        } catch (e) {
            tradeJournalTableBody.innerHTML = '<tr><td colspan="8" class="table-placeholder text-red">Unable to load journal.</td></tr>';
            appendConsoleLine(`[SYSTEM] Trade journal load failed: ${e.message}`, 'line-error');
        }
    }

    function renderTradeJournal() {
        if (!tradeJournalTableBody) return;
        const query = tradeSearch ? tradeSearch.value.trim().toLowerCase() : '';
        const rows = tradeJournalEntries.filter(trade => {
            const haystack = [
                trade.symbol || trade.ticker,
                trade.platform,
                trade.asset_class,
                trade.strategy,
                trade.setup,
                trade.tags,
                trade.notes
            ].join(' ').toLowerCase();
            return !query || haystack.includes(query);
        });

        updateJournalStats(tradeJournalEntries);

        if (!rows.length) {
            tradeJournalTableBody.innerHTML = '<tr><td colspan="8" class="table-placeholder">No matching journal entries.</td></tr>';
            return;
        }

        tradeJournalTableBody.innerHTML = rows.map(trade => {
            const symbol = trade.symbol || trade.ticker || '';
            const pnl = Number(trade.profit_loss || 0);
            const pnlClass = pnl >= 0 ? 'journal-pnl-positive' : 'journal-pnl-negative';
            return `
                <tr>
                    <td><span class="journal-symbol">${symbol}</span><span class="journal-meta">${trade.asset_class || ''} ${trade.timeframe || ''}</span></td>
                    <td>${(trade.side || trade.type || '').toUpperCase()}</td>
                    <td>${(trade.status || 'closed').toUpperCase()}</td>
                    <td>${trade.platform || '-'}</td>
                    <td class="${pnlClass}">${formatMoney(pnl)}</td>
                    <td class="${pnlClass}">${formatPct(trade.profit_pct)}</td>
                    <td>${trade.strategy || '-'}</td>
                    <td><button class="journal-delete-btn" data-trade-id="${trade.id}" title="Delete trade"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        }).join('');

        tradeJournalTableBody.querySelectorAll('.journal-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tradeId = btn.dataset.tradeId;
                if (!confirm('Delete this journal entry?')) return;
                await deleteTradeJournalEntry(tradeId);
            });
        });
    }

    function updateJournalStats(entries) {
        const countEl = document.getElementById('journal-stat-count');
        const winrateEl = document.getElementById('journal-stat-winrate');
        const pnlEl = document.getElementById('journal-stat-pnl');
        const avgEl = document.getElementById('journal-stat-avg');

        const closed = entries.filter(t => (t.status || 'closed') === 'closed');
        const wins = closed.filter(t => Number(t.profit_loss || 0) > 0).length;
        const totalPnl = entries.reduce((sum, t) => sum + Number(t.profit_loss || 0), 0);
        const avgReturn = closed.length
            ? closed.reduce((sum, t) => sum + Number(t.profit_pct || 0), 0) / closed.length
            : 0;

        if (countEl) countEl.textContent = entries.length;
        if (winrateEl) winrateEl.textContent = `${closed.length ? Math.round((wins / closed.length) * 100) : 0}%`;
        if (pnlEl) {
            pnlEl.textContent = formatMoney(totalPnl);
            pnlEl.className = totalPnl >= 0 ? 'journal-pnl-positive' : 'journal-pnl-negative';
        }
        if (avgEl) avgEl.textContent = formatPct(avgReturn);
    }

    function appendConsoleLine(msg, level) {
        console.log(`[Trade Journal] [${level || 'info'}] ${msg}`);
    }

    async function deleteTradeJournalEntry(tradeId) {
        try {
            const resp = await fetch(`${API_BASE}/api/user/trades/${tradeId}`, { method: 'DELETE' });
            if (!resp.ok) throw new Error('Delete failed');
            appendConsoleLine('Trade journal entry deleted.', 'line-success');
            loadTradeJournal();
        } catch (e) {
            appendConsoleLine(`Delete failed: ${e.message}`, 'line-error');
        }
    }

    function initTrades() {
        if (tradeJournalForm) {
            tradeJournalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = getTradeFormPayload();
                if (!payload.symbol || !payload.entry_price) {
                    alert('Symbol and entry price are required.');
                    return;
                }
                try {
                    const resp = await fetch(`${API_BASE}/api/user/trades`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (resp.ok) {
                        tradeJournalForm.reset();
                        const conviction = document.getElementById('trade-conviction');
                        if (conviction) conviction.value = 5;
                        
                        const entryDate = document.getElementById('trade-entry-date');
                        if (entryDate) entryDate.value = new Date().toISOString().slice(0, 16);
                        
                        alert("Trade journal entry saved successfully.");
                        loadTradeJournal();
                    } else {
                        const err = await resp.json();
                        alert("Failed to save: " + (err.detail || "Unknown error"));
                    }
                } catch (err) {
                    alert("Error saving trade: " + err.message);
                }
            });
        }

        if (tradeSearch) {
            tradeSearch.addEventListener('input', renderTradeJournal);
        }

        if (btnNewTrade) {
            btnNewTrade.addEventListener('click', () => {
                const entryDate = document.getElementById('trade-entry-date');
                if (entryDate) entryDate.value = new Date().toISOString().slice(0, 16);
                tradeJournalForm.scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (btnJournalAnalytics) {
            btnJournalAnalytics.addEventListener('click', () => {
                alert('Analytics workspace is ready for the next layer: expectancy, win rate by setup, risk patterns, mistakes, emotions, and recommendations.');
            });
        }
        
        loadTradeJournal();
    }

    if (commonUser) {
        initTrades();
    } else {
        window.addEventListener('authReady', () => {
            initTrades();
        });
    }
