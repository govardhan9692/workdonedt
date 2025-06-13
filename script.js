import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCve0_yChnzGgaSBtKh-yKvGopGo3psBQ8",
    authDomain: "workdone-949f9.firebaseapp.com",
    projectId: "workdone-949f9",
    storageBucket: "workdone-949f9.firebasestorage.app",
    messagingSenderId: "577135186360",
    appId: "1:577135186360:web:2ae4d41853abd77d243f4d",
    measurementId: "G-87305ZNEZ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const roleButtons = document.querySelectorAll('.role-btn');
const loginForm = document.getElementById('loginForm');
const togglePassword = document.querySelector('.toggle-password');
const loginBtn = document.querySelector('.login-btn');
let selectedRole = 'user'; // Default role

// Add this flag to prevent redirect loops
let isLoggingIn = false;

// Role selection handling
roleButtons.forEach(button => {
    button.addEventListener('click', () => {
        roleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        selectedRole = button.dataset.role;
    });
});

// Toggle password visibility
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePassword.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
}

// Login form submission handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state immediately with overlay
    setLoginButtonLoading(true);
    showPageLoading('Authenticating...', 0);
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const selectedRole = document.querySelector('.role-btn.active').dataset.role;

    try {
        // Set logging in flag
        isLoggingIn = true;

        // Update progress
        showPageLoading('Verifying credentials...', 25);

        // First try to sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Update progress
        showPageLoading('Loading user data...', 50);
        
        // Then verify role
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (!userDoc.exists()) {
            console.error('User document not found');
            await signOut(auth);
            hidePageLoading();
            showError('User data not found. Please contact administrator.');
            setLoginButtonLoading(false);
            return;
        }

        const userData = userDoc.data();
        
        // Update progress
        showPageLoading('Validating permissions...', 75);
        
        // Check if user is attempting to login as CEO through regular login
        if (userData.role === 'ceo') {
            console.error('CEO attempting regular login');
            await signOut(auth);
            hidePageLoading();
            showError('Please use CEO login page for CEO access.');
            setLoginButtonLoading(false);
            return;
        }
        
        // Check if the selected role matches the user's actual role
        if (userData.role !== selectedRole) {
            console.error('Role mismatch:', userData.role, selectedRole);
            
            // Instead of immediately showing error, automatically select the correct role
            const correctRoleBtn = document.querySelector(`.role-btn[data-role="${userData.role}"]`);
            if (correctRoleBtn) {
                // Switch to the correct role automatically
                document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
                correctRoleBtn.classList.add('active');
                
                showPageLoading(`Switching to ${userData.role} role...`, 85);
                
                // Short delay to show the message before continuing
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Continue with the correct role
                localStorage.setItem('authUser', JSON.stringify({
                    uid: userCredential.user.uid,
                    role: userData.role,
                    timestamp: Date.now()
                }));
                
                // Final loading step
                showPageLoading('Redirecting to dashboard...', 100);
                
                // Keep loading active during redirect - don't hide it
                setTimeout(() => {
                    window.location.replace(userData.role === 'admin' ? 'admin.html' : 'user.html');
                }, 1000);
                return;
            } else {
                await signOut(auth);
                hidePageLoading();
                showError(`Please select the correct role. You are a ${userData.role}.`);
                setLoginButtonLoading(false);
                return;
            }
        }

        // Store auth state in localStorage
        localStorage.setItem('authUser', JSON.stringify({
            uid: userCredential.user.uid,
            role: userData.role,
            timestamp: Date.now() // Add timestamp for session tracking
        }));

        // Final loading step
        showPageLoading('Redirecting to dashboard...', 100);

        // Redirect based on role using replace
        let redirectTo = 'user.html';
        if (userData.role === 'admin') {
            redirectTo = 'admin.html';
        }
        
        // Keep loading state active during redirect - don't hide it
        setTimeout(() => {
            window.location.replace(redirectTo);
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        isLoggingIn = false; // Reset flag on error
        hidePageLoading();
        
        if (error.code === 'auth/wrong-password') {
            showError('Invalid password');
        } else if (error.code === 'auth/user-not-found') {
            showError('User not found');
        } else {
            showError('Login failed: ' + error.message);
        }
        setLoginButtonLoading(false);
    }
});

// Enhanced loading state function
function setLoginButtonLoading(isLoading) {
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
}

