// Transactions Module — Improved with pagination, undo, swipe, expanded search & date range

const TXN_PAGE_SIZE = 20;
let txnCurrentPage = 1;
let txnTotalPages = 1;
let txnUndoStack = [];

// ─── Show Add Transaction Modal ───────────────────────────────────────────────
async function showAddTransactionModal(type) {
    const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
    const form = document.getElementById('transactionForm');
    form.reset();
    document.getElementById('transaction-id').value = '';
    document.getElementById('transaction-type').value = type;

    const title = document.getElementById('transactionModalTitle');
    title.textContent = type === 'income' ? 'Add Income' : 'Add Expense';
    title.className = type === 'income' ? 'text-success' : 'text-danger';

    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];

    const userId = parseInt(Auth.getCurrentUserId());
    const categories = await DB.getUserCategories(userId);
    const filteredCategories = categories.filter(c => c.type === type);

    const categorySelect = document.getElementById('transaction-category');
    if (filteredCategories.length === 0) {
        categorySelect.innerHTML = '<option value="">No categories — add one in Settings</option>';
    } else {
        categorySelect.innerHTML = filteredCategories
            .map(cat => `<option value="${cat.id}"><i class="bi bi-${cat.icon}"></i> ${cat.name}</option>`)
            .join('');
    }

    // Show current balance in modal
    const transactions = await DB.getUserTransactions(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');
    const balance = transactions.reduce((s, t) => s + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0);
    const balanceEl = document.getElementById('modal-balance-hint');
    if (balanceEl) balanceEl.textContent = `Current balance: ${currency}${balance.toFixed(2)}`;

    modal.show();
}

