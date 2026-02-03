// Settings Module

// Load Settings View
async function loadSettingsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const settings = await DB.getUserSettings(userId);
    const categories = await DB.getUserCategories(userId);
    
    // Set form values
    if (settings) {
        document.getElementById('setting-currency').value = settings.currency || 'USD';
        document.getElementById('setting-theme').value = settings.theme || 'light';
        document.getElementById('setting-notifications').checked = settings.notifications !== false;
    }
    
    // Load categories list
    loadCategoriesList(categories);
}

// Save Setting
async function saveSetting(key, value) {
    const userId = parseInt(Auth.getCurrentUserId());
    let settings = await DB.getUserSettings(userId);
    
    if (!settings) {
        settings = { userId };
    }
    
    settings[key] = value;
    
    await DB.update('settings', settings);
    
    // Apply settings immediately
    if (key === 'theme') {
        document.documentElement.setAttribute('data-theme', value);
        showToast('Theme updated', 'success');
    } else if (key === 'currency') {
        showToast('Currency updated', 'success');
        // Reload current view to show new currency
        if (!document.getElementById('dashboard-view').classList.contains('d-none')) {
            App.loadDashboard();
        }
    } else if (key === 'notifications') {
        showToast(value ? 'Notifications enabled' : 'Notifications disabled', 'success');
    }
    
    // Add to sync queue
    await addToSyncQueue('settings', settings);
}

// Load Categories List
function loadCategoriesList(categories) {
    const container = document.getElementById('categories-list');
    
    // Group by type
    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');
    
    container.innerHTML = `
        <div class="mb-4">
            <h6 class="text-muted mb-3">Income Categories</h6>
            <div class="list-group">
                ${incomeCategories.map(cat => renderCategoryItem(cat)).join('')}
            </div>
        </div>
        
        <div class="mb-4">
            <h6 class="text-muted mb-3">Expense Categories</h6>
            <div class="list-group">
                ${expenseCategories.map(cat => renderCategoryItem(cat)).join('')}
            </div>
        </div>
    `;
}

// Render Category Item
function renderCategoryItem(category) {
    return `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <i class="bi bi-${category.icon} me-2"></i>
                <span>${category.name}</span>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
}

// Show Add Category Modal
function showAddCategoryModal() {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const form = document.getElementById('categoryForm');
    
    // Reset form
    form.reset();
    
    modal.show();
}

// Handle Category Submit
async function handleCategorySubmit(event) {
    event.preventDefault();
    
    const userId = parseInt(Auth.getCurrentUserId());
    const name = document.getElementById('category-name').value;
    const type = document.getElementById('category-type').value;
    const icon = document.getElementById('category-icon').value;
    
    const category = {
        userId,
        name,
        type,
        icon
    };
    
    try {
        // Check if category already exists
        const categories = await DB.getUserCategories(userId);
        const exists = categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type);
        
        if (exists) {
            showToast('Category already exists', 'error');
            return;
        }
        
        // Add category
        await DB.add('categories', category);
        showToast('Category added successfully', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        modal.hide();
        
        // Reload categories
        const updatedCategories = await DB.getUserCategories(userId);
        loadCategoriesList(updatedCategories);
        
        // Reload category dropdowns
        await App.loadCategories();
        
        // Add to sync queue
        await addToSyncQueue('category', category);
        
    } catch (error) {
        showToast('Error adding category: ' + error.message, 'error');
    }
}

// Delete Category
async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? This will affect all transactions and budgets using this category.')) {
        return;
    }
    
    try {
        const userId = parseInt(Auth.getCurrentUserId());
        
        // Check if category is in use
        const transactions = await DB.getUserTransactions(userId);
        const budgets = await DB.getUserBudgets(userId);
        const bills = await DB.getUserBills(userId);
        
        const inUse = transactions.some(t => t.category === id) ||
                      budgets.some(b => b.category === id) ||
                      bills.some(b => b.category === id);
        
        if (inUse) {
            showToast('Cannot delete category that is in use', 'error');
            return;
        }
        
        // Delete category
        await DB.delete('categories', id);
        showToast('Category deleted successfully', 'success');
        
        // Reload categories
        const categories = await DB.getUserCategories(userId);
        loadCategoriesList(categories);
        
        // Reload category dropdowns
        await App.loadCategories();
        
        // Add to sync queue
        await addToSyncQueue('delete_category', { id });
        
    } catch (error) {
        showToast('Error deleting category: ' + error.message, 'error');
    }
}

// Export Data
async function exportData() {
    const userId = parseInt(Auth.getCurrentUserId());
    
    const data = {
        user: Auth.getCurrentUser(),
        transactions: await DB.getUserTransactions(userId),
        budgets: await DB.getUserBudgets(userId),
        bills: await DB.getUserBills(userId),
        categories: await DB.getUserCategories(userId),
        settings: await DB.getUserSettings(userId),
        exportedAt: new Date().toISOString()
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully', 'success');
}

// Import Data
async function importData(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const userId = parseInt(Auth.getCurrentUserId());
        
        // Validate data
        if (!data.transactions || !data.categories) {
            throw new Error('Invalid backup file');
        }
        
        // Import categories
        for (const category of data.categories) {
            category.userId = userId;
            delete category.id;
            await DB.add('categories', category);
        }
        
        // Import transactions
        for (const transaction of data.transactions) {
            transaction.userId = userId;
            delete transaction.id;
            await DB.add('transactions', transaction);
        }
        
        // Import budgets
        if (data.budgets) {
            for (const budget of data.budgets) {
                budget.userId = userId;
                delete budget.id;
                await DB.add('budgets', budget);
            }
        }
        
        // Import bills
        if (data.bills) {
            for (const bill of data.bills) {
                bill.userId = userId;
                delete bill.id;
                await DB.add('bills', bill);
            }
        }
        
        showToast('Data imported successfully', 'success');
        
        // Reload app
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        showToast('Error importing data: ' + error.message, 'error');
    }
}
