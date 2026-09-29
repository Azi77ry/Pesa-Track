// Investments Module — Net Worth & Investment Portfolio Tracker

async function getUserInvestments(userId) {
    try {
        if (!DB.db.objectStoreNames.contains('investments')) return [];
        return DB.getAllByIndex('investments', 'userId', userId);
    } catch { return []; }
}

// ─── Show Add Investment Modal ────────────────────────────────────────────────
function showAddInvestmentModal(existing = null) {
    const modalEl = document.getElementById('investmentModal');
    if (!modalEl) return;
    document.getElementById('investment-form').reset();
    document.getElementById('investment-id').value = existing ? existing.id : '';
    if (existing) {
        document.getElementById('investment-name').value = existing.name || '';
        document.getElementById('investment-type').value = existing.type || 'savings';
        document.getElementById('investment-amount').value = existing.amount || '';
        document.getElementById('investment-current').value = existing.currentValue || '';
        document.getElementById('investment-notes').value = existing.notes || '';
    }
    const title = modalEl.querySelector('.modal-title');
    if (title) title.textContent = existing ? 'Edit Investment' : 'Add Investment';
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// ─── Handle Investment Submit ─────────────────────────────────────────────────
async function handleInvestmentSubmit(event) {
    event.preventDefault();
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('investment-id').value;
    const name = document.getElementById('investment-name').value.trim();
    const type = document.getElementById('investment-type').value;
    const amount = parseFloat(document.getElementById('investment-amount').value) || 0;
    const currentValue = parseFloat(document.getElementById('investment-current').value) || amount;
    const notes = document.getElementById('investment-notes').value.trim();

    const inv = { userId, name, type, amount, currentValue, notes, updatedAt: new Date().toISOString() };

    try {
        if (id) {
            inv.id = parseInt(id);
            await DB.update('investments', inv);
            showToast('Investment updated', 'success');
        } else {
            inv.createdAt = new Date().toISOString();
            await DB.add('investments', inv);
            showToast('Investment added', 'success');
        }
        bootstrap.Modal.getInstance(document.getElementById('investmentModal'))?.hide();
        loadInvestmentsView();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// ─── Delete Investment ────────────────────────────────────────────────────────
async function deleteInvestment(id) {
    const ok = await UIConfirm.danger('Remove this investment from your portfolio?', 'Delete Investment?');
    if (!ok) return;
    await DB.delete('investments', id);
    showToast('Investment removed', 'success');
    loadInvestmentsView();
}

// ─── Load Investments View ────────────────────────────────────────────────────
async function loadInvestmentsView() {
    const container = document.getElementById('investments-list');
    const networthEl = document.getElementById('net-worth-value');
    if (!container) return;

    const userId = parseInt(Auth.getCurrentUserId());
    const investments = await getUserInvestments(userId);
    const transactions = await DB.getUserTransactions(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const cashBalance = totalIncome - totalExpenses;
    const totalInvested = investments.reduce((s, i) => s + (i.amount || 0), 0);
    const totalCurrentValue = investments.reduce((s, i) => s + (i.currentValue || i.amount || 0), 0);
    const netWorth = cashBalance + totalCurrentValue;
    const gainLoss = totalCurrentValue - totalInvested;

    if (networthEl) {
        networthEl.textContent = `${currency}${netWorth.toFixed(2)}`;
    }

    const gainEl = document.getElementById('portfolio-gain');
    if (gainEl) {
        gainEl.textContent = `${gainLoss >= 0 ? '+' : ''}${currency}${gainLoss.toFixed(2)}`;
        gainEl.className = gainLoss >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
    }

    const cashEl = document.getElementById('net-worth-cash');
    if (cashEl) cashEl.textContent = `${currency}${cashBalance.toFixed(2)}`;

    if (!investments.length) {
        container.innerHTML = renderEmptyState('graph-up-arrow', 'No investments yet', 'Track your savings, stocks, crypto, and more.', 'showAddInvestmentModal()', 'Add Investment');
        return;
    }

    const typeIcons = { savings: 'piggy-bank', stocks: 'graph-up', crypto: 'currency-bitcoin', real_estate: 'house', bonds: 'receipt', other: 'wallet2' };
    const typeColors = { savings: 'success', stocks: 'primary', crypto: 'warning', real_estate: 'info', bonds: 'secondary', other: 'muted' };

    container.innerHTML = investments.map(inv => {
        const gain = (inv.currentValue || inv.amount) - inv.amount;
        const gainPct = inv.amount > 0 ? ((gain / inv.amount) * 100).toFixed(1) : 0;
        const icon = typeIcons[inv.type] || 'wallet2';
        const color = typeColors[inv.type] || 'primary';

        return `
            <div class="col-md-6">
                <div class="card investment-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="d-flex align-items-center gap-2">
                                <div class="icon-box bg-${color}" style="width:40px;height:40px;font-size:1rem;">
                                    <i class="bi bi-${icon}"></i>
                                </div>
                                <div>
                                    <h5 class="mb-0">${inv.name}</h5>
                                    <small class="text-muted text-capitalize">${inv.type.replace('_', ' ')}</small>
                                </div>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" onclick="showAddInvestmentModal(${JSON.stringify(inv).replace(/"/g, '&quot;')})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteInvestment(${inv.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="row g-2 mt-3">
                            <div class="col-6">
                                <div class="text-muted small">Invested</div>
                                <div class="fw-bold">${currency}${(inv.amount || 0).toFixed(2)}</div>
                            </div>
                            <div class="col-6">
                                <div class="text-muted small">Current Value</div>
                                <div class="fw-bold">${currency}${(inv.currentValue || inv.amount || 0).toFixed(2)}</div>
                            </div>
                            <div class="col-12">
                                <div class="text-muted small">Gain / Loss</div>
                                <div class="fw-bold ${gain >= 0 ? 'text-success' : 'text-danger'}">
                                    ${gain >= 0 ? '+' : ''}${currency}${gain.toFixed(2)} (${gainPct}%)
                                </div>
                            </div>
                        </div>
                        ${inv.notes ? `<div class="mt-2 text-muted small"><i class="bi bi-sticky me-1"></i>${inv.notes}</div>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function showInvestments() {
    showView('investments-view');
    loadInvestmentsView();
}
