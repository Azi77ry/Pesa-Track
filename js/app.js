// Main Application Module
const App = {
    initialized: false,
    currentView: 'dashboard-view',
    translations: {
        en: {
            personalFinance: 'Personal Finance',
            install: 'Install',
            account: 'Account',
            activityFeed: 'Activity feed',
            insightsKicker: 'Insights',
            overview: 'Overview',
            comparison: 'Comparison',
            topCategories: 'Top Categories',
            sixMonths: '6 months',
            profileHub: 'Profile hub',
            makeItYours: 'Make it yours',
            light: 'Light',
            dark: 'Dark',
            welcomeBack: 'Welcome back',
            totalBalance: 'Total Balance',
            totalIncomeLabel: 'Total Income',
            totalExpenseLabel: 'Total Expenses',
            currentBalanceLabel: 'Current Balance',
            monthlySavingsLabel: 'Savings This Month',
            addIncome: 'Add Income',
            addExpense: 'Add Expense',
            createBudget: 'Create Budget',
            addBill: 'Add Bill',
            recordEarnings: 'Record earnings',
            trackSpending: 'Track spending',
            setALimit: 'Set a limit',
            neverMissDue: 'Never miss due',
            recentTransactions: 'Recent Transactions',
            upcomingBills: 'Upcoming Bills',
            budgetAlerts: 'Budget Alerts',
            weeklyExpenses: 'Weekly Expenses',
            home: 'Home',
            activity: 'Activity',
            insights: 'Insights',
            profile: 'Profile',
            quickAdd: 'Quick Add',
            createSomethingFast: 'Create something fast',
            addBudgetSheet: 'Add Budget',
            addEvent: 'Add Event',
            language: 'Language',
            english: 'English',
            swahili: 'Swahili',
            currency: 'Currency',
            theme: 'Theme',
            notifications: 'Enable Notifications',
            dashboard: 'Dashboard',
            transactions: 'Transactions',
            bills: 'Bills',
            events: 'Events',
            reports: 'Reports',
            budgets: 'Budgets',
            settings: 'Settings',
            help: 'Help',
            license: 'License',
            all: 'All'
        },
        sw: {
            personalFinance: 'Fedha Binafsi',
            install: 'Sakinisha',
            account: 'Akaunti',
            activityFeed: 'Mtiririko wa shughuli',
            insightsKicker: 'Tathmini',
            overview: 'Muhtasari',
            comparison: 'Linganisho',
            topCategories: 'Makundi Makuu',
            sixMonths: 'Miezi 6',
            profileHub: 'Kitovu cha wasifu',
            makeItYours: 'Boreshwa upendavyo',
            light: 'Mwanga',
            dark: 'Giza',
            welcomeBack: 'Karibu tena',
            totalBalance: 'Salio Kuu',
            totalIncomeLabel: 'Mapato Yote',
            totalExpenseLabel: 'Matumizi Yote',
            currentBalanceLabel: 'Salio la Sasa',
            monthlySavingsLabel: 'Akiba ya Mwezi',
            addIncome: 'Ongeza Mapato',
            addExpense: 'Ongeza Matumizi',
            createBudget: 'Tengeneza Bajeti',
            addBill: 'Ongeza Bili',
            recordEarnings: 'Hifadhi mapato',
            trackSpending: 'Fuatilia matumizi',
            setALimit: 'Weka kikomo',
            neverMissDue: 'Usikose tarehe',
            recentTransactions: 'Miamala ya Karibuni',
            upcomingBills: 'Bili Zijazo',
            budgetAlerts: 'Tahadhari za Bajeti',
            weeklyExpenses: 'Matumizi ya Wiki',
            home: 'Nyumbani',
            activity: 'Shughuli',
            insights: 'Tathmini',
            profile: 'Wasifu',
            quickAdd: 'Ongeza Haraka',
            createSomethingFast: 'Unda kwa haraka',
            addBudgetSheet: 'Ongeza Bajeti',
            addEvent: 'Ongeza Tukio',
            language: 'Lugha',
            english: 'Kiingereza',
            swahili: 'Kiswahili',
            currency: 'Sarafu',
            theme: 'Mandhari',
            notifications: 'Washa Arifa',
            dashboard: 'Dashibodi',
            transactions: 'Miamala',
            bills: 'Bili',
            events: 'Matukio',
            reports: 'Ripoti',
            budgets: 'Bajeti',
            settings: 'Mipangilio',
            help: 'Msaada',
            license: 'Leseni',
            all: 'Zote'
        }
    },

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
            showDashboard();

            // Setup notifications
            this.setupNotifications();
            this.setupInstallPrompt();

            this.initialized = true;
        } else {
            showAuthContainer();
        }
    },

    // Load user data
    async loadUserData() {
        const userId = parseInt(Auth.getCurrentUserId());
        const user = Auth.getCurrentUser();
        await DB.ensureLocalizedDefaults(userId);

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

        const theme = settings?.theme || 'light';
        const currency = settings?.currency || 'TZS';
        const notificationsEnabled = settings?.notifications !== false;

        document.documentElement.setAttribute('data-theme', theme);

        const themeSelect = document.getElementById('setting-theme');
        if (themeSelect) themeSelect.value = theme;

        const currencySelect = document.getElementById('setting-currency');
        if (currencySelect) currencySelect.value = currency;

        const languageSelect = document.getElementById('setting-language');
        if (languageSelect) languageSelect.value = settings?.language || 'en';

        const notificationsCheck = document.getElementById('setting-notifications');
        if (notificationsCheck) notificationsCheck.checked = notificationsEnabled;
        this.applyLanguage(settings?.language || 'en');
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
        const currency = this.getCurrencySymbol(settings?.currency || 'TZS');

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

        const currentBalanceEl = document.getElementById('current-balance');
        if (currentBalanceEl) {
            currentBalanceEl.textContent = this.formatCurrency(currentBalance, currency);
        }

        const monthlyRemainingEl = document.getElementById('monthly-remaining');
        if (monthlyRemainingEl) {
            monthlyRemainingEl.textContent = this.formatCurrency(monthlyRemaining, currency);
        }

        const heroBalance = document.getElementById('hero-current-balance');
        if (heroBalance) {
            heroBalance.textContent = currentBalanceEl
                ? currentBalanceEl.textContent
                : this.formatCurrency(currentBalance, currency);
        }

        const heroUser = document.getElementById('hero-username');
        if (heroUser) {
            const user = Auth.getCurrentUser();
            const storedName = localStorage.getItem('userName') || sessionStorage.getItem('userName');
            heroUser.textContent = (user && user.name) ? user.name : (storedName || 'User');
        }

        await this.loadWeeklyExpenseChart(transactions, currency);

        // Load recent transactions
        await this.loadRecentTransactions();

        // Load upcoming bills
        await this.loadUpcomingBills();

        // Load budget alerts
        await this.loadBudgetAlerts();
    },

    async loadWeeklyExpenseChart(transactions, currency) {
        const ctx = document.getElementById('weeklyExpenseChart');
        if (!ctx || typeof Chart === 'undefined') return;

        const today = new Date();
        const labels = [];
        const dateLabels = [];
        const totals = [];
        const dateKeyMap = {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const key = date.toDateString();
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            dateLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            dateKeyMap[key] = labels.length - 1;
            totals.push(0);
        }

        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const date = new Date(t.date);
                const key = date.toDateString();
                const index = dateKeyMap[key];
                if (index !== undefined) {
                    totals[index] += parseFloat(t.amount);
                }
            });

        if (this.weeklyExpenseChart) {
            this.weeklyExpenseChart.destroy();
        }

        this.weeklyExpenseChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Daily Expenses',
                        data: totals,
                        borderColor: '#7c6bff',
                        backgroundColor: 'rgba(124, 107, 255, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#7c6bff',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(items) {
                                if (!items || !items.length) return '';
                                const index = items[0].dataIndex;
                                return `${labels[index]} • ${dateLabels[index]}`;
                            },
                            label: function(context) {
                                return `Expenses: ${currency}${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(124, 107, 255, 0.12)'
                        },
                        ticks: {
                            callback: function(value) {
                                return currency + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    },

    // Load Recent Transactions
    async loadRecentTransactions() {
        const userId = parseInt(Auth.getCurrentUserId());
        const transactions = await DB.getUserTransactions(userId);
        const categories = await DB.getUserCategories(userId);
        const settings = await DB.getUserSettings(userId);
        const currency = this.getCurrencySymbol(settings?.currency || 'TZS');

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
        const currency = this.getCurrencySymbol(settings?.currency || 'TZS');

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
    },

    setupInstallPrompt() {
        let deferredPrompt = null;
        const installBtn = document.getElementById('install-app-btn');
        const installBtnMobile = document.getElementById('install-app-btn-mobile');

        const hideInstall = () => {
            if (installBtn) installBtn.classList.add('d-none');
            if (installBtnMobile) installBtnMobile.classList.add('d-none');
        };

        const showInstall = () => {
            if (installBtn) installBtn.classList.remove('d-none');
            if (installBtnMobile) installBtnMobile.classList.remove('d-none');
        };

        const handleInstallClick = async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            hideInstall();
        };

        if (installBtn) installBtn.addEventListener('click', handleInstallClick);
        if (installBtnMobile) installBtnMobile.addEventListener('click', handleInstallClick);

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPrompt = event;
            showInstall();
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            hideInstall();
            showToast('App installed successfully', 'success');
        });

        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            hideInstall();
        }
    }
};

// Update sidebar avatar
App.updateUserAvatar = function (imageData) {
    ['topbar-avatar', 'sidebar-avatar'].forEach(id => {
        const avatar = document.getElementById(id);
        if (!avatar) return;
        avatar.innerHTML = imageData
            ? `<img src="${imageData}" alt="Profile">`
            : `<i class="bi bi-person"></i>`;
    });
};

App.updateViewMeta = function (viewId) {
    const meta = this.getViewMeta()[viewId] || {};
    const titleEl = document.getElementById('view-title');
    const kickerEl = document.getElementById('view-kicker');
    const subtitleEl = document.getElementById('view-subtitle');

    if (titleEl) titleEl.textContent = meta.title || 'PesaTrucker';
    if (kickerEl) kickerEl.textContent = meta.kicker || 'Overview';
    if (subtitleEl) subtitleEl.textContent = meta.subtitle || 'Manage your finances with confidence.';
};

App.getCurrentLanguage = function () {
    const settingLanguage = document.getElementById('setting-language')?.value;
    return settingLanguage || localStorage.getItem('appLanguage') || 'en';
};

App.getViewMeta = function () {
    const language = this.getCurrentLanguage();
    const localized = {
        en: {
            'dashboard-view': { title: 'Dashboard', kicker: 'Home', subtitle: 'Track your balance, cash flow, bills, and budget health.' },
            'transactions-view': { title: 'Activity', kicker: 'Transactions', subtitle: 'Review income and expenses with quick filters and search.' },
            'bills-view': { title: 'Activity', kicker: 'Bills', subtitle: 'Manage recurring bills, due dates, and payment status.' },
            'events-view': { title: 'Activity', kicker: 'Events', subtitle: 'Keep reminders and financial events close at hand.' },
            'reports-view': { title: 'Insights', kicker: 'Reports', subtitle: 'Explore trends, charts, and spending analytics.' },
            'budgets-view': { title: 'Insights', kicker: 'Budgets', subtitle: 'Monitor category limits, alerts, and monthly progress.' },
            'profile-view': { title: 'Profile', kicker: 'Account', subtitle: 'Manage your details, account info, and shortcuts.' },
            'settings-view': { title: 'Profile', kicker: 'Settings', subtitle: 'Adjust currency, theme, notifications, and categories.' },
            'license-view': { title: 'Profile', kicker: 'License', subtitle: 'View activation status and manage access.' },
            'help-view': { title: 'Profile', kicker: 'Help', subtitle: 'Find support, guidance, and product information.' },
            'ai-view': { title: 'AI Assistant', kicker: 'Support', subtitle: 'Ask questions and get answers from the app documentation.' }
        },
        sw: {
            'dashboard-view': { title: 'Dashibodi', kicker: 'Nyumbani', subtitle: 'Fuatilia salio, mtiririko wa fedha, bili na afya ya bajeti.' },
            'transactions-view': { title: 'Shughuli', kicker: 'Miamala', subtitle: 'Pitia mapato na matumizi kwa vichujio na utafutaji wa haraka.' },
            'bills-view': { title: 'Shughuli', kicker: 'Bili', subtitle: 'Simamia bili za kujirudia, tarehe za mwisho na malipo.' },
            'events-view': { title: 'Shughuli', kicker: 'Matukio', subtitle: 'Weka vikumbusho na matukio ya kifedha karibu nawe.' },
            'reports-view': { title: 'Tathmini', kicker: 'Ripoti', subtitle: 'Chunguza mwenendo, chati na uchambuzi wa matumizi.' },
            'budgets-view': { title: 'Tathmini', kicker: 'Bajeti', subtitle: 'Fuatilia vikomo vya makundi, tahadhari na maendeleo ya mwezi.' },
            'profile-view': { title: 'Wasifu', kicker: 'Akaunti', subtitle: 'Simamia taarifa zako, akaunti na njia za mkato.' },
            'settings-view': { title: 'Wasifu', kicker: 'Mipangilio', subtitle: 'Badili sarafu, mandhari, arifa na makundi.' },
            'license-view': { title: 'Wasifu', kicker: 'Leseni', subtitle: 'Angalia hali ya uanzishaji na udhibiti wa ufikiaji.' },
            'help-view': { title: 'Wasifu', kicker: 'Msaada', subtitle: 'Pata msaada, mwongozo na taarifa za bidhaa.' },
            'ai-view': { title: 'Msaidizi wa AI', kicker: 'Msaada', subtitle: 'Uliza maswali na upate majibu kutoka nyaraka za app.' }
        }
    };
    return localized[language] || localized.en;
};

App.applyLanguage = function (language = 'en') {
    const dict = this.translations[language] || this.translations.en;
    document.documentElement.lang = language;
    localStorage.setItem('appLanguage', language);

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        if (dict[key]) {
            element.textContent = dict[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.dataset.i18nPlaceholder;
        if (dict[key]) {
            element.placeholder = dict[key];
        }
    });

    this.updateViewMeta(this.currentView || 'dashboard-view');
};

App.getNavGroup = function (viewId) {
    if (viewId === 'dashboard-view') return 'home';
    if (['transactions-view', 'bills-view', 'events-view'].includes(viewId)) return 'activity';
    if (['reports-view', 'budgets-view'].includes(viewId)) return 'insights';
    if (['profile-view', 'settings-view', 'license-view', 'help-view'].includes(viewId)) return 'profile';
    return '';
};

// View Management
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.add('d-none');
    });

    // Show selected view
    document.getElementById(viewId).classList.remove('d-none');

    App.currentView = viewId;
    App.updateViewMeta(viewId);

    // Update old sidebar hooks if present
    document.querySelectorAll('.side-nav-link').forEach(item => {
        item.classList.remove('active');
    });

    const activeLink = document.querySelector(`.side-nav-link[data-view="${viewId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    document.querySelectorAll('.section-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === viewId);
    });

    const navGroup = App.getNavGroup(viewId);
    document.querySelectorAll('.app-nav-link').forEach(item => {
        item.classList.toggle('active', item.dataset.group === navGroup);
    });

    closeQuickAddSheet();
    closeSidebar();
}

