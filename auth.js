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

// CEO credentials - updated to match the new login credentials
const CEO_EMAIL = "GovardhanRajulapati9692@gmail.com";
const CEO_PASSWORD = "GovardhanRajulapati@9692#4482";

// Get current page information
const currentPage = window.location.pathname.split('/').pop();
console.log('Current page:', currentPage);

// Skip auth check for login pages or explicitly public pages
const publicPages = ['index.html', 'ceologin.html', 'register.html', 'reset-password.html'];
if (publicPages.includes(currentPage)) {
    // No need to check auth on public pages
    console.log('On public page, skipping auth check');
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
                
                let userDoc = await getDoc(doc(db, 'users', user.uid));
                
                // If user is CEO but no document exists in Firestore, create it
                if (!userDoc.exists() && user.email === CEO_EMAIL) {
                    console.log('Creating CEO document in Firestore');
                    await setDoc(doc(db, 'users', user.uid), {
                        name: 'Govardhan Rajulapati',
                        email: CEO_EMAIL,
                        role: 'ceo',
                        createdAt: serverTimestamp()
                    });
                    // Fetch the newly created document
                    userDoc = await getDoc(doc(db, 'users', user.uid));
                }
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userRole = userData.role;
                    
                    // Get the required role for the current page
                    const requiredRole = getRequiredRoleForPage(currentPage);
                    console.log(`Page ${currentPage} requires role: ${requiredRole}, user has role: ${userRole}`);
                    
                    // Check if user has access to this page based on role
                    if (requiredRole && userRole !== requiredRole) {
                        // User doesn't have required role for this page
                        console.log(`Access denied: Your role (${userRole}) doesn't have permission to access this page. Redirecting to appropriate dashboard.`);
                        
                        // Redirect to the appropriate dashboard based on user's role
                        redirectToRoleDashboard(userRole);
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

// Helper function to determine required role for each page
function getRequiredRoleForPage(page) {
    switch (page) {
        case 'admin.html':
            return 'admin';
        case 'user.html':
            return 'user';
        case 'ceo.html':
            return 'ceo';
        default:
            return null; // No specific role requirement
    }
}

// Helper function to redirect user to appropriate dashboard
function redirectToRoleDashboard(role) {
    switch (role) {
        case 'admin':
            window.location.replace('admin.html');
            break;
        case 'user':
            window.location.replace('user.html');
            break;
        case 'ceo':
            window.location.replace('ceo.html');
            break;
        default:
            // Default to login page if role is unknown or deleted
            window.location.replace('index.html');
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
