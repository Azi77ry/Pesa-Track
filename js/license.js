// License Management Module
const License = {
    adminAccessKey: 'PESA-ADMIN-2026',
    // License types in days
    types: {
        'TRIAL1DAY': 1,
        'WEEK': 7,
        'MONTH': 30,
        'YEAR': 365,
        'LIFETIME': 999999
    },

    typeLabels: {
        'TRIAL1DAY': 'Free Trial (1 Day)',
        'WEEK': 'Weekly Plan',
        'MONTH': 'Monthly Plan',
        'YEAR': 'Yearly Plan',
        'LIFETIME': 'Permanent Plan'
    },

    // Generate activation code (Developer only - for demo purposes)
    generateActivationCode(type = 'MONTH') {
        const prefix = this.getPrefixForType(type);
        const random = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${random()}-${random()}-${random()}`;
    },

    // Map license type to code prefix
    getPrefixForType(type) {
        const map = {
            'TRIAL1DAY': 'TRIA',
            'WEEK': 'WEEK',
            'MONTH': 'MNTH',
            'YEAR': 'YEAR',
            'LIFETIME': 'LIFE'
        };
        return map[type] || 'MNTH';
    },

    // Validate activation code format
    isValidFormat(code) {
        const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return pattern.test(code);
    },

    // Get license type from code
    getLicenseType(code) {
        const prefix = code.substring(0, 4);
        if (prefix === 'TRIA') return 'TRIAL1DAY';
        if (prefix === 'WEEK') return 'WEEK';
        if (prefix === 'MNTH') return 'MONTH';
        if (prefix === 'YEAR') return 'YEAR';
        if (prefix === 'LIFE') return 'LIFETIME';
        return null;
    },

    // Create a license record
    async createLicense(userId, type, activationCode, isTrial = false) {
        const days = this.types[type];
        const activatedAt = new Date();
        const expiresAt = new Date(activatedAt);
        expiresAt.setDate(expiresAt.getDate() + days);

        const license = {
            userId,
            activationCode,
            type,
            isTrial,
            activatedAt: activatedAt.toISOString(),
            expiresAt: type === 'LIFETIME' ? 'LIFETIME' : expiresAt.toISOString(),
            status: 'active'
        };

        await DB.update('license', license);
        return license;
    },

    // Activate license
    async activate(userId, activationCode) {
        try {
            // Validate format
            if (!this.isValidFormat(activationCode)) {
                throw new Error('Invalid activation code format');
            }

            // Get license type
            const type = this.getLicenseType(activationCode);
            if (!type) {
                throw new Error('Invalid activation code');
            }

            if (type === 'TRIAL1DAY') {
                throw new Error('Trial codes are not accepted here');
            }

            // Check if code was already used
            const existingLicenses = await DB.getAll('license');
            const codeUsed = existingLicenses.some(lic => lic.activationCode === activationCode);
            if (codeUsed) {
                throw new Error('This activation code has already been used');
            }

            const license = await this.createLicense(userId, type, activationCode, false);
            return { success: true, license };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Start free trial (1 day)
    async startFreeTrial(userId) {
        try {
            const existing = await DB.getUserLicense(userId);
            if (existing) {
                throw new Error('Free trial already used');
            }

            const activationCode = this.generateActivationCode('TRIAL1DAY');
            const license = await this.createLicense(userId, 'TRIAL1DAY', activationCode, true);
            return { success: true, license };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Check if license is valid
    async checkLicense(userId) {
        try {
            const license = await DB.getUserLicense(userId);
            
            if (!license) {
                return false;
            }

            if (license.expiresAt === 'LIFETIME') {
                return true;
            }

            const now = new Date();
            const expiryDate = new Date(license.expiresAt);

            return now < expiryDate;
        } catch (error) {
            return false;
        }
    },

    // Get license info
    async getLicenseInfo(userId) {
        try {
            const license = await DB.getUserLicense(userId);
            
            if (!license) {
                return {
                    status: 'inactive',
                    message: 'No active license'
                };
            }

            if (license.expiresAt === 'LIFETIME') {
                return {
                    status: 'active',
                    type: 'LIFETIME',
                    message: this.typeLabels['LIFETIME'],
                    activatedAt: license.activatedAt
                };
            }

            const now = new Date();
            const expiryDate = new Date(license.expiresAt);
            const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysRemaining <= 0) {
                return {
                    status: 'expired',
                    type: license.type,
                    message: 'License expired',
                    expiresAt: license.expiresAt
                };
            }

            return {
                status: 'active',
                type: license.type,
                isTrial: license.isTrial,
                daysRemaining,
                message: `${this.typeLabels[license.type] || license.type} expires in ${daysRemaining} days`,
                activatedAt: license.activatedAt,
                expiresAt: license.expiresAt
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    },

    // Show license expired modal
    showExpiredModal() {
        const modal = new bootstrap.Modal(document.getElementById('licenseExpiredModal'));
        modal.show();
    }
};

// Handle Activation Form Submit
async function handleActivation(event) {
    event.preventDefault();
    
    const activationCode = document.getElementById('activation-code').value.trim().toUpperCase();
    const userId = Auth.getCurrentUserId();

    if (!userId) {
        showToast('Please login first', 'error');
        return;
    }

    const result = await License.activate(parseInt(userId), activationCode);
    
    if (result.success) {
        showToast('License activated successfully!', 'success');
        document.getElementById('activation-error').classList.add('d-none');
        setTimeout(() => {
            initApp();
        }, 1000);
    } else {
        document.getElementById('activation-error').textContent = result.error;
        document.getElementById('activation-error').classList.remove('d-none');
    }
}

// Show License Info in Settings
async function showLicenseInfo() {
    const userId = Auth.getCurrentUserId();
    const info = await License.getLicenseInfo(parseInt(userId));
    
    const content = document.getElementById('license-info-content');
    
    let statusBadge = '';
    if (info.status === 'active') {
        statusBadge = '<span class="badge bg-success">Active</span>';
    } else if (info.status === 'expired') {
        statusBadge = '<span class="badge bg-danger">Expired</span>';
    } else {
        statusBadge = '<span class="badge bg-secondary">Inactive</span>';
    }

    let html = `
        <div class="mb-4">
            <h5>License Status</h5>
            <div class="d-flex align-items-center gap-2 mb-3">
                ${statusBadge}
                <span class="text-muted">${info.message}</span>
            </div>
        </div>
    `;

    if (info.status === 'active') {
        const typeLabel = License.typeLabels[info.type] || info.type;
        html += `
            <div class="mb-3">
                <label class="form-label text-muted">License Type</label>
                <div class="fw-bold">${typeLabel}</div>
            </div>
        `;

        if (info.daysRemaining) {
            html += `
                <div class="mb-3">
                    <label class="form-label text-muted">Days Remaining</label>
                    <div class="fw-bold">${info.daysRemaining} days</div>
                </div>
            `;
        }

        if (info.activatedAt) {
            const date = new Date(info.activatedAt).toLocaleDateString();
            html += `
                <div class="mb-3">
                    <label class="form-label text-muted">Activated On</label>
                    <div class="fw-bold">${date}</div>
                </div>
            `;
        }

        if (info.expiresAt && info.expiresAt !== 'LIFETIME') {
            const date = new Date(info.expiresAt).toLocaleDateString();
            html += `
                <div class="mb-3">
                    <label class="form-label text-muted">Expires On</label>
                    <div class="fw-bold">${date}</div>
                </div>
            `;
        }
    }

    if (info.status === 'expired' || info.status === 'inactive') {
        html += `
            <button class="btn btn-primary mt-3" onclick="showActivationPage()">
                <i class="bi bi-key me-2"></i>Activate License
            </button>
        `;
    }

    content.innerHTML = html;
    showView('license-view');
}

// Start free trial from activation page
async function startFreeTrial() {
    const userId = Auth.getCurrentUserId();
    if (!userId) {
        showToast('Please login first', 'error');
        return;
    }

    const result = await License.startFreeTrial(parseInt(userId));
    if (result.success) {
        showToast('Free 1-day trial activated!', 'success');
        document.getElementById('activation-error').classList.add('d-none');
        setTimeout(() => {
            initApp();
        }, 600);
    } else {
        document.getElementById('activation-error').textContent = result.error;
        document.getElementById('activation-error').classList.remove('d-none');
    }
}

// Demo: Generate sample activation codes (for testing)
function generateSampleCodes() {
    console.log('Sample Activation Codes (for testing):');
    console.log('Week License:', License.generateActivationCode('WEEK'));
    console.log('Month License:', License.generateActivationCode('MONTH'));
    console.log('Year License:', License.generateActivationCode('YEAR'));
    console.log('Lifetime License:', License.generateActivationCode('LIFETIME'));
}

// Generate codes on load for developer testing
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(generateSampleCodes, 1000);
}

// Admin Tools (client-side helper)
function unlockAdminTools() {
    const keyInput = document.getElementById('admin-access-key');
    const error = document.getElementById('admin-error');
    const panel = document.getElementById('admin-panel');
    const lock = document.getElementById('admin-lock');

    if (!keyInput) return;
    if (keyInput.value.trim() !== License.adminAccessKey) {
        error.textContent = 'Invalid admin access key';
        error.classList.remove('d-none');
        return;
    }

    sessionStorage.setItem('adminUnlocked', 'true');
    error.classList.add('d-none');
    panel.classList.remove('d-none');
    lock.classList.add('d-none');
    renderAdminKeys();
}

function lockAdminTools() {
    const panel = document.getElementById('admin-panel');
    const lock = document.getElementById('admin-lock');
    const error = document.getElementById('admin-error');
    sessionStorage.removeItem('adminUnlocked');
    panel.classList.add('d-none');
    lock.classList.remove('d-none');
    error.classList.add('d-none');
}

function generateAdminCode() {
    const planSelect = document.getElementById('admin-plan');
    const output = document.getElementById('admin-generated-code');
    if (!planSelect || !output) return;
    const code = License.generateActivationCode(planSelect.value);
    output.value = code;
}

function copyAdminCode() {
    const output = document.getElementById('admin-generated-code');
    if (!output || !output.value) return;
    navigator.clipboard.writeText(output.value);
    showToast('Activation code copied', 'success');
}

function renderAdminKeys() {
    const list = document.getElementById('admin-key-list');
    const planSelect = document.getElementById('admin-plan');
    if (!list || !planSelect) return;

    const plan = planSelect.value;
    const keys = (window.LicenseKeyPool && LicenseKeyPool[plan]) ? LicenseKeyPool[plan] : [];

    if (!keys.length) {
        list.innerHTML = '<div class="text-muted">No keys available.</div>';
        return;
    }

    list.innerHTML = keys.map(key => `
        <div class="admin-key-item">
            <code>${key}</code>
            <button class="btn btn-outline-secondary btn-sm" type="button" onclick="copyKey('${key}')">Copy</button>
        </div>
    `).join('');
}

function copyKey(key) {
    navigator.clipboard.writeText(key);
    showToast('Activation code copied', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    const unlocked = sessionStorage.getItem('adminUnlocked') === 'true';
    if (!unlocked) return;
    const panel = document.getElementById('admin-panel');
    const lock = document.getElementById('admin-lock');
    if (panel && lock) {
        panel.classList.remove('d-none');
        lock.classList.add('d-none');
        renderAdminKeys();
    }
});
