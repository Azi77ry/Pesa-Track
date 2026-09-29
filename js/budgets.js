// Budgets Module — Improved with undo-delete, named budgets, styled confirms

// ─── Show Add Budget Modal ─────────────────────────────────────────────────────
function showAddBudgetModal() {
    const modal = new bootstrap.Modal(document.getElementById('budgetModal'));
    const form = document.getElementById('budgetForm');
    form.reset();
    document.getElementById('budget-id').value = '';
    document.getElementById('budgetModalTitle').textContent = 'Create Budget';
    modal.show();
}

// ─── Handle Budget Submit ──────────────────────────────────────────────────────
async function handleBudgetSubmit(event) {
    event.preventDefault();
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('budget-id').value;
    const category = parseInt(document.getElementById('budget-category').value);
    const amount = parseFloat(document.getElementById('budget-amount').value);
    const period = document.getElementById('budget-period').value;
    const name = document.getElementById('budget-name')?.value?.trim() || '';

    if (!amount || amount <= 0) { showToast('Amount must be greater than 0', 'error'); return; }

    const budget = { userId, category, amount, period, name, createdAt: new Date().toISOString() };

    try {
        if (id) {
            budget.id = parseInt(id);
            await DB.update('budgets', budget);
            showToast('Budget updated', 'success');
        } else {
            const existingBudgets = await DB.getUserBudgets(userId);
            const exists = existingBudgets.find(b => b.category === category && b.period === period);
            if (exists) {
                showToast('A budget already exists for this category and period', 'error');
                return;
            }
            await DB.add('budgets', budget);
            showToast('Budget created!', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('budgetModal')).hide();
        loadBudgetsView();
        await addToSyncQueue('budget', budget);
    } catch (error) {
        showToast('Error saving budget: ' + error.message, 'error');
    }
}

// ─── Load Budgets View ─────────────────────────────────────────────────────────
async function loadBudgetsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const budgets = await DB.getUserBudgets(userId);
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');

    const container = document.getElementById('budgets-list');

    if (budgets.length === 0) {
        container.innerHTML = `<div class="col-12">${renderEmptyState('pie-chart', 'No budgets yet', 'Create spending limits for your expense categories.', 'showAddBudgetModal()', 'Create Budget')}</div>`;
        return;
    }

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    container.innerHTML = budgets.map(budget => {
        const category = categories.find(c => c.id === budget.category);
        const categoryName = budget.name || (category ? category.name : 'Unknown');
        const icon = category ? category.icon : 'circle';

        const categoryTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            let inPeriod = false;
            if (budget.period === 'monthly') inPeriod = date >= firstDay;
            else if (budget.period === 'quarterly') {
                const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                inPeriod = date >= qStart;
            } else if (budget.period === 'yearly') {
                inPeriod = date >= new Date(now.getFullYear(), 0, 1);
            }
            return t.category === budget.category && t.type === 'expense' && inPeriod;
        });

        const spent = categoryTransactions.reduce((s, t) => s + parseFloat(t.amount), 0);
        const remaining = budget.amount - spent;
        const percentage = (spent / budget.amount) * 100;

        let statusClass = 'success', statusText = 'On Track';
        if (percentage >= 100) { statusClass = 'danger'; statusText = 'Over Budget'; }
        else if (percentage >= 80) { statusClass = 'warning'; statusText = 'Near Limit'; }

        const daysLeft = Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, 0) - now) / 86400000);
        const dailyBudget = remaining > 0 ? (remaining / daysLeft).toFixed(2) : '0.00';

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card budget-card ${statusClass === 'danger' ? 'danger' : statusClass === 'warning' ? 'warning' : ''}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="d-flex align-items-center gap-2">
                                <div class="icon-box bg-${statusClass}" style="width:40px;height:40px;font-size:1rem;">
                                    <i class="bi bi-${icon}"></i>
                                </div>
                                <div>
                                    <h5 class="mb-0">${categoryName}</h5>
                                    <small class="text-muted text-capitalize">${budget.period}</small>
                                </div>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" onclick="editBudget(${budget.id})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteBudget(${budget.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                                </ul>
                            </div>
                        </div>

                        <div class="mb-2">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted small">Spent</span>
                                <span class="fw-bold">${App.formatCurrency(spent, currency)}</span>
                            </div>
                            <div class="progress budget-progress">
                                <div class="progress-bar bg-${statusClass}" style="width:${Math.min(percentage, 100)}%;transition:width 0.6s ease;"></div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between text-muted small mb-2">
                            <span>Budget: ${App.formatCurrency(budget.amount, currency)}</span>
                            <span>${percentage.toFixed(0)}% used</span>
                        </div>

                        <div class="border-top pt-2 mt-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-muted small">Remaining</div>
                                    <div class="fw-bold ${remaining >= 0 ? 'text-success' : 'text-danger'}">
                                        ${remaining >= 0 ? '' : '-'}${App.formatCurrency(Math.abs(remaining), currency)}
                                    </div>
                                </div>
                                <div class="text-end">
                                    <div class="text-muted small">Daily budget</div>
                                    <div class="fw-semibold">${currency}${dailyBudget}</div>
                                </div>
                            </div>
                            <span class="badge bg-${statusClass} mt-2">${statusText}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ─── Edit Budget ───────────────────────────────────────────────────────────────
async function editBudget(id) {
    const budget = await DB.get('budgets', id);
    if (!budget) { showToast('Budget not found', 'error'); return; }

    document.getElementById('budget-id').value = budget.id;
    document.getElementById('budget-category').value = budget.category;
    document.getElementById('budget-amount').value = budget.amount;
    document.getElementById('budget-period').value = budget.period;
    if (document.getElementById('budget-name')) document.getElementById('budget-name').value = budget.name || '';
    document.getElementById('budgetModalTitle').textContent = 'Edit Budget';

    new bootstrap.Modal(document.getElementById('budgetModal')).show();
}

// ─── Delete Budget (with undo) ─────────────────────────────────────────────────
async function deleteBudget(id) {
    const budget = await DB.get('budgets', id);
    if (!budget) return;
    const ok = await UIConfirm.danger('Delete this budget limit?', 'Delete Budget?');
    if (!ok) return;

    await DB.delete('budgets', id);

    UndoManager.push('Budget deleted', async () => {
        delete budget.id;
        await DB.add('budgets', budget);
        loadBudgetsView();
        showToast('Budget restored', 'success');
    });

    showToast('Budget deleted', 'success');
    loadBudgetsView();
    await addToSyncQueue('delete_budget', { id });
}
