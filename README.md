# FinanceFlow - Personal Finance Management App

A production-ready, offline-first personal financial management web application built with vanilla JavaScript, IndexedDB, and Progressive Web App (PWA) technology.

## 🌟 Features

### Core Functionality
- **Offline-First Architecture**: Works completely offline after installation
- **Multi-User Support**: Each user has isolated, private data
- **License-Based Access**: Activation code system for app access control
- **Real-time Sync**: Automatic synchronization when online

### Financial Management
- ✅ Income & Expense Tracking
- ✅ Category-based Organization
- ✅ Budget Management with Alerts
- ✅ Bill Tracking & Reminders
- ✅ Analytics & Reports (Chart.js)
- ✅ Multi-Currency Support
- ✅ Search & Filter Transactions
- ✅ Data Export/Import (JSON)

### User Experience
- 🎨 Modern, Clean UI with Bootstrap 5
- 🌓 Light & Dark Theme Support
- 📱 Fully Responsive (Mobile & Desktop)
- 🔔 Offline Notifications
- 💾 Progressive Web App (PWA)
- ⚡ Fast & Lightweight

## 🛠 Technology Stack

### Frontend
- HTML5
- CSS3 (Custom + Bootstrap 5)
- Vanilla JavaScript (ES6+)
- Chart.js for visualizations
- Bootstrap Icons

### Storage & Offline
- IndexedDB (Primary database)
- Service Workers
- Background Sync API
- Local Storage (Session data)

### Backend (Optional - for sync only)
- Node.js
- Express.js
- MongoDB Atlas
- JWT Authentication

## 📦 Installation

### Local Development

1. Clone or download the repository
2. Open `index.html` in a modern web browser
3. Or serve using a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000
```

4. Visit `http://localhost:8000`

### PWA Installation

1. Open the app in a modern browser (Chrome, Edge, Safari)
2. Click the "Install" button in the address bar
3. The app will be installed as a standalone application
4. Works offline after installation

## 🔑 License System

### How It Works

1. **First Use**: User must activate license with activation code
2. **License Types**:
   - 30 Days Trial
   - 90 Days
   - 1 Year
   - Lifetime

3. **Activation Codes Format**: `XXXX-XXXX-XXXX-XXXX`

### Generating Activation Codes (Developer Only)

For testing purposes, open the browser console and sample activation codes will be logged automatically in development mode.

Example codes format:
- 30-Day: `30DA-XXXX-XXXX-XXXX`
- 90-Day: `90DA-XXXX-XXXX-XXXX`
- 1-Year: `1YEA-XXXX-XXXX-XXXX`
- Lifetime: `LIFE-XXXX-XXXX-XXXX`

### License Checking

- App checks license on startup
- If expired: User redirected to activation page
- App locks completely until valid license is entered
- Each code can only be used once

## 👤 User Guide

### Getting Started

1. **Register**: Create an account with email and password
2. **Activate License**: Enter activation code provided
3. **Start Tracking**: Begin adding income and expenses

### Adding Transactions

1. Click "Add Income" or "Add Expense" button
2. Fill in amount, category, date, and optional note
3. Transaction is saved instantly (works offline)
4. Syncs automatically when online

### Creating Budgets

1. Navigate to "Budgets" section
2. Click "Add Budget"
3. Select category, set amount, and period
4. Get alerts at 80% and 100% usage

### Managing Bills

1. Go to "Bills & Payments"
2. Add recurring or one-time bills
3. Mark as paid when completed
4. System creates expense transaction automatically
5. Recurring bills auto-generate next instance

### Viewing Reports

1. Visit "Reports & Analytics"
2. View expenses by category (Pie Chart)
3. Track spending trends (Line Chart)
4. Compare income vs expenses (Bar Chart)

### Settings

- Change currency
- Toggle dark/light theme
- Manage categories
- Export/Import data
- Enable/Disable notifications

## 🏗 Project Structure

