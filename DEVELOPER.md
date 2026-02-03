# Developer Documentation

## Architecture Overview

FinanceFlow is built as an offline-first Progressive Web App with the following architecture:

### Data Flow

```
User Input → JavaScript Module → IndexedDB → Sync Queue → Backend API (when online)
                                      ↓
                                  UI Update
```

### Key Components

1. **IndexedDB (db.js)**: Primary data storage
2. **Authentication (auth.js)**: User management with password hashing
3. **License System (license.js)**: Activation code validation
4. **Core App (app.js)**: Main application logic and navigation
5. **Feature Modules**: Transactions, Budgets, Bills, Reports, Settings
6. **Sync Module (sync.js)**: Background synchronization
7. **Service Worker (sw.js)**: Offline functionality and caching

## Database Schema

### IndexedDB Stores

#### users
```javascript
{
  id: Number (auto-increment),
  name: String,
  email: String (indexed, unique),
  password: String (hashed),
  createdAt: ISO String
}
```

#### transactions
```javascript
{
  id: Number (auto-increment),
  userId: Number (indexed),
  type: 'income' | 'expense' (indexed),
  category: Number (category id),
  amount: Number,
  date: ISO String (indexed),
  note: String,
  updatedAt: ISO String,
  synced: Boolean
}
```

#### budgets
```javascript
{
  id: Number (auto-increment),
  userId: Number (indexed),
  category: Number,
  amount: Number,
  period: 'monthly' | 'quarterly' | 'yearly',
  createdAt: ISO String
}
```

#### bills
```javascript
{
  id: Number (auto-increment),
  userId: Number (indexed),
  name: String,
  amount: Number,
  dueDate: ISO String (indexed),
  recurring: 'none' | 'monthly' | 'quarterly' | 'yearly',
  category: Number,
  paid: Boolean,
  paidAt: ISO String,
  createdAt: ISO String
}
```

#### categories
```javascript
{
  id: Number (auto-increment),
  userId: Number (indexed),
  name: String,
  type: 'income' | 'expense',
  icon: String (Bootstrap icon name)
}
```

#### settings
```javascript
{
  userId: Number (primary key),
  currency: String,
  theme: 'light' | 'dark',
  notifications: Boolean,
  language: String
}
```

#### license
```javascript
{
  userId: Number (primary key),
  activationCode: String (unique),
  type: '30DAY' | '90DAY' | '1YEAR' | 'LIFETIME',
  activatedAt: ISO String,
  expiresAt: ISO String | 'LIFETIME',
  status: 'active'
}
```

#### syncQueue
```javascript
{
  id: Number (auto-increment),
  type: String,
  data: JSON String,
  timestamp: ISO String,
  synced: Boolean (indexed)
}
```

## API Integration (Backend)

### Authentication Endpoints

```
POST /api/auth/register
Body: { name, email, password }
Response: { success, user }

POST /api/auth/login
Body: { email, password }
Response: { success, token, user }

POST /api/auth/verify
Headers: { Authorization: Bearer <token> }
Response: { valid, user }
```

### License Endpoints

```
POST /api/license/validate
Body: { activationCode }
Response: { valid, type, expiresAt }

POST /api/license/activate
Body: { userId, activationCode }
Response: { success, license }

GET /api/license/check/:userId
Response: { valid, license }
```

### Sync Endpoints

```
POST /api/sync/push
Headers: { Authorization: Bearer <token> }
Body: { userId, data: [{ type, data }] }
Response: { success, synced }

GET /api/sync/pull/:userId
Headers: { Authorization: Bearer <token> }
Response: { success, data }
```

### Data Endpoints

```
GET /api/transactions/:userId
GET /api/budgets/:userId
GET /api/bills/:userId
GET /api/categories/:userId
GET /api/settings/:userId

POST /api/transactions
PUT /api/transactions/:id
DELETE /api/transactions/:id

(Similar for budgets, bills, categories, settings)
```

## Adding New Features

### 1. Adding a New Module

Create a new JavaScript file in `/js/`:

```javascript
// js/new-feature.js

// Show modal or view
function showNewFeature() {
    showView('new-feature-view');
    loadNewFeatureData();
}

// Load data
async function loadNewFeatureData() {
    const userId = parseInt(Auth.getCurrentUserId());
    const data = await DB.getUserNewFeatureData(userId);
    // Render UI
}

// Handle form submission
async function handleNewFeatureSubmit(event) {
    event.preventDefault();
    // Save data
    await DB.add('newFeatureStore', data);
    // Update UI
    showToast('Saved successfully', 'success');
}
```

### 2. Adding a New IndexedDB Store

Update `js/db.js`:

```javascript
// In onupgradeneeded event
if (!db.objectStoreNames.contains('newStore')) {
    const store = db.createObjectStore('newStore', { 
        keyPath: 'id', 
        autoIncrement: true 
    });
    store.createIndex('userId', 'userId', { unique: false });
}

// Add helper methods
async getUserNewData(userId) {
    return this.getAllByIndex('newStore', 'userId', userId);
}
```