// ─── Handle Transaction Submit ────────────────────────────────────────────────
async function handleTransactionSubmit(event) {
    event.preventDefault();
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('transaction-id').value;
    const type = document.getElementById('transaction-type').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const category = parseInt(document.getElementById('transaction-category').value);
    const date = document.getElementById('transaction-date').value;
    const note = document.getElementById('transaction-note').value;

    if (!amount || amount <= 0) { showToast('Amount must be greater than 0', 'error'); return; }
    if (!category) { showToast('Please select a category', 'error'); return; }

    const transaction = { userId, type, amount, category, date, note, updatedAt: new Date().toISOString(), synced: false };

    try {
        if (id) {
            transaction.id = parseInt(id);
            await DB.update('transactions', transaction);
            showToast('Transaction updated', 'success');
        } else {
            const newId = await DB.add('transactions', transaction);
            transaction.id = newId;
            showToast('Transaction added', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('transactionModal')).hide();

        if (document.getElementById('dashboard-view').classList.contains('d-none')) {
            await loadTransactionsView();
        } else {
            await App.loadDashboard();
        }
        await addToSyncQueue('transaction', transaction);
    } catch (error) {
        showToast('Error saving transaction: ' + error.message, 'error');
    }
}

// ─── Edit Transaction ─────────────────────────────────────────────────────────
async function editTransaction(id) {
    const transaction = await DB.get('transactions', id);
    if (!transaction) { showToast('Transaction not found', 'error'); return; }

    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('transaction-type').value = transaction.type;
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-date').value = transaction.date;
    document.getElementById('transaction-note').value = transaction.note || '';

    const title = document.getElementById('transactionModalTitle');
    title.textContent = transaction.type === 'income' ? 'Edit Income' : 'Edit Expense';
    title.className = transaction.type === 'income' ? 'text-success' : 'text-danger';

    const userId = parseInt(Auth.getCurrentUserId());
    const categories = await DB.getUserCategories(userId);
    const filteredCategories = categories.filter(c => c.type === transaction.type);
    const categorySelect = document.getElementById('transaction-category');
    categorySelect.innerHTML = filteredCategories
        .map(cat => `<option value="${cat.id}" ${cat.id === transaction.category ? 'selected' : ''}>${cat.name}</option>`)
        .join('');

    const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
    modal.show();
}

// ─── Delete Transaction (with undo) ───────────────────────────────────────────
async function deleteTransaction(id) {
    const transaction = await DB.get('transactions', id);
    if (!transaction) return;

    const ok = await UIConfirm.danger(`Delete this ${transaction.type} transaction?`, 'Delete Transaction?');
    if (!ok) return;

    await DB.delete('transactions', id);

    UndoManager.push('Transaction deleted', async () => {
        delete transaction.id;
        await DB.add('transactions', transaction);
        if (!document.getElementById('dashboard-view').classList.contains('d-none')) {
            await App.loadDashboard();
        } else {
            await loadTransactionsView();
        }
        showToast('Transaction restored', 'success');
    });

    showToast('Transaction deleted', 'success');

    if (document.getElementById('dashboard-view').classList.contains('d-none')) {
        await loadTransactionsView();
    } else {
        await App.loadDashboard();
    }
    await addToSyncQueue('delete_transaction', { id });
}

// ─── Filter Transactions List ─────────────────────────────────────────────────
function filterTransactionsList(transactions, categories) {
    const type = document.getElementById('filter-type')?.value || 'all';
    const categoryVal = document.getElementById('filter-category')?.value || 'all';
    const period = document.getElementById('filter-period')?.value || 'all';
    const search = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
    const dateFrom = document.getElementById('filter-date-from')?.value || '';
    const dateTo = document.getElementById('filter-date-to')?.value || '';

    let filtered = [...transactions];

    if (type !== 'all') filtered = filtered.filter(t => t.type === type);
    if (categoryVal !== 'all') filtered = filtered.filter(t => t.category === parseInt(categoryVal));

    if (period !== 'all' && period !== 'custom') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter(t => {
            const date = new Date(t.date);
            if (period === 'today') return date >= today;
            if (period === 'week') return date >= new Date(today.getTime() - 7 * 86400000);
            if (period === 'month') return date >= new Date(now.getFullYear(), now.getMonth(), 1);
            if (period === 'year') return date >= new Date(now.getFullYear(), 0, 1);
            return true;
        });
    }

    if (period === 'custom') {
        if (dateFrom) filtered = filtered.filter(t => t.date >= dateFrom);
        if (dateTo) filtered = filtered.filter(t => t.date <= dateTo);
    }

    if (search) {
        filtered = filtered.filter(t => {
            const cat = categories.find(c => c.id === t.category);
            const catName = (cat ? cat.name : '').toLowerCase();
            const note = (t.note || '').toLowerCase();
            const amount = String(t.amount);
            return catName.includes(search) || note.includes(search) || amount.includes(search);
        });
    }

    return filtered;
}

