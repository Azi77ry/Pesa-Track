// Transactions Module

// Show Add Transaction Modal
async function showAddTransactionModal(type) {
    const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
    const form = document.getElementById('transactionForm');
    const title = document.getElementById('transactionModalTitle');
    
    // Reset form
    form.reset();
    document.getElementById('transaction-id').value = '';
    document.getElementById('transaction-type').value = type;
    
    // Set title
    title.textContent = type === 'income' ? 'Add Income' : 'Add Expense';
    
    // Set today's date
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    
    // Filter categories by type
    const userId = parseInt(Auth.getCurrentUserId());
    const categories = await DB.getUserCategories(userId);
    const filteredCategories = categories.filter(c => c.type === type);
    
    const categorySelect = document.getElementById('transaction-category');
    categorySelect.innerHTML = filteredCategories
        .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
        .join('');
    
    modal.show();
}

// Handle Transaction Submit
async function handleTransactionSubmit(event) {
    event.preventDefault();
    
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('transaction-id').value;
    const type = document.getElementById('transaction-type').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const category = parseInt(document.getElementById('transaction-category').value);
    const date = document.getElementById('transaction-date').value;
    const note = document.getElementById('transaction-note').value;
    
    const transaction = {
        userId,
        type,
        amount,
        category,
        date,
        note,
        updatedAt: new Date().toISOString(),
        synced: false
    };
    
    try {
        if (id) {
            // Update existing transaction
            transaction.id = parseInt(id);
            await DB.update('transactions', transaction);
            showToast('Transaction updated successfully', 'success');
        } else {
            // Add new transaction
            await DB.add('transactions', transaction);
            showToast('Transaction added successfully', 'success');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('transactionModal'));
        modal.hide();
        
        // Reload data
        if (document.getElementById('dashboard-view').classList.contains('d-none')) {
            loadTransactionsView();
        } else {
            App.loadDashboard();
        }
        
        // Add to sync queue
        await addToSyncQueue('transaction', transaction);
        
    } catch (error) {
        showToast('Error saving transaction: ' + error.message, 'error');
    }
}

// Edit Transaction
async function editTransaction(id) {
    const transaction = await DB.get('transactions', id);
    
    if (!transaction) {
        showToast('Transaction not found', 'error');
        return;
    }
    
    // Fill form
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('transaction-type').value = transaction.type;
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-category').value = transaction.category;
    document.getElementById('transaction-date').value = transaction.date;
    document.getElementById('transaction-note').value = transaction.note || '';
    
    // Update title
    const title = document.getElementById('transactionModalTitle');
    title.textContent = transaction.type === 'income' ? 'Edit Income' : 'Edit Expense';
    
    // Filter categories by type
    const userId = parseInt(Auth.getCurrentUserId());
    const categories = await DB.getUserCategories(userId);
    const filteredCategories = categories.filter(c => c.type === transaction.type);
    
    const categorySelect = document.getElementById('transaction-category');
    categorySelect.innerHTML = filteredCategories
        .map(cat => `<option value="${cat.id}" ${cat.id === transaction.category ? 'selected' : ''}>${cat.name}</option>`)
        .join('');
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
    modal.show();
}

// Delete Transaction
async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }
    
    try {
        await DB.delete('transactions', id);
        showToast('Transaction deleted successfully', 'success');
        
        // Reload data
        if (document.getElementById('dashboard-view').classList.contains('d-none')) {
            loadTransactionsView();
        } else {
            App.loadDashboard();
        }
        
        // Add to sync queue
        await addToSyncQueue('delete_transaction', { id });
        
    } catch (error) {
        showToast('Error deleting transaction: ' + error.message, 'error');
    }
}

// Load Transactions View
async function loadTransactionsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'USD');
    
    // Apply filters
    const filtered = filterTransactionsList(transactions);
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const container = document.getElementById('transactions-list');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>No transactions found</p></div>';
        return;
    }
    
    // Group by date
    const grouped = {};
    filtered.forEach(t => {
        const date = new Date(t.date).toLocaleDateString();
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(t);
    });
    
    container.innerHTML = Object.keys(grouped).map(date => {
        const dayTransactions = grouped[date];
        const dayTotal = dayTransactions.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);
        
        return `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">${date}</h5>
                    <span class="badge ${dayTotal >= 0 ? 'bg-success' : 'bg-danger'}">
                        ${dayTotal >= 0 ? '+' : ''}${App.formatCurrency(dayTotal, currency)}
                    </span>
                </div>
                ${dayTransactions.map(t => {
                    const category = categories.find(c => c.id === t.category);
                    const categoryName = category ? category.name : 'Unknown';
                    const icon = category ? category.icon : 'circle';
                    
                    return `
                        <div class="transaction-item transaction-${t.type}">
                            <div class="d-flex align-items-center flex-grow-1">
                                <div class="transaction-icon">
                                    <i class="bi bi-${icon}"></i>
                                </div>
                                <div>
                                    <div class="fw-bold">${categoryName}</div>
                                    ${t.note ? `<small class="text-muted">${t.note}</small>` : ''}
                                </div>
                            </div>
                            <div class="text-end">
                                <div class="transaction-amount">${t.type === 'income' ? '+' : '-'}${App.formatCurrency(t.amount, currency)}</div>
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                                        <i class="bi bi-three-dots"></i>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="#" onclick="editTransaction(${t.id})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteTransaction(${t.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');
}

// Filter Transactions
function filterTransactionsList(transactions) {
    const type = document.getElementById('filter-type')?.value || 'all';
    const category = document.getElementById('filter-category')?.value || 'all';
    const period = document.getElementById('filter-period')?.value || 'all';
    const search = document.getElementById('filter-search')?.value.toLowerCase() || '';
    
    let filtered = [...transactions];
    
    // Filter by type
    if (type !== 'all') {
        filtered = filtered.filter(t => t.type === type);
    }
    
    // Filter by category
    if (category !== 'all') {
        filtered = filtered.filter(t => t.category === parseInt(category));
    }
    
    // Filter by period
    if (period !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(t => {
            const date = new Date(t.date);
            
            if (period === 'today') {
                return date >= today;
            } else if (period === 'week') {
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return date >= weekAgo;
            } else if (period === 'month') {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                return date >= firstDay;
            } else if (period === 'year') {
                const firstDay = new Date(now.getFullYear(), 0, 1);
                return date >= firstDay;
            }
            return true;
        });
    }
    
    // Filter by search
    if (search) {
        filtered = filtered.filter(t => 
            t.note && t.note.toLowerCase().includes(search)
        );
    }
    
    return filtered;
}

// Apply filters and reload
function filterTransactions() {
    loadTransactionsView();
}
