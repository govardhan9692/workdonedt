import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

// CEO credentials - the email should match what's in Firebase Authentication
const CEO_EMAIL = "GovardhanRajulapati9692@gmail.com";

// Track if we're currently logging in to prevent redirect loops
let isLoggingIn = false;

// Check if already authenticated as CEO
onAuthStateChanged(auth, async (user) => {
    // Don't redirect if we're in the process of logging in
    if (isLoggingIn) return;

    if (user) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            // If user exists in Firestore and is CEO, redirect to CEO dashboard
            if (userDoc.exists() && userDoc.data().role === 'ceo') {
                window.location.replace('ceo.html');
            } 
            // User exists in Auth but isn't CEO in Firestore
            else if (user.email === CEO_EMAIL) {
                // Create CEO user in Firestore
                await setDoc(doc(db, 'users', user.uid), {
                    name: 'Govardhan Rajulapati',
                    email: CEO_EMAIL,
                    role: 'ceo',
                    createdAt: serverTimestamp()
                });
                console.log('CEO user created in Firestore');
                window.location.replace('ceo.html');
            } 
            // Not a CEO, log out
            else {
                auth.signOut();
                showError('This login is restricted to CEO access only.');
            }
        } catch (error) {
            console.error('Error checking user:', error);
            showError('Authentication error. Please try again.');
        }
    }
});

// Login form submission
document.getElementById('ceoLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset any error messages
    hideError();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Validate that this is the CEO email
    if (email !== CEO_EMAIL) {
        showError('Invalid CEO credentials');
        resetLoginButton();
        return;
    }

    try {
        isLoggingIn = true;
        
        // Sign in with provided credentials
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if CEO record exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        // If user doesn't exist in Firestore, create CEO record
        if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                name: 'Govardhan Rajulapati',
                email: CEO_EMAIL,
                role: 'ceo',
                createdAt: serverTimestamp()
            });
            console.log('CEO user created in Firestore');
        }
        // If user exists but isn't CEO, update role
        else if (userDoc.data().role !== 'ceo') {
            await setDoc(doc(db, 'users', user.uid), {
                ...userDoc.data(),
                role: 'ceo',
                lastUpdated: serverTimestamp()
            }, { merge: true });
            console.log('User updated to CEO role');
        }
        
        // Store auth state in localStorage
        localStorage.setItem('authUser', JSON.stringify({
            uid: user.uid,
            role: 'ceo',
            timestamp: Date.now()
        }));
        
        // Redirect to CEO dashboard
        window.location.replace('ceo.html');
        
    } catch (error) {
        console.error('Login error:', error);
        isLoggingIn = false;
        
        if (error.code === 'auth/wrong-password') {
            showError('Invalid password');
        } else if (error.code === 'auth/user-not-found') {
            showError('CEO account not found');
        } else {
            showError('Login failed: ' + error.message);
        }
        
        resetLoginButton();
    }
});

// Helper functions for error handling
function showError(message) {
    // Check if error element exists, if not create it
    let errorElement = document.querySelector('.login-error');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'login-error';
        
        const form = document.getElementById('ceoLoginForm');
        form.parentNode.insertBefore(errorElement, form.nextSibling);
        
        // Add error styles
        const style = document.createElement('style');
        style.textContent = `
            .login-error {
                background-color: rgba(220, 53, 69, 0.1);
                color: #dc3545;
                padding: 12px;
                border-radius: 6px;
                margin: 15px 0;
                text-align: center;
                font-weight: 500;
                border-left: 4px solid #dc3545;
                animation: fadeIn 0.3s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    const errorElement = document.querySelector('.login-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function resetLoginButton() {
    const loginBtn = document.querySelector('.login-btn');
    loginBtn.classList.remove('loading');
}

// Add login footer styles
const footerStyle = document.createElement('style');
footerStyle.textContent = `
    .login-footer {
        margin-top: 25px;
        text-align: center;
        color: var(--text-secondary);
        font-size: 0.9rem;
        border-top: 1px solid var(--border-color);
        padding-top: 15px;
    }
`;
document.head.appendChild(footerStyle);