```
financeflow/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── css/
│   ├── styles.css          # Main styles
│   └── themes.css          # Theme styles
├── js/
│   ├── db.js               # IndexedDB database
│   ├── auth.js             # Authentication
│   ├── license.js          # License management
│   ├── app.js              # Main application
│   ├── transactions.js     # Transactions module
│   ├── budgets.js          # Budgets module
│   ├── bills.js            # Bills module
│   ├── reports.js          # Reports & charts
│   ├── settings.js         # Settings module
│   └── sync.js             # Synchronization
└── assets/
    └── icons/              # PWA icons
```

## 🔒 Security Features

- Password hashing using Web Crypto API
- User data isolation (no cross-user access)
- JWT-ready authentication system
- License validation on every startup
- Secure offline storage

## 📱 Progressive Web App Features

- ✅ Installable on mobile and desktop
- ✅ Offline functionality
- ✅ Background sync
- ✅ Push notifications
- ✅ App-like experience
- ✅ Fast loading with caching

## 🌐 Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 11.3+)
- Opera

## 💾 Data Management

### Backup & Restore

1. Go to Settings
2. Click "Export Data"
3. Download JSON backup file
4. Import on another device or after reinstall

### Data Structure

All user data stored locally in IndexedDB:
- Users
- Transactions
- Budgets
- Bills
- Categories
- Settings
- License information
- Sync queue

## 🚀 Deployment

### GitHub Pages

1. Push code to GitHub repository
2. Enable GitHub Pages in settings
3. Select main branch
4. App will be live at `https://username.github.io/repo-name`

### Netlify

1. Connect GitHub repository
2. Deploy automatically
3. Configure custom domain (optional)

### Custom Server

1. Upload files to web server
2. Ensure HTTPS for PWA features
3. Configure headers for Service Worker

## 🔧 Customization

### Adding Custom Categories

1. Go to Settings → Categories Management
2. Click "Add Category"
3. Enter name, type, and select icon

### Changing Theme Colors

Edit CSS variables in `css/styles.css`:

```css
:root {
    --primary-color: #0f172a;
    --accent-color: #3b82f6;
    --success-color: #10b981;
    --danger-color: #ef4444;
}
```

### Adding More Currencies

Edit in `js/settings.js`:

```javascript
const symbols = {
    'USD': '$',
    'EUR': '€',
    'YourCurrency': 'Symbol'
};
```

## 📊 Future Enhancements

- [ ] Cloud backup integration
- [ ] Financial goal tracking
- [ ] Investment portfolio tracking
- [ ] Receipt scanning (OCR)
- [ ] Bank account integration
- [ ] Expense splitting
- [ ] Tax calculation
- [ ] Premium analytics

## 🐛 Troubleshooting

### App Not Working Offline

1. Ensure Service Worker is registered
2. Check browser console for errors
3. Clear cache and reload
4. Reinstall PWA

### License Not Activating

1. Check activation code format
2. Ensure code hasn't been used
3. Verify internet connection for first activation
4. Clear browser cache

### Data Not Syncing

1. Check internet connection
2. Open browser console to see sync status
3. Manually trigger sync from settings
4. Check sync queue in IndexedDB

## 📄 License

This project is provided as-is for personal and commercial use.

## 👨‍💻 Developer

Built with ❤️ for offline-first financial management.

## 📞 Support

For issues or questions:
- Check browser console for errors
- Review IndexedDB data structure
- Ensure all dependencies are loaded
- Test in incognito/private mode

## 🎓 Learning Resources

This project demonstrates:
- IndexedDB usage
- Service Workers & PWA
- Offline-first architecture
- User authentication
- License management
- Data synchronization
- Chart.js integration
- Bootstrap 5 UI

## 🙏 Acknowledgments

- Bootstrap team for the UI framework
- Chart.js for visualization library
- Bootstrap Icons for icon set
- Web Platform for PWA capabilities

---

**Note**: This is a production-ready application. For production deployment, implement proper backend API, secure authentication, and payment processing for license activation.
