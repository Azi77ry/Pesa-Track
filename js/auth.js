// Authentication Module
const Auth = {
    currentUser: null,

    // Simple hash function (for demo - in production use a proper library)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'PesaTruckerSalt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Register new user
    async register(name, email, password) {
        try {
            // Check if user exists
            const existingUser = await DB.getUserByEmail(email);
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Hash password
            const hashedPassword = await this.hashPassword(password);

            // Create user
            const user = {
                name,
                email,
                password: hashedPassword,
                createdAt: new Date().toISOString()
            };

            const userId = await DB.add('users', user);
            user.id = userId;

            // Initialize default categories and settings
            await DB.initDefaultCategories(userId);
            await DB.initDefaultSettings(userId);

            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Login user
    async login(email, password) {
        try {
            // Get user
            const user = await DB.getUserByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Verify password
            const hashedPassword = await this.hashPassword(password);
            if (hashedPassword !== user.password) {
                throw new Error('Invalid email or password');
            }

            // Check license
            const licenseValid = await License.checkLicense(user.id);
            if (!licenseValid) {
                return { success: false, needsActivation: true, user };
            }

            // Set current user
            this.currentUser = user;
            localStorage.setItem('currentUserId', user.id);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userName', user.name);

            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        showAuthContainer();
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    },

    // Get current user ID
    getCurrentUserId() {
        return localStorage.getItem('currentUserId');
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getCurrentUserId();
    },

    // Auto-login if user was previously logged in
    async autoLogin() {
        const userId = this.getCurrentUserId();
        if (userId) {
            const user = await DB.get('users', parseInt(userId));
            if (user) {
                // Check license
                const licenseValid = await License.checkLicense(user.id);
                if (!licenseValid) {
                    showActivationPage();
                    return false;
                }

                this.currentUser = user;
                return true;
            }
        }
        return false;
    }
};

// Handle Login Form Submit
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const result = await Auth.login(email, password);
    
    if (result.success) {
        showToast('Login successful!', 'success');
        initApp();
    } else if (result.needsActivation) {
        Auth.currentUser = result.user;
        localStorage.setItem('currentUserId', result.user.id);
        showActivationPage();
    } else {
        showToast(result.error, 'error');
    }
}

// Handle Register Form Submit
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    const result = await Auth.register(name, email, password);
    
    if (result.success) {
        Auth.currentUser = result.user;
        localStorage.setItem('currentUserId', result.user.id);
        localStorage.setItem('userEmail', result.user.email);
        localStorage.setItem('userName', result.user.name);

        const trialResult = await License.startFreeTrial(result.user.id);
        if (trialResult.success) {
            showToast('Free 1-day trial activated!', 'success');
            initApp();
        } else {
            showToast('Registration successful! Please activate your license.', 'success');
            showActivationPage();
        }
    } else {
        showToast(result.error, 'error');
    }
}

// Show Login Form
function showLoginForm() {
    document.getElementById('login-form').classList.remove('d-none');
    document.getElementById('register-form').classList.add('d-none');
}

// Show Register Form
function showRegisterForm() {
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('register-form').classList.remove('d-none');
}

// Show Auth Container
function showAuthContainer() {
    document.getElementById('app-container').classList.add('d-none');
    document.getElementById('auth-container').classList.remove('d-none');
    document.getElementById('activation-container').classList.add('d-none');
    showLoginForm();
}

// Show Activation Page
function showActivationPage() {
    document.getElementById('app-container').classList.add('d-none');
    document.getElementById('auth-container').classList.add('d-none');
    document.getElementById('activation-container').classList.remove('d-none');
}
