// Bills Module — Improved with undo, styled confirms, swipe-to-delete, dashboard refresh

// ─── Show Add Bill Modal ───────────────────────────────────────────────────────
function showAddBillModal() {
    const modal = new bootstrap.Modal(document.getElementById('billModal'));
    const form = document.getElementById('billForm');
    form.reset();
    document.getElementById('bill-id').value = '';
    document.getElementById('billModalTitle').textContent = 'Add Bill';

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('bill-due-date').value = nextMonth.toISOString().split('T')[0];
    modal.show();
}

// ─── Handle Bill Submit ────────────────────────────────────────────────────────
async function handleBillSubmit(event) {
    event.preventDefault();
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('bill-id').value;
    const name = document.getElementById('bill-name').value.trim();
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const dueDate = document.getElementById('bill-due-date').value;
    const recurring = document.getElementById('bill-recurring').value;
    const category = parseInt(document.getElementById('bill-category').value);

    if (!name) { showToast('Bill name is required', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Amount must be greater than 0', 'error'); return; }

    const bill = { userId, name, amount, dueDate, recurring, category, paid: false, createdAt: new Date().toISOString() };

    try {
        if (id) {
            bill.id = parseInt(id);
            const existing = await DB.get('bills', bill.id);
            bill.paid = existing.paid;
            await DB.update('bills', bill);
            showToast('Bill updated', 'success');
        } else {
            await DB.add('bills', bill);
            showToast('Bill added', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('billModal')).hide();
        loadBillsView();
        await addToSyncQueue('bill', bill);
    } catch (error) {
        showToast('Error saving bill: ' + error.message, 'error');
    }
}

// ─── Load Bills View ───────────────────────────────────────────────────────────
async function loadBillsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const bills = await DB.getUserBills(userId);
    const categories = await DB.getUserCategories(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');

    const container = document.getElementById('bills-list');
    if (!container) return;

    if (bills.length === 0) {
        container.innerHTML = renderEmptyState('receipt', 'No bills yet', 'Track recurring and one-time bills to stay on top of payments.', 'showAddBillModal()', 'Add Bill');
        return;
    }

    bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const unpaid = bills.filter(b => !b.paid);
    const paid = bills.filter(b => b.paid);
    const now = new Date();

    const totalUnpaid = unpaid.reduce((s, b) => s + parseFloat(b.amount), 0);
    const overdue = unpaid.filter(b => new Date(b.dueDate) < now);

    container.innerHTML = `
        ${unpaid.length > 0 ? `
            <div class="bills-summary-bar mb-3">
                <span><i class="bi bi-receipt me-1"></i><strong>${unpaid.length}</strong> unpaid • <strong class="text-danger">${currency}${totalUnpaid.toFixed(2)}</strong></span>
                ${overdue.length > 0 ? `<span class="badge bg-danger ms-2">${overdue.length} overdue</span>` : ''}
            </div>
            <h6 class="text-muted mb-3 fw-semibold">UNPAID</h6>
            ${unpaid.map(bill => renderBillCard(bill, categories, currency, now)).join('')}
        ` : ''}
        ${paid.length > 0 ? `
            <h6 class="text-muted mb-3 fw-semibold mt-4">PAID</h6>
            ${paid.map(bill => renderBillCard(bill, categories, currency, now)).join('')}
        ` : ''}`;

    enableSwipeToDelete(container, el => el.dataset.swipeId, id => deleteBill(parseInt(id)));
}

// ─── Render Bill Card ──────────────────────────────────────────────────────────
function renderBillCard(bill, categories, currency, now) {
    const category = categories.find(c => c.id === bill.category);
    const categoryName = category ? category.name : 'Unknown';
    const icon = category ? category.icon : 'receipt';
    const dueDate = new Date(bill.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const isOverdue = !bill.paid && daysUntilDue < 0;
    const isDueSoon = !bill.paid && daysUntilDue >= 0 && daysUntilDue <= 7;

    let statusClass = '', statusBadge = '';
    if (bill.paid) {
        statusClass = 'paid';
        statusBadge = '<span class="badge bg-success">Paid</span>';
    } else if (isOverdue) {
        statusClass = 'overdue';
        statusBadge = `<span class="badge bg-danger">Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}</span>`;
    } else if (isDueSoon) {
        statusBadge = `<span class="badge bg-warning text-dark">Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</span>`;
    }

    return `
        <div class="bill-item ${statusClass} mb-3" data-swipe-id="${bill.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div class="d-flex align-items-start flex-grow-1 gap-3">
                    <div class="icon-box bg-${bill.paid ? 'success' : isOverdue ? 'danger' : 'primary'}" style="width:50px;height:50px;">
                        <i class="bi bi-${icon}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h5 class="mb-1">${bill.name}</h5>
                        <div class="text-muted small mb-1">
                            <i class="bi bi-tag me-1"></i>${categoryName}
                            ${bill.recurring !== 'none' ? ` &bull; <i class="bi bi-arrow-repeat ms-1 me-1"></i><span class="text-capitalize">${bill.recurring}</span>` : ''}
                        </div>
                        <div class="text-muted small"><i class="bi bi-calendar me-1"></i>Due: ${dueDate.toLocaleDateString()}</div>
                        ${statusBadge ? `<div class="mt-2">${statusBadge}</div>` : ''}
                    </div>
                </div>
                <div class="text-end ms-3">
                    <div class="h5 mb-2">${App.formatCurrency(bill.amount, currency)}</div>
                    <div class="d-flex gap-1">
                        ${!bill.paid ? `
                            <button class="btn btn-sm btn-success" onclick="markBillAsPaid(${bill.id})">
                                <i class="bi bi-check-circle me-1"></i>Pay
                            </button>` : ''}
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#" onclick="editBill(${bill.id})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                ${bill.paid ? `<li><a class="dropdown-item" href="#" onclick="markBillAsUnpaid(${bill.id})"><i class="bi bi-x-circle me-2"></i>Mark Unpaid</a></li>` : ''}
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteBill(${bill.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

// ─── Edit Bill ─────────────────────────────────────────────────────────────────
async function editBill(id) {
    const bill = await DB.get('bills', id);
    if (!bill) { showToast('Bill not found', 'error'); return; }
    document.getElementById('bill-id').value = bill.id;
    document.getElementById('bill-name').value = bill.name;
    document.getElementById('bill-amount').value = bill.amount;
    document.getElementById('bill-due-date').value = bill.dueDate;
    document.getElementById('bill-recurring').value = bill.recurring;
    document.getElementById('bill-category').value = bill.category;
    document.getElementById('billModalTitle').textContent = 'Edit Bill';
    new bootstrap.Modal(document.getElementById('billModal')).show();
}

// ─── Delete Bill (with undo) ───────────────────────────────────────────────────
async function deleteBill(id) {
    const bill = await DB.get('bills', id);
    if (!bill) return;
    const ok = await UIConfirm.danger(`Delete bill "${bill.name}"?`, 'Delete Bill?');
    if (!ok) return;

    await DB.delete('bills', id);

    UndoManager.push('Bill deleted', async () => {
        delete bill.id;
        await DB.add('bills', bill);
        loadBillsView();
        showToast('Bill restored', 'success');
    });

    showToast('Bill deleted', 'success');
    loadBillsView();
    await addToSyncQueue('delete_bill', { id });
}

// ─── Mark Bill as Paid ─────────────────────────────────────────────────────────
async function markBillAsPaid(id) {
    try {
        const bill = await DB.get('bills', id);
        if (!bill) { showToast('Bill not found', 'error'); return; }

        bill.paid = true;
        bill.paidAt = new Date().toISOString();
        await DB.update('bills', bill);

        const userId = parseInt(Auth.getCurrentUserId());
        const transaction = {
            userId, type: 'expense', amount: bill.amount, category: bill.category,
            date: new Date().toISOString().split('T')[0],
            note: `Payment for: ${bill.name}`, updatedAt: new Date().toISOString(), synced: false
        };
        await DB.add('transactions', transaction);

        if (bill.recurring !== 'none') {
            const nextDueDate = new Date(bill.dueDate);
            if (bill.recurring === 'monthly') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            else if (bill.recurring === 'quarterly') nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            else if (bill.recurring === 'yearly') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

            const nextBill = { ...bill, dueDate: nextDueDate.toISOString().split('T')[0], paid: false, paidAt: null, createdAt: new Date().toISOString() };
            delete nextBill.id;
            await DB.add('bills', nextBill);
        }

        showToast('Bill marked as paid ✓', 'success');
        loadBillsView();

        // Always refresh dashboard stats
        if (!document.getElementById('dashboard-view').classList.contains('d-none')) {
            App.loadDashboard();
        }

        await addToSyncQueue('bill', bill);
        await addToSyncQueue('transaction', transaction);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ─── Mark Bill as Unpaid ───────────────────────────────────────────────────────
async function markBillAsUnpaid(id) {
    const bill = await DB.get('bills', id);
    if (!bill) return;
    bill.paid = false;
    bill.paidAt = null;
    await DB.update('bills', bill);
    showToast('Bill marked as unpaid', 'success');
    loadBillsView();
    await addToSyncQueue('bill', bill);
}