function showActivity() {
    showTransactions();
}

function showInsights() {
    showReports();
}

function showProfileHome() {
    showProfile();
}

function toggleQuickAddSheet() {
    const sheet = document.getElementById('quick-add-sheet');
    const backdrop = document.getElementById('quick-add-backdrop');
    if (!sheet || !backdrop) return;

    const isOpen = sheet.classList.toggle('open');
    backdrop.classList.toggle('show', isOpen);
    sheet.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function closeQuickAddSheet() {
    const sheet = document.getElementById('quick-add-sheet');
    const backdrop = document.getElementById('quick-add-backdrop');
    if (!sheet || !backdrop) return;

    sheet.classList.remove('open');
    backdrop.classList.remove('show');
    sheet.setAttribute('aria-hidden', 'true');
}

function openQuickAddAnd(type) {
    closeQuickAddSheet();

    if (type === 'income' || type === 'expense') {
        showAddTransactionModal(type);
        return;
    }

    if (type === 'budget') {
        showAddBudgetModal();
        return;
    }

    if (type === 'bill') {
        showAddBillModal();
        return;
    }

    if (type === 'event') {
        showAddEventModal();
    }
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

function showEvents() {
    showView('events-view');
    loadEventsView();
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
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeQuickAddSheet();
        }
    });
    App.init();
});
