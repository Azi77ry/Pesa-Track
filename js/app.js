// Main Application Module
const App = {
    initialized: false,
    currentView: 'dashboard',

    // Initialize App
    async init() {
        if (this.initialized) return;

        await DB.init();

        // Try auto-login
        const loggedIn = await Auth.autoLogin();
        
        if (loggedIn) {
            // Show app
            document.getElementById('auth-container').classList.add('d-none');
            document.getElementById('activation-container').classList.add('d-none');
            document.getElementById('app-container').classList.remove('d-none');

            // Load user data
            await this.loadUserData();

            // Apply settings
            await this.applySettings();

            // Load dashboard
            this.loadDashboard();

            // Setup notifications
            this.setupNotifications();

            this.initialized = true;
        } else {
            showAuthContainer();
        }
    },

    // Load user data
    async loadUserData() {
        const userId = parseInt(Auth.getCurrentUserId());
        const user = Auth.getCurrentUser();

        // Update navbar username
        document.getElementById('nav-username').textContent = user.name || 'User';
        this.updateUserAvatar(user.profileImage);

        // Load categories for dropdowns
        await this.loadCategories();
    },

    // Apply user settings
    async applySettings() {
        const userId = parseInt(Auth.getCurrentUserId());
        const settings = await DB.getUserSettings(userId);

        if (settings) {
            // Apply theme
            document.documentElement.setAttribute('data-theme', settings.theme || 'light');
            
            // Set form values
            const themeSelect = document.getElementById('setting-theme');
            if (themeSelect) themeSelect.value = settings.theme || 'light';

            const currencySelect = document.getElementById('setting-currency');
            if (currencySelect) currencySelect.value = settings.currency || 'USD';

            const notificationsCheck = document.getElementById('setting-notifications');
            if (notificationsCheck) notificationsCheck.checked = settings.notifications !== false;
        }
    },

    // Load categories for dropdowns
    async loadCategories() {
        const userId = parseInt(Auth.getCurrentUserId());
        const categories = await DB.getUserCategories(userId);

        // Transaction category dropdown
        const transactionCategorySelect = document.getElementById('transaction-category');
        if (transactionCategorySelect) {
            transactionCategorySelect.innerHTML = categories
                .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
                .join('');
        }

        // Budget category dropdown
        const budgetCategorySelect = document.getElementById('budget-category');
        if (budgetCategorySelect) {
            budgetCategorySelect.innerHTML = categories
                .filter(cat => cat.type === 'expense')
                .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
                .join('');
        }

        // Bill category dropdown
        const billCategorySelect = document.getElementById('bill-category');
        if (billCategorySelect) {
            billCategorySelect.innerHTML = categories
                .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
                .join('');
        }

        // Filter category dropdown
        const filterCategorySelect = document.getElementById('filter-category');
        if (filterCategorySelect) {
            filterCategorySelect.innerHTML = '<option value="all">All Categories</option>' +
                categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }

        return categories;
    },

    // Load Dashboard
    async loadDashboard() {
        const userId = parseInt(Auth.getCurrentUserId());
        const transactions = await DB.getUserTransactions(userId);
        const settings = await DB.getUserSettings(userId);
        const currency = this.getCurrencySymbol(settings?.currency || 'USD');

        // Get current month transactions
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const monthTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date >= firstDay && date <= lastDay;
        });

        // Calculate totals
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const monthIncome = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const monthExpenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const currentBalance = totalIncome - totalExpenses;
        const monthlyRemaining = monthIncome - monthExpenses;

        // Update summary cards
        document.getElementById('total-income').textContent = this.formatCurrency(totalIncome, currency);
        document.getElementById('total-expenses').textContent = this.formatCurrency(totalExpenses, currency);
        document.getElementById('current-balance').textContent = this.formatCurrency(currentBalance, currency);
        document.getElementById('monthly-remaining').textContent = this.formatCurrency(monthlyRemaining, currency);

        // Load recent transactions
        await this.loadRecentTransactions();

        // Load upcoming bills
        await this.loadUpcomingBills();

        // Load budget alerts
        await this.loadBudgetAlerts();
    },

    // Load Recent Transactions
    async loadRecentTransactions() {
        const userId = parseInt(Auth.getCurrentUserId());
        const transactions = await DB.getUserTransactions(userId);
        const categories = await DB.getUserCategories(userId);
        const settings = await DB.getUserSettings(userId);
        const currency = this.getCurrencySymbol(settings?.currency || 'USD');

        // Sort by date descending
        const recentTransactions = transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        const container = document.getElementById('recent-transactions-list');

        if (recentTransactions.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>No transactions yet</p></div>';
            return;
        }

        container.innerHTML = recentTransactions.map(t => {
            const category = categories.find(c => c.id === t.category);
            const categoryName = category ? category.name : 'Unknown';
            const icon = category ? category.icon : 'circle';
            const date = new Date(t.date).toLocaleDateString();

            return `
                <div class="transaction-item transaction-${t.type}">
                    <div class="d-flex align-items-center flex-grow-1">
                        <div class="transaction-icon">
                            <i class="bi bi-${icon}"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${categoryName}</div>
                            <small class="text-muted">${date}</small>
                            ${t.note ? `<div><small class="text-muted">${t.note}</small></div>` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="transaction-amount">${t.type === 'income' ? '+' : '-'}${this.formatCurrency(t.amount, currency)}</div>
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
        }).join('');
    },

    // Load Upcoming Bills
    async loadUpcomingBills() {
        const userId = parseInt(Auth.getCurrentUserId());
        const bills = await DB.getUserBills(userId);
        const settings = await DB.getUserSettings(userId);
        const currency = this.getCurrencySymbol(settings?.currency || 'USD');

        const now = new Date();
        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const upcomingBills = bills
            .filter(b => {
                const dueDate = new Date(b.dueDate);
                return !b.paid && dueDate <= next30Days;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);

        const container = document.getElementById('upcoming-bills-list');

        if (upcomingBills.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-check-circle"></i><p>No upcoming bills</p></div>';
            return;
        }

        container.innerHTML = upcomingBills.map(b => {
            const dueDate = new Date(b.dueDate);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntilDue < 0;
            const statusClass = isOverdue ? 'overdue' : '';

            return `
                <div class="bill-item ${statusClass} mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold">${b.name}</div>
                            <small class="text-muted">${dueDate.toLocaleDateString()}</small>
                            ${isOverdue ? '<div><span class="badge bg-danger">Overdue</span></div>' : 
                              daysUntilDue <= 3 ? `<div><span class="badge bg-warning">Due in ${daysUntilDue} days</span></div>` : ''}
                        </div>
                        <div class="fw-bold">${this.formatCurrency(b.amount, currency)}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Load Budget Alerts
    async loadBudgetAlerts() {
        const userId = parseInt(Auth.getCurrentUserId());
        const budgets = await DB.getUserBudgets(userId);
        const transactions = await DB.getUserTransactions(userId);
        const categories = await DB.getUserCategories(userId);

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        const alerts = [];

        for (const budget of budgets) {
            const categoryTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return t.category === budget.category && 
                       t.type === 'expense' && 
                       date >= firstDay;
            });

            const spent = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
            const percentage = (spent / budget.amount) * 100;

            if (percentage >= 80) {
                const category = categories.find(c => c.id === budget.category);
                alerts.push({
                    category: category?.name || 'Unknown',
                    spent,
                    budget: budget.amount,
                    percentage
                });
            }
        }

        const container = document.getElementById('budget-alerts-list');

        if (alerts.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-check-circle"></i><p>All budgets on track</p></div>';
            return;
        }

        container.innerHTML = alerts.map(a => {
            const alertClass = a.percentage >= 100 ? 'danger' : 'warning';
            return `
                <div class="alert alert-${alertClass} mb-2">
                    <div class="fw-bold">${a.category}</div>
                    <small>${a.percentage.toFixed(0)}% used</small>
                    <div class="progress mt-2" style="height: 6px;">
                        <div class="progress-bar bg-${alertClass}" style="width: ${Math.min(a.percentage, 100)}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Helper Functions
    getCurrencySymbol(code) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'TZS': 'TSh',
            'KES': 'KSh'
        };
        return symbols[code] || code;
    },

    formatCurrency(amount, symbol = '$') {
        return `${symbol}${parseFloat(amount).toFixed(2)}`;
    },

    // Setup Notifications
    setupNotifications() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
};

// Update sidebar avatar
App.updateUserAvatar = function (imageData) {
    const avatar = document.getElementById('sidebar-avatar');
    if (!avatar) return;
    if (imageData) {
        avatar.innerHTML = `<img src="${imageData}" alt="Profile">`;
    } else {
        avatar.innerHTML = `<i class="bi bi-person"></i>`;
    }
};

// View Management
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.add('d-none');
    });

    // Show selected view
    document.getElementById(viewId).classList.remove('d-none');

    // Update sidebar active state and title
    document.querySelectorAll('.side-nav-link').forEach(item => {
        item.classList.remove('active');
    });

    const activeLink = document.querySelector(`.side-nav-link[data-view="${viewId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        const title = activeLink.getAttribute('data-title') || 'PesaTrucker';
        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.textContent = title;
    }

    closeSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

// Navigation Functions
function showDashboard() {
    showView('dashboard-view');
    App.loadDashboard();
}

function showTransactions() {
    showView('transactions-view');
    loadTransactionsView();
}

function showBudgets() {
    showView('budgets-view');
    loadBudgetsView();
}

function showBills() {
    showView('bills-view');
    loadBillsView();
}

function showReports() {
    showView('reports-view');
    loadReportsView();
}

function showHelp() {
    showView('help-view');
}

let aiInitialized = false;
function showAiAssistant() {
    showView('ai-view');
    if (!aiInitialized) {
        initAiAssistant();
        aiInitialized = true;
    }
}

function showProfile() {
    showView('profile-view');
    loadProfileView();
}

function showSettings() {
    showView('settings-view');
    loadSettingsView();
}

// Load Profile View
function loadProfileView() {
    const user = Auth.getCurrentUser();
    const userId = Auth.getCurrentUserId();

    document.getElementById('profile-content').innerHTML = `
        <div class="profile-avatar-section">
            <div class="profile-avatar" id="profile-avatar-preview">
                ${user.profileImage ? `<img src="${user.profileImage}" alt="Profile">` : '<i class="bi bi-person"></i>'}
            </div>
            <div class="profile-meta">
                <div class="text-muted">User ID: ${userId}</div>
                <div class="text-muted">Member Since: ${new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
        </div>
        <form id="profile-form" onsubmit="handleProfileSave(event)">
            <div class="mb-3">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-control" id="profile-name" value="${user.name || ''}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" id="profile-email" value="${user.email || ''}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Profile Photo</label>
                <input type="file" class="form-control" id="profile-image" accept="image/*">
                <small class="text-muted">JPG/PNG up to 2MB recommended.</small>
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary flex-fill">Save Changes</button>
                <button type="button" class="btn btn-outline-secondary flex-fill" onclick="loadProfileView()">Reset</button>
            </div>
        </form>
    `;

    const fileInput = document.getElementById('profile-image');
    if (fileInput) {
        fileInput.addEventListener('change', handleProfileImageChange);
    }
}

let pendingProfileImage = null;

function handleProfileImageChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image too large. Max 2MB.', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        pendingProfileImage = reader.result;
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) {
            preview.innerHTML = `<img src="${pendingProfileImage}" alt="Profile">`;
        }
    };
    reader.readAsDataURL(file);
}

async function handleProfileSave(event) {
    event.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) return;

    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();

    const updatedUser = {
        ...user,
        name,
        email,
        profileImage: pendingProfileImage || user.profileImage || null
    };

    try {
        await DB.update('users', updatedUser);
        Auth.currentUser = updatedUser;
        localStorage.setItem('userName', updatedUser.name);
        localStorage.setItem('userEmail', updatedUser.email);

        document.getElementById('nav-username').textContent = updatedUser.name || 'User';
        App.updateUserAvatar(updatedUser.profileImage);
        pendingProfileImage = null;
        showToast('Profile updated successfully', 'success');
    } catch (error) {
        showToast('Failed to update profile', 'error');
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    
    const toastIcon = toast.querySelector('.toast-header i');
    toastIcon.className = type === 'success' ? 'bi bi-check-circle text-success me-2' : 'bi bi-exclamation-circle text-danger me-2';
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Initialize app when DOM is loaded
function initApp() {
    App.init();
}

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
