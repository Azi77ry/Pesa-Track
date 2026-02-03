// Budgets Module

// Show Add Budget Modal
function showAddBudgetModal() {
    const modal = new bootstrap.Modal(document.getElementById('budgetModal'));
    const form = document.getElementById('budgetForm');
    
    // Reset form
    form.reset();
    document.getElementById('budget-id').value = '';
    
    modal.show();
}

// Handle Budget Submit
async function handleBudgetSubmit(event) {
    event.preventDefault();
    
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('budget-id').value;
    const category = parseInt(document.getElementById('budget-category').value);
    const amount = parseFloat(document.getElementById('budget-amount').value);
    const period = document.getElementById('budget-period').value;
    
    const budget = {
        userId,
        category,
        amount,
        period,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (id) {
            // Update existing budget
            budget.id = parseInt(id);
            await DB.update('budgets', budget);
            showToast('Budget updated successfully', 'success');
        } else {
            // Check if budget already exists for this category
            const existingBudgets = await DB.getUserBudgets(userId);
            const exists = existingBudgets.find(b => b.category === category && b.period === period);
            
            if (exists) {
                showToast('Budget already exists for this category and period', 'error');
                return;
            }
            
            // Add new budget
            await DB.add('budgets', budget);
            showToast('Budget added successfully', 'success');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('budgetModal'));
        modal.hide();
        
        // Reload budgets view
        loadBudgetsView();
        
        // Add to sync queue
        await addToSyncQueue('budget', budget);
        
    } catch (error) {
        showToast('Error saving budget: ' + error.message, 'error');
    }
}

// Load Budgets View
async function loadBudgetsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const budgets = await DB.getUserBudgets(userId);
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'USD');
    
    const container = document.getElementById('budgets-list');
    
    if (budgets.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-pie-chart"></i><p>No budgets created yet</p></div></div>';
        return;
    }
    
    // Get current period transactions
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    container.innerHTML = budgets.map(budget => {
        const category = categories.find(c => c.id === budget.category);
        const categoryName = category ? category.name : 'Unknown';
        const icon = category ? category.icon : 'circle';
        
        // Calculate spent amount
        const categoryTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            
            // Filter by period
            let inPeriod = false;
            if (budget.period === 'monthly') {
                inPeriod = date >= firstDay;
            } else if (budget.period === 'quarterly') {
                const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                inPeriod = date >= quarterStart;
            } else if (budget.period === 'yearly') {
                const yearStart = new Date(now.getFullYear(), 0, 1);
                inPeriod = date >= yearStart;
            }
            
            return t.category === budget.category && t.type === 'expense' && inPeriod;
        });
        
        const spent = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const remaining = budget.amount - spent;
        const percentage = (spent / budget.amount) * 100;
        
        // Determine status
        let statusClass = 'success';
        let statusText = 'On Track';
        if (percentage >= 100) {
            statusClass = 'danger';
            statusText = 'Over Budget';
        } else if (percentage >= 80) {
            statusClass = 'warning';
            statusText = 'Near Limit';
        }
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card budget-card ${statusClass === 'danger' ? 'danger' : statusClass === 'warning' ? 'warning' : ''}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="d-flex align-items-center">
                                <div class="icon-box bg-${statusClass} me-2" style="width: 40px; height: 40px; font-size: 1rem;">
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
                                <span>Spent</span>
                                <span class="fw-bold">${App.formatCurrency(spent, currency)}</span>
                            </div>
                            <div class="progress budget-progress">
                                <div class="progress-bar bg-${statusClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between text-muted small">
                            <span>Budget: ${App.formatCurrency(budget.amount, currency)}</span>
                            <span>${percentage.toFixed(0)}% used</span>
                        </div>
                        
                        <div class="mt-3 pt-3 border-top">
                            <div class="d-flex justify-content-between">
                                <span class="text-muted">Remaining</span>
                                <span class="fw-bold ${remaining >= 0 ? 'text-success' : 'text-danger'}">
                                    ${App.formatCurrency(Math.abs(remaining), currency)}
                                </span>
                            </div>
                            <span class="badge bg-${statusClass} mt-2">${statusText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Edit Budget
async function editBudget(id) {
    const budget = await DB.get('budgets', id);
    
    if (!budget) {
        showToast('Budget not found', 'error');
        return;
    }
    
    // Fill form
    document.getElementById('budget-id').value = budget.id;
    document.getElementById('budget-category').value = budget.category;
    document.getElementById('budget-amount').value = budget.amount;
    document.getElementById('budget-period').value = budget.period;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('budgetModal'));
    modal.show();
}

// Delete Budget
async function deleteBudget(id) {
    if (!confirm('Are you sure you want to delete this budget?')) {
        return;
    }
    
    try {
        await DB.delete('budgets', id);
        showToast('Budget deleted successfully', 'success');
        
        // Reload budgets view
        loadBudgetsView();
        
        // Add to sync queue
        await addToSyncQueue('delete_budget', { id });
        
    } catch (error) {
        showToast('Error deleting budget: ' + error.message, 'error');
    }
}
