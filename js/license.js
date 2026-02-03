// License Management Module
const License = {
    // License types in days
    types: {
        '30DAY': 30,
        '90DAY': 90,
        '1YEAR': 365,
        'LIFETIME': 999999
    },

    // Generate activation code (Developer only - for demo purposes)
    generateActivationCode(type = '30DAY') {
        const prefix = type.substring(0, 4).toUpperCase();
        const random = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${random()}-${random()}-${random()}`;
    },

    // Validate activation code format
    isValidFormat(code) {
        const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return pattern.test(code);
    },

    // Get license type from code
    getLicenseType(code) {
        const prefix = code.substring(0, 4);
        if (prefix === '30DA') return '30DAY';
        if (prefix === '90DA') return '90DAY';
        if (prefix === '1YEA') return '1YEAR';
        if (prefix === 'LIFE') return 'LIFETIME';
        return null;
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

            // Check if code was already used
            const existingLicenses = await DB.getAll('license');
            const codeUsed = existingLicenses.some(lic => lic.activationCode === activationCode);
            if (codeUsed) {
                throw new Error('This activation code has already been used');
            }

            // Calculate expiry date
            const days = this.types[type];
            const activatedAt = new Date();
            const expiresAt = new Date(activatedAt);
            expiresAt.setDate(expiresAt.getDate() + days);

            // Create license
            const license = {
                userId,
                activationCode,
                type,
                activatedAt: activatedAt.toISOString(),
                expiresAt: type === 'LIFETIME' ? 'LIFETIME' : expiresAt.toISOString(),
                status: 'active'
            };

            // Save license
            await DB.update('license', license);

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
                    message: 'Lifetime License',
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
                daysRemaining,
                message: `License expires in ${daysRemaining} days`,
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
        html += `
            <div class="mb-3">
                <label class="form-label text-muted">License Type</label>
                <div class="fw-bold">${info.type}</div>
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

// Demo: Generate sample activation codes (for testing)
function generateSampleCodes() {
    console.log('Sample Activation Codes (for testing):');
    console.log('30-Day License:', License.generateActivationCode('30DAY'));
    console.log('90-Day License:', License.generateActivationCode('90DAY'));
    console.log('1-Year License:', License.generateActivationCode('1YEAR'));
    console.log('Lifetime License:', License.generateActivationCode('LIFETIME'));
}

// Generate codes on load for developer testing
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(generateSampleCodes, 1000);
}