### 3. Adding a New View

Update `index.html`:

```html
<!-- Add new view in main content area -->
<div id="new-feature-view" class="content-view d-none">
    <h2 class="mb-4">New Feature</h2>
    <!-- Content here -->
</div>

<!-- Add navigation link -->
<li class="nav-item">
    <a class="nav-link" href="#" onclick="showNewFeature()">
        <i class="bi bi-star me-1"></i>New Feature
    </a>
</li>
```

### 4. Adding New Chart Types

Update `js/reports.js`:

```javascript
async function loadNewChart(transactions) {
    const ctx = document.getElementById('newChart');
    
    const chart = new Chart(ctx, {
        type: 'line', // or 'bar', 'pie', 'doughnut', 'radar'
        data: {
            labels: [...],
            datasets: [{...}]
        },
        options: {...}
    });
}
```

## Customization Guide

### Changing Colors

Edit `css/styles.css`:

```css
:root {
    --primary-color: #yourcolor;
    --secondary-color: #yourcolor;
    --accent-color: #yourcolor;
}
```

### Adding New Categories

Programmatically:

```javascript
await DB.add('categories', {
    userId: userId,
    name: 'New Category',
    type: 'expense',
    icon: 'icon-name'
});
```

### Changing Date Formats

Update in respective modules:

```javascript
// Current format
new Date(date).toLocaleDateString()

// Custom format
new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
})
```

## Testing

### Testing Offline Functionality

1. Open Developer Tools
2. Go to Network tab
3. Check "Offline" checkbox
4. Test all features

### Testing License System

1. Open browser console
2. Sample activation codes are logged in development
3. Test each license type
4. Test expiry scenarios

### Testing Data Sync

1. Make changes offline
2. Check `syncQueue` in IndexedDB
3. Go online
4. Verify sync execution

### Testing PWA Installation

1. Open app in Chrome/Edge
2. Click install prompt
3. Launch as standalone app
4. Test offline functionality

## Performance Optimization

### IndexedDB Best Practices

```javascript
// Use transactions for multiple operations
const transaction = db.transaction(['store1', 'store2'], 'readwrite');
const store1 = transaction.objectStore('store1');
const store2 = transaction.objectStore('store2');

// Batch operations
await Promise.all([
    store1.add(data1),
    store2.add(data2)
]);
```

### Service Worker Caching

Update `sw.js` to cache more resources:

```javascript
const urlsToCache = [
    // Add new files here
];
```

### Lazy Loading

Load charts only when needed:

```javascript
if (chartLibraryLoaded) {
    loadChart();
} else {
    import('chart.js').then(() => loadChart());
}
```

## Security Considerations

### Password Hashing

Current implementation uses Web Crypto API. For production:

```javascript
// Use bcrypt or similar
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash(password, 10);
```

### Input Validation

Always validate user input:

```javascript
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}
```

### XSS Prevention

Use textContent instead of innerHTML when possible:

```javascript
// Bad
element.innerHTML = userInput;

// Good
element.textContent = userInput;
```

## Debugging

### Common Issues

1. **IndexedDB not working**
   - Check browser support
   - Look for QuotaExceededError
   - Clear and reinitialize

2. **Service Worker not updating**
   - Unregister old service worker
   - Clear cache
   - Force update

3. **License not validating**
   - Check code format
   - Verify not already used
   - Check expiry calculation

### Debug Tools

```javascript
// Log IndexedDB contents
async function debugDB() {
    const stores = ['users', 'transactions', 'budgets', 'bills'];
    for (const store of stores) {
        const data = await DB.getAll(store);
        console.log(store, data);
    }
}

// Check sync queue
async function debugSync() {
    const queue = await DB.getAll('syncQueue');
    console.log('Sync Queue:', queue);
}

// Check license
async function debugLicense() {
    const userId = Auth.getCurrentUserId();
    const license = await DB.getUserLicense(parseInt(userId));
    console.log('License:', license);
}
```

## Deployment Checklist

- [ ] Update API endpoints in sync.js
- [ ] Generate proper PWA icons (all sizes)
- [ ] Configure manifest.json with correct URLs
- [ ] Set up HTTPS (required for PWA)
- [ ] Test on multiple browsers
- [ ] Test offline functionality
- [ ] Test on mobile devices
- [ ] Optimize images and assets
- [ ] Enable compression (gzip/brotli)
- [ ] Set up proper CORS headers
- [ ] Configure CSP headers
- [ ] Set up analytics (optional)
- [ ] Test license system
- [ ] Back up database schema
- [ ] Document API endpoints

## Contributing

When contributing:

1. Follow existing code style
2. Add comments for complex logic
3. Test offline functionality
4. Update documentation
5. Check browser compatibility
6. Validate with multiple users

## Support

For technical issues:

1. Check browser console
2. Inspect IndexedDB
3. Review Service Worker status
4. Test in incognito mode
5. Clear cache and retry

---

**Happy Coding!** 🚀