// New functions for page loading overlay
function showPageLoading(message, progress = 0) {
    let overlay = document.getElementById('page-loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'page-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="loading-text">Loading...</div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">0%</div>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #page-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .loading-content {
                text-align: center;
                color: white;
                padding: 2rem;
                border-radius: 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                min-width: 300px;
            }
            
            .loading-spinner {
                position: relative;
                width: 60px;
                height: 60px;
                margin: 0 auto 1.5rem;
            }
            
            .spinner-ring {
                position: absolute;
                width: 100%;
                height: 100%;
                border: 3px solid transparent;
                border-top: 3px solid var(--primary-color, #4a6aed);
                border-radius: 50%;
                animation: spin 1.2s linear infinite;
            }
            
            .spinner-ring:nth-child(2) {
                width: 80%;
                height: 80%;
                top: 10%;
                left: 10%;
                border-top-color: var(--accent-color, #e6b54a);
                animation-duration: 1.8s;
                animation-direction: reverse;
            }
            
            .spinner-ring:nth-child(3) {
                width: 60%;
                height: 60%;
                top: 20%;
                left: 20%;
                border-top-color: var(--secondary-color, #6039bb);
                animation-duration: 0.8s;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .loading-text {
                font-size: 1.1rem;
                font-weight: 500;
                margin-bottom: 1.5rem;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .progress-container {
                margin-top: 1rem;
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-color, #4a6aed), var(--accent-color, #e6b54a));
                border-radius: 3px;
                transition: width 0.5s ease;
                width: 0%;
            }
            
            .progress-text {
                font-size: 0.9rem;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }
    
    // Update message and progress
    const loadingText = overlay.querySelector('.loading-text');
    const progressFill = overlay.querySelector('.progress-fill');
    const progressText = overlay.querySelector('.progress-text');
    
    if (loadingText) loadingText.textContent = message;
    if (progressFill) progressFill.style.width = progress + '%';
    if (progressText) progressText.textContent = Math.round(progress) + '%';
}

function hidePageLoading() {
    const overlay = document.getElementById('page-loading-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    // Don't redirect if we're in the process of logging in
    if (isLoggingIn) return;

    // Check if we're already on the login page
    const isLoginPage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname === '/';

    if (user) {
        try {
            const storedAuth = JSON.parse(localStorage.getItem('authUser') || '{}');
            
            // Verify stored auth is still valid (within 24 hours)
            const isValidSession = storedAuth.timestamp && 
                               (Date.now() - storedAuth.timestamp) < 24 * 60 * 60 * 1000;

            if (storedAuth.uid === user.uid && isValidSession) {
                if (isLoginPage) {
                    // Show loading for auto-redirect
                    showPageLoading('Welcome back! Redirecting...', 100);
                    
                    let redirectTo = 'user.html';
                    if (storedAuth.role === 'admin') {
                        redirectTo = 'admin.html';
                    } else if (storedAuth.role === 'ceo') {
                        redirectTo = 'ceo.html';
                    }
                    
                    // Keep loading active during redirect
                    setTimeout(() => {
                        window.location.replace(redirectTo);
                    }, 1000);
                }
            } else {
                // Clear invalid auth data
                localStorage.removeItem('authUser');
                await signOut(auth);
                if (!isLoginPage) {
                    window.location.replace('index.html');
                }
            }
        } catch (error) {
            console.error("Error checking stored auth:", error);
            localStorage.removeItem('authUser');
            await signOut(auth);
            if (!isLoginPage) {
                window.location.replace('index.html');
            }
        }
    } else if (!isLoginPage) {
        // Only redirect to login if we're not already there
        window.location.replace('index.html');
    }
});

// Add this helper function to show informational messages
function showMessage(message, type = 'info') {
    // Check if message element exists, if not create it
    let messageElement = document.querySelector('.login-message');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = `login-message ${type}`;
        
        const form = document.getElementById('loginForm');
        form.parentNode.insertBefore(messageElement, form.nextSibling);
        
        // Add message styles if not already present
        if (!document.querySelector('#message-styles')) {
            const style = document.createElement('style');
            style.id = 'message-styles';
            style.textContent = `
                .login-message {
                    padding: 12px;
                    border-radius: 6px;
                    margin: 15px 0;
                    text-align: center;
                    font-weight: 500;
                    animation: fadeIn 0.3s ease;
                }
                .login-message.info {
                    background-color: rgba(33, 150, 243, 0.1);
                    color: #2196f3;
                    border-left: 4px solid #2196f3;
                }
                .login-message.error {
                    background-color: rgba(220, 53, 69, 0.1);
                    color: #dc3545;
                    border-left: 4px solid #dc3545;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    messageElement.textContent = message;
    messageElement.className = `login-message ${type}`;
    messageElement.style.display = 'block';
}

// Update the existing showError function to use our new message system
function showError(message) {
    showMessage(message, 'error');
}

// Helper functions for error handling
function resetLoginButton() {
    setLoginButtonLoading(false);
}