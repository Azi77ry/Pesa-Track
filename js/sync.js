// Sync Module - Background Synchronization

const Sync = {
    syncUrl: 'https://api.financeflow.app/sync', // Replace with actual API endpoint
    isSyncing: false,

    // Add item to sync queue
    async addToQueue(type, data) {
        try {
            await DB.add('syncQueue', {
                type,
                data: JSON.stringify(data),
                timestamp: new Date().toISOString(),
                synced: false
            });
        } catch (error) {
            console.error('Error adding to sync queue:', error);
        }
    },

    // Process sync queue
    async processQueue() {
        if (this.isSyncing || !navigator.onLine) {
            return;
        }

        this.isSyncing = true;

        try {
            const queue = await DB.getAll('syncQueue');
            const unsynced = queue.filter(item => !item.synced);

            if (unsynced.length === 0) {
                this.isSyncing = false;
                return;
            }

            // Sync each item
            for (const item of unsynced) {
                try {
                    await this.syncItem(item);
                    
                    // Mark as synced
                    item.synced = true;
                    await DB.update('syncQueue', item);
                } catch (error) {
                    console.error('Error syncing item:', error);
                }
            }

            showToast('Data synced successfully', 'success');

        } catch (error) {
            console.error('Error processing sync queue:', error);
        } finally {
            this.isSyncing = false;
        }
    },

    // Sync individual item
    async syncItem(item) {
        const userId = Auth.getCurrentUserId();
        const data = JSON.parse(item.data);

        // This would normally make an API call to your backend
        // For now, we'll just simulate it
        console.log('Syncing item:', item.type, data);

        // Example API call (commented out - uncomment when backend is ready)
        /*
        const response = await fetch(this.syncUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await this.getAuthToken()}`
            },
            body: JSON.stringify({
                userId,
                type: item.type,
                data
            })
        });

        if (!response.ok) {
            throw new Error('Sync failed');
        }
        */

        return true;
    },

    // Get auth token (would be JWT in production)
    async getAuthToken() {
        // In production, this would return a JWT token
        return localStorage.getItem('authToken') || '';
    },

    // Setup sync listeners
    setupSync() {
        // Sync when online
        window.addEventListener('online', () => {
            console.log('Online - starting sync');
            this.processQueue();
        });

        // Periodic sync (every 5 minutes)
        setInterval(() => {
            if (navigator.onLine) {
                this.processQueue();
            }
        }, 5 * 60 * 1000);

        // Background sync using Service Worker
        if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-data').catch(err => {
                    console.error('Background sync registration failed:', err);
                });
            });
        }
    }
};

// Helper function to add to sync queue (used by other modules)
async function addToSyncQueue(type, data) {
    await Sync.addToQueue(type, data);
}

// Initialize sync on load
document.addEventListener('DOMContentLoaded', () => {
    Sync.setupSync();
});

// Online/Offline Status Indicator
function setupOnlineStatus() {
    const showOnlineStatus = (online) => {
        const message = online ? 'You are online' : 'You are offline';
        const type = online ? 'success' : 'error';
        showToast(message, type);
    };

    window.addEventListener('online', () => {
        showOnlineStatus(true);
        Sync.processQueue();
    });

    window.addEventListener('offline', () => {
        showOnlineStatus(false);
    });
}

// Initialize online status on load
document.addEventListener('DOMContentLoaded', setupOnlineStatus);
