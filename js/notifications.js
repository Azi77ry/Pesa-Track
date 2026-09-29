// Notifications Module — Native Phone Notification Bar & System Alerts via Service Worker
const Notifications = {
    permission: 'default',
    isSupported: false,

    async init() {
        this.isSupported = 'Notification' in window;
        if (this.isSupported) {
            this.permission = Notification.permission;
        }

        // Schedule periodic checks when app is active
        this.checkFinancialAlerts();
        
        // Setup daily check interval (every 30 mins while app is open)
        setInterval(() => this.checkFinancialAlerts(), 30 * 60 * 1000);
    },

    // Request permission from user with friendly prompt
    async requestPermission() {
        if (!this.isSupported) {
            if (typeof showToast === 'function') {
                showToast('Notifications are not supported by this browser.', 'warning');
            }
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            this.permission = result;
            
            // Save preference in settings
            const userId = typeof Auth !== 'undefined' ? parseInt(Auth.getCurrentUserId()) : null;
            if (userId && typeof DB !== 'undefined') {
                const settings = await DB.getUserSettings(userId) || {};
                settings.notifications = result === 'granted';
                await DB.saveUserSettings(userId, settings);
            }

            if (result === 'granted') {
                if (typeof showToast === 'function') {
                    showToast('Phone notifications enabled! You will receive alerts on your notification bar.', 'success');
                }
                // Send an immediate welcome confirmation to phone notification bar
                this.showPhoneNotification('🔔 PesaTrucker Alerts Active', {
                    body: 'You will now receive alerts for upcoming bills, budget limits, and savings milestones!',
                    tag: 'welcome-notification',
                    renotify: true
                });
                return true;
            } else {
                if (typeof showToast === 'function') {
                    showToast('Notification permission was declined.', 'warning');
                }
                return false;
            }
        } catch (e) {
            console.error('Error requesting notification permission:', e);
            return false;
        }
    },

    // Send a real Phone Status Bar / Drawer notification using Service Worker
    async showPhoneNotification(title, options = {}) {
        if (!this.isSupported) return false;
        if (Notification.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) return false;
        }

        const basePath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '';
        const defaultIcon = `${basePath}/assets/icon192.png`;
        const defaultBadge = `${basePath}/assets/icon192.png`;

        const notificationOptions = {
            body: options.body || '',
            icon: options.icon || defaultIcon,
            badge: options.badge || defaultBadge,
            vibrate: options.vibrate || [100, 50, 100, 50, 200],
            tag: options.tag || 'pesatrucker-general',
            renotify: options.renotify !== false,
            requireInteraction: options.requireInteraction || false,
            data: {
                url: options.url || window.location.href,
                view: options.view || 'dashboard-view',
                date: new Date().toISOString(),
                ...options.data
            },
            actions: options.actions || [
                { action: 'open', title: 'Open PesaTrucker' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        };

        // Try Service Worker registration first (standard for Android/iOS mobile notification bar)
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration && typeof registration.showNotification === 'function') {
                    await registration.showNotification(title, notificationOptions);
                    return true;
                }
            }
        } catch (swErr) {
            console.warn('Service Worker notification failed, falling back to window Notification:', swErr);
        }

        // Fallback to Window Notification if Service Worker is not active
        try {
            const notif = new Notification(title, {
                body: notificationOptions.body,
                icon: notificationOptions.icon,
                badge: notificationOptions.badge,
                tag: notificationOptions.tag,
                data: notificationOptions.data
            });
            notif.onclick = function(e) {
                e.preventDefault();
                window.focus();
                if (options.view && typeof showView === 'function') {
                    showView(options.view);
                }
                notif.close();
            };
            return true;
        } catch (winErr) {
            console.error('Window Notification failed:', winErr);
            // Fallback to in-app toast
            if (typeof showToast === 'function') {
                showToast(`${title}: ${options.body}`, 'info');
            }
            return false;
        }
    },

    // Automated Financial Alert Scanner
    async checkFinancialAlerts() {
        if (!this.isSupported || Notification.permission !== 'granted') return;
        const userId = typeof Auth !== 'undefined' ? parseInt(Auth.getCurrentUserId()) : null;
        if (!userId || typeof DB === 'undefined') return;

        try {
            const settings = await DB.getUserSettings(userId);
            if (settings && settings.notifications === false) return;
            const currency = typeof App !== 'undefined' ? App.getCurrencySymbol(settings?.currency || 'TZS') : 'TZS';

            // 1. Check Upcoming & Overdue Bills
            await this.checkBillsAlerts(userId, currency);

            // 2. Check Over-Budget Categories
            await this.checkBudgetAlerts(userId, currency);

            // 3. Check Milestone Achievements
            await this.checkGoalMilestones(userId, currency);
        } catch (err) {
            console.warn('Error checking financial alerts:', err);
        }
    },

    // 1. Bills due check
    async checkBillsAlerts(userId, currency) {
        const bills = await DB.getUserBills(userId);
        if (!bills || !bills.length) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const soonBills = [];
        const overdueBills = [];

        bills.forEach(bill => {
            if (bill.status === 'paid' || bill.paid) return;
            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                overdueBills.push(bill);
            } else if (diffDays <= 2) {
                soonBills.push({ bill, diffDays });
            }
        });

        if (overdueBills.length > 0) {
            const totalOverdue = overdueBills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
            this.showPhoneNotification('⚠️ Overdue Bill Reminder', {
                body: `You have ${overdueBills.length} overdue bill(s) totaling ${currency} ${totalOverdue.toLocaleString()}. Tap to view & pay.`,
                tag: 'overdue-bills-alert',
                view: 'bills-view',
                vibrate: [200, 100, 200, 100, 300]
            });
        } else if (soonBills.length > 0) {
            const b = soonBills[0];
            const dueText = b.diffDays === 0 ? 'today' : `in ${b.diffDays} day(s)`;
            this.showPhoneNotification('📅 Upcoming Bill Due', {
                body: `"${b.bill.name}" (${currency} ${parseFloat(b.bill.amount).toLocaleString()}) is due ${dueText}!`,
                tag: `bill-soon-${b.bill.id}`,
                view: 'bills-view'
            });
        }
    },

    // 2. Budget limits check
    async checkBudgetAlerts(userId, currency) {
        const budgets = await DB.getUserBudgets(userId);
        const transactions = await DB.getUserTransactions(userId);
        const categories = await DB.getUserCategories(userId);
        if (!budgets || !budgets.length) return;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        budgets.forEach(budget => {
            const cat = categories.find(c => c.id === parseInt(budget.categoryId));
            const catName = budget.name || (cat ? cat.name : 'Category');
            const limit = parseFloat(budget.amount || 0);
            if (limit <= 0) return;

            const spent = transactions
                .filter(t => t.type === 'expense' && parseInt(t.category) === parseInt(budget.categoryId) && t.date.startsWith(currentMonth))
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

            const pct = Math.round((spent / limit) * 100);

            if (pct >= 100) {
                this.showPhoneNotification('🚨 Budget Exceeded!', {
                    body: `You've exceeded your ${catName} budget: ${currency} ${spent.toLocaleString()} spent of ${currency} ${limit.toLocaleString()} (${pct}%).`,
                    tag: `budget-exceeded-${budget.id}`,
                    view: 'budgets-view',
                    vibrate: [300, 100, 300]
                });
            } else if (pct >= 85) {
                this.showPhoneNotification('⚡ Budget Warning (85%)', {
                    body: `You've used ${pct}% of your ${catName} budget (${currency} ${spent.toLocaleString()} / ${currency} ${limit.toLocaleString()}).`,
                    tag: `budget-warning-${budget.id}`,
                    view: 'budgets-view'
                });
            }
        });
    },

    // 3. Goal Milestones check
    async checkGoalMilestones(userId, currency) {
        if (!DB.getUserGoals) return;
        const goals = await DB.getUserGoals(userId);
        if (!goals || !goals.length) return;

        goals.forEach(goal => {
            const target = parseFloat(goal.targetAmount || 0);
            const current = parseFloat(goal.currentAmount || 0);
            if (target <= 0) return;

            const pct = Math.round((current / target) * 100);
            if (pct >= 100 && !goal.notified100) {
                this.showPhoneNotification('🎉 Goal Reached! Congratulations!', {
                    body: `You have successfully reached your target for "${goal.title}" (${currency} ${current.toLocaleString()})! 🎯`,
                    tag: `goal-reached-${goal.id}`,
                    view: 'goals-view',
                    vibrate: [150, 100, 150, 100, 400]
                });
            }
        });
    },

    // Send a test phone notification on user demand
    async sendTestNotification() {
        const granted = await this.showPhoneNotification('🚀 PesaTrucker Notification Test', {
            body: 'Success! PesaTrucker phone status bar notifications are active and working on your device.',
            tag: 'test-notification-' + Date.now(),
            renotify: true,
            vibrate: [150, 100, 200, 100, 250]
        });

        if (granted && typeof showToast === 'function') {
            showToast('Test notification sent! Check your phone notification bar / status tray.', 'success');
        }
    }
};

// Auto-initialize when window loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        Notifications.init();
    });
}
