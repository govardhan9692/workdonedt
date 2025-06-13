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
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const selectedRole = document.querySelector('.role-btn.active').dataset.role;

    try {
        // Set logging in flag
        isLoggingIn = true;

        // First try to sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Then verify role
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (!userDoc.exists()) {
            console.error('User document not found');
            await signOut(auth);
            showError('User data not found. Please contact administrator.');
            resetLoginButton();
            return;
        }

        const userData = userDoc.data();
        
        // Check if user is attempting to login as CEO through regular login
        if (userData.role === 'ceo') {
            console.error('CEO attempting regular login');
            await signOut(auth);
            showError('Please use CEO login page for CEO access.');
            resetLoginButton();
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
                
                showMessage(`Switching to ${userData.role} role for you. Please wait...`, 'info');
                
                // Short delay to show the message before continuing
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Continue with the correct role
                localStorage.setItem('authUser', JSON.stringify({
                    uid: userCredential.user.uid,
                    role: userData.role,
                    timestamp: Date.now()
                }));
                
                // Redirect based on role
                window.location.replace(userData.role === 'admin' ? 'admin.html' : 'user.html');
                return;
            } else {
                await signOut(auth);
                showError(`Please select the correct role. You are a ${userData.role}.`);
                resetLoginButton();
                return;
            }
        }

        // Store auth state in localStorage
        localStorage.setItem('authUser', JSON.stringify({
            uid: userCredential.user.uid,
            role: userData.role,
            timestamp: Date.now() // Add timestamp for session tracking
        }));

        // Redirect based on role using replace
        let redirectTo = 'user.html';
        if (userData.role === 'admin') {
            redirectTo = 'admin.html';
        }
        
        window.location.replace(redirectTo);

    } catch (error) {
        console.error('Login error:', error);
        isLoggingIn = false; // Reset flag on error
        if (error.code === 'auth/wrong-password') {
            showError('Invalid password');
        } else if (error.code === 'auth/user-not-found') {
            showError('User not found');
        } else {
            showError('Login failed: ' + error.message);
        }
        resetLoginButton();
    }
});

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
                    // Only redirect if we're on the login page
                    let redirectTo = 'user.html';
                    if (storedAuth.role === 'admin') {
                        redirectTo = 'admin.html';
                    } else if (storedAuth.role === 'ceo') {
                        redirectTo = 'ceo.html';
                    }
                    window.location.replace(redirectTo);
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
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.classList.remove('loading');
    }
}