// ─── Load Transactions View ───────────────────────────────────────────────────
async function loadTransactionsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');

    const filtered = filterTransactionsList(transactions, categories);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    txnTotalPages = Math.max(1, Math.ceil(filtered.length / TXN_PAGE_SIZE));
    if (txnCurrentPage > txnTotalPages) txnCurrentPage = 1;

    const paged = filtered.slice((txnCurrentPage - 1) * TXN_PAGE_SIZE, txnCurrentPage * TXN_PAGE_SIZE);

    const container = document.getElementById('transactions-list');

    // Update totals bar
    const totalIn = filtered.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalOut = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const summaryEl = document.getElementById('txn-filter-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <span class="text-success me-3"><i class="bi bi-arrow-down-circle me-1"></i>${currency}${totalIn.toFixed(2)}</span>
            <span class="text-danger me-3"><i class="bi bi-arrow-up-circle me-1"></i>${currency}${totalOut.toFixed(2)}</span>
            <span class="text-muted">${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}</span>`;
    }

    if (paged.length === 0) {
        container.innerHTML = renderEmptyState('inbox', 'No transactions found', 'Try adjusting your filters or add a new transaction.', "showAddTransactionModal('expense')", 'Add Transaction');
        renderPagination();
        return;
    }

    // Group by date
    const grouped = {};
    paged.forEach(t => {
        const date = new Date(t.date).toLocaleDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(t);
    });

    container.innerHTML = Object.keys(grouped).map(date => {
        const dayTransactions = grouped[date];
        const dayTotal = dayTransactions.reduce((sum, t) => sum + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0);

        return `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                    <h6 class="mb-0 text-muted">${date}</h6>
                    <span class="badge ${dayTotal >= 0 ? 'bg-success' : 'bg-danger'}">
                        ${dayTotal >= 0 ? '+' : ''}${App.formatCurrency(dayTotal, currency)}
                    </span>
                </div>
                ${dayTransactions.map(t => {
                    const category = categories.find(c => c.id === t.category);
                    const categoryName = category ? category.name : 'Unknown';
                    const icon = category ? category.icon : 'circle';
                    return `
                        <div class="transaction-item transaction-${t.type}" data-swipe-id="${t.id}">
                            <div class="d-flex align-items-center flex-grow-1">
                                <div class="transaction-icon">
                                    <i class="bi bi-${icon}"></i>
                                </div>
                                <div>
                                    <div class="fw-semibold">${categoryName}</div>
                                    ${t.note ? `<small class="text-muted">${t.note}</small>` : ''}
                                </div>
                            </div>
                            <div class="text-end">
                                <div class="transaction-amount">${t.type === 'income' ? '+' : '-'}${App.formatCurrency(t.amount, currency)}</div>
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                                        <i class="bi bi-three-dots"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li><a class="dropdown-item" href="#" onclick="editTransaction(${t.id})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteTransaction(${t.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;
    }).join('');

    // Enable swipe on mobile
    enableSwipeToDelete(container, el => el.dataset.swipeId, id => deleteTransaction(parseInt(id)));
    renderPagination();
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination() {
    const el = document.getElementById('txn-pagination');
    if (!el) return;

    if (txnTotalPages <= 1) { el.innerHTML = ''; return; }

    let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
    html += `<li class="page-item ${txnCurrentPage === 1 ? 'disabled' : ''}">
        <button class="page-link" onclick="gotoTxnPage(${txnCurrentPage - 1})"><i class="bi bi-chevron-left"></i></button></li>`;

    for (let i = 1; i <= txnTotalPages; i++) {
        if (txnTotalPages > 7 && Math.abs(i - txnCurrentPage) > 2 && i !== 1 && i !== txnTotalPages) {
            if (i === 2 || i === txnTotalPages - 1) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
            continue;
        }
        html += `<li class="page-item ${i === txnCurrentPage ? 'active' : ''}">
            <button class="page-link" onclick="gotoTxnPage(${i})">${i}</button></li>`;
    }

    html += `<li class="page-item ${txnCurrentPage === txnTotalPages ? 'disabled' : ''}">
        <button class="page-link" onclick="gotoTxnPage(${txnCurrentPage + 1})"><i class="bi bi-chevron-right"></i></button></li>`;
    html += '</ul></nav>';
    el.innerHTML = html;
}

function gotoTxnPage(page) {
    txnCurrentPage = page;
    loadTransactionsView();
    document.getElementById('transactions-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterTransactions() {
    txnCurrentPage = 1;
    loadTransactionsView();
}

// ─── Toggle custom date range fields ─────────────────────────────────────────
function onFilterPeriodChange() {
    const period = document.getElementById('filter-period')?.value;
    const dateRangeRow = document.getElementById('filter-date-range-row');
    if (dateRangeRow) {
        dateRangeRow.classList.toggle('d-none', period !== 'custom');
    }
    filterTransactions();
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
async function exportTransactionsCSV() {
    const userId = parseInt(Auth.getCurrentUserId());
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);

    const rows = [['Date', 'Type', 'Category', 'Amount', 'Note']];
    transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(t => {
            const cat = categories.find(c => c.id === t.category);
            rows.push([t.date, t.type, cat ? cat.name : 'Unknown', t.amount, t.note || '']);
        });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pesatrucker-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully', 'success');
}
