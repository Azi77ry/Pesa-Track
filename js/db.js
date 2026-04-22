// IndexedDB Database Module
const DB = {
    name: 'PesaTruckerDB',
    version: 1,
    db: null,

    // Initialize Database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users Store
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('email', 'email', { unique: true });
                }

                // Transactions Store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionStore.createIndex('userId', 'userId', { unique: false });
                    transactionStore.createIndex('type', 'type', { unique: false });
                    transactionStore.createIndex('date', 'date', { unique: false });
                }

                // Budgets Store
                if (!db.objectStoreNames.contains('budgets')) {
                    const budgetStore = db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
                    budgetStore.createIndex('userId', 'userId', { unique: false });
                }

                // Bills Store
                if (!db.objectStoreNames.contains('bills')) {
                    const billStore = db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
                    billStore.createIndex('userId', 'userId', { unique: false });
                    billStore.createIndex('dueDate', 'dueDate', { unique: false });
                }

                // Categories Store
                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    categoryStore.createIndex('userId', 'userId', { unique: false });
                }

                // Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'userId' });
                }

                // Sync Queue Store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('synced', 'synced', { unique: false });
                }

                // License Store
                if (!db.objectStoreNames.contains('license')) {
                    db.createObjectStore('license', { keyPath: 'userId' });
                }
            };
        });
    },

    // Generic CRUD Operations
    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAllByIndex(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // User-specific queries
    async getUserByEmail(email) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('email');
        return new Promise((resolve, reject) => {
            const request = index.get(email);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getUserTransactions(userId) {
        return this.getAllByIndex('transactions', 'userId', userId);
    },

    async getUserBudgets(userId) {
        return this.getAllByIndex('budgets', 'userId', userId);
    },

    async getUserBills(userId) {
        return this.getAllByIndex('bills', 'userId', userId);
    },

    async getUserCategories(userId) {
        return this.getAllByIndex('categories', 'userId', userId);
    },

    async getUserSettings(userId) {
        return this.get('settings', userId);
    },

    async getUserLicense(userId) {
        return this.get('license', userId);
    },

    // Initialize default categories for new user
    async initDefaultCategories(userId) {
        const defaultCategories = [
            { userId, name: 'Salary', type: 'income', icon: 'briefcase' },
            { userId, name: 'Business', type: 'income', icon: 'shop' },
            { userId, name: 'M-Pesa', type: 'income', icon: 'phone' },
            { userId, name: 'Freelance', type: 'income', icon: 'laptop' },
            { userId, name: 'Food', type: 'expense', icon: 'cup-hot' },
            { userId, name: 'Boda', type: 'expense', icon: 'bicycle' },
            { userId, name: 'Rent', type: 'expense', icon: 'house-door' },
            { userId, name: 'M-Pesa Charges', type: 'expense', icon: 'phone' },
            { userId, name: 'Utilities', type: 'expense', icon: 'lightning-charge' },
            { userId, name: 'Healthcare', type: 'expense', icon: 'heart' },
            { userId, name: 'Education', type: 'expense', icon: 'book' },
            { userId, name: 'Shopping', type: 'expense', icon: 'bag' },
            { userId, name: 'Family Support', type: 'expense', icon: 'people' },
            { userId, name: 'Airtime & Data', type: 'expense', icon: 'wifi' },
            { userId, name: 'Other', type: 'expense', icon: 'three-dots' }
        ];

        for (const category of defaultCategories) {
            await this.add('categories', category);
        }
    },

    // Initialize default settings for new user
    async initDefaultSettings(userId) {
        const defaultSettings = {
            userId,
            currency: 'TZS',
            theme: 'light',
            notifications: true,
            language: 'en'
        };
        await this.add('settings', defaultSettings);
    },

    async ensureLocalizedDefaults(userId) {
        const existingCategories = await this.getUserCategories(userId);
        const existingSettings = await this.getUserSettings(userId);
        const categoryKeys = new Set(existingCategories.map(category => `${category.type}:${category.name.toLowerCase()}`));
        const suggestedCategories = [
            { userId, name: 'M-Pesa', type: 'income', icon: 'phone' },
            { userId, name: 'Business', type: 'income', icon: 'shop' },
            { userId, name: 'Food', type: 'expense', icon: 'cup-hot' },
            { userId, name: 'Boda', type: 'expense', icon: 'bicycle' },
            { userId, name: 'Rent', type: 'expense', icon: 'house-door' },
            { userId, name: 'M-Pesa Charges', type: 'expense', icon: 'phone' }
        ];

        for (const category of suggestedCategories) {
            const key = `${category.type}:${category.name.toLowerCase()}`;
            if (!categoryKeys.has(key)) {
                await this.add('categories', category);
            }
        }

        if (!existingSettings) {
            await this.initDefaultSettings(userId);
            return;
        }

        const nextSettings = {
            ...existingSettings,
            currency: existingSettings.currency || 'TZS',
            language: existingSettings.language || 'en'
        };
        await this.update('settings', nextSettings);
    },

    // Clear user data (for logout)
    async clearUserData() {
        // This doesn't delete data, just for logout
        // Data remains in IndexedDB for offline access
    }
};

// Initialize DB on load
DB.init().catch(err => console.error('Database initialization error:', err));
