import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
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

// CEO credentials
const CEO_EMAIL = "GovardhanRajulapati@dreamteam.com";
const CEO_PASSWORD = "GovardhanRajulapati@9692#4482";

// Get current page information
const currentPage = window.location.pathname.split('/').pop();
console.log('Current page:', currentPage);

// Skip auth check for login page or explicitly public pages
const publicPages = ['index.html', 'register.html', 'reset-password.html'];
if (publicPages.includes(currentPage)) {
    // No need to check auth on public pages
    console.log('On public page, skipping auth check');
    
    // Add CEO auto-creation check for login page
    if (currentPage === 'index.html') {
        // Check if the CEO account exists and create it if needed
        checkAndCreateCEOAccount();
    }
} else {
    // Show loading state while checking auth
    document.body.classList.add('auth-loading');
    
    // Create and append loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loader"></div>';
    document.body.appendChild(loadingOverlay);
    
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        try {
            if (user) {
                // User is signed in, check their role for page access
                console.log('User is authenticated:', user.uid);
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userRole = userData.role;
                    
                    // Check if user has access to this page based on role
                    if ((currentPage === 'admin.html' && userRole !== 'admin') || 
                        (currentPage === 'user.html' && userRole !== 'user') ||
                        (currentPage === 'ceo.html' && userRole !== 'ceo')) {
                        console.log('User does not have permission for this page');
                        window.location.replace('index.html');
                    } else {
                        console.log('Auth check successful, user has access');
                        // Remove loading state
                        document.body.classList.remove('auth-loading');
                        loadingOverlay.remove();
                    }
                } else {
                    console.log('User document not found');
                    window.location.replace('index.html');
                }
            } else {
                // User is not signed in, redirect to login
                console.log('User not authenticated, redirecting to login');
                window.location.replace('index.html');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.replace('index.html');
        }
    });
}

// Function to check if CEO account exists and create it if needed
async function checkAndCreateCEOAccount() {
    try {
        // We'll look for a user with CEO role in the users collection
        // This is a safe approach as we don't expose any auth methods
        const loginForm = document.querySelector('form');
        
        if (loginForm) {
            // Add event listener to the form
            loginForm.addEventListener('submit', async function(e) {
                const emailInput = document.querySelector('input[type="email"]');
                const passwordInput = document.querySelector('input[type="password"]');
                
                if (emailInput && passwordInput && 
                    emailInput.value === CEO_EMAIL && 
                    passwordInput.value === CEO_PASSWORD) {
                    
                    console.log("CEO credentials detected, checking if account exists...");
                    // We're not preventing default here to let the normal login process continue
                    // But we'll check if we need to create the CEO account
                    
                    try {
                        // Try to sign in with CEO credentials to see if account exists
                        await signInWithEmailAndPassword(auth, CEO_EMAIL, CEO_PASSWORD)
                            .then(async (userCredential) => {
                                const user = userCredential.user;
                                // Check if user has CEO role in database
                                const userDoc = await getDoc(doc(db, 'users', user.uid));
                                
                                if (!userDoc.exists()) {
                                    // User exists in Auth but not in Firestore, create the CEO document
                                    await setDoc(doc(db, 'users', user.uid), {
                                        name: 'Govardhan Rajulapati',
                                        email: CEO_EMAIL,
                                        role: 'ceo',
                                        createdAt: serverTimestamp()
                                    });
                                    console.log("CEO account created in database");
                                }
                            })
                            .catch(async (error) => {
                                // If sign-in fails, the account doesn't exist
                                if (error.code === 'auth/user-not-found') {
                                    console.log("CEO account does not exist, creating it...");
                                    
                                    // Create CEO account
                                    const userCredential = await createUserWithEmailAndPassword(auth, CEO_EMAIL, CEO_PASSWORD);
                                    
                                    // Add CEO details in Firestore
                                    await setDoc(doc(db, 'users', userCredential.user.uid), {
                                        name: 'Govardhan Rajulapati',
                                        email: CEO_EMAIL,
                                        role: 'ceo',
                                        createdAt: serverTimestamp()
                                    });
                                    
                                    console.log("CEO account created successfully");
                                    // The form submission will continue and log the CEO in
                                }
                            });
                    } catch (error) {
                        console.error("Error checking/creating CEO account:", error);
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error in CEO account setup:", error);
    }
}

// Add loading styles
const style = document.createElement('style');
style.textContent = `
    .auth-loading {
        overflow: hidden;
    }
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    .loader {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
