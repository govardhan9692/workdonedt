import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    collection, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    setDoc, 
    deleteDoc, 
    serverTimestamp,
    writeBatch 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { deleteApp, initializeApp as initializeSecondaryApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";

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
const ceoName = document.getElementById('ceoName');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// Form Elements
const createAdminForm = document.getElementById('createAdminForm');
const adminName = document.getElementById('adminName');
const adminEmail = document.getElementById('adminEmail');
const adminPhone = document.getElementById('adminPhone');
const adminPassword = document.getElementById('adminPassword');
const adminsList = document.getElementById('adminsList');
const adminSearchInput = document.getElementById('adminSearchInput');

let currentUser = null;

// Functions to save and load active section
function saveActiveSection(sectionId) {
    localStorage.setItem('ceoActiveSection', sectionId);
}

function loadActiveSection() {
    return localStorage.getItem('ceoActiveSection') || 'createAdmin'; // default to createAdmin if none saved
}

// Initialize theme toggle functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' ?
            '<i class="fas fa-sun"></i>' :
            '<i class="fas fa-moon"></i>';
    }
}

// Initialize mobile menu
function initMobileMenu() {
    if (!menuToggle || !sidebar || !sidebarOverlay) {
        console.error('Mobile menu elements not found');
        return;
    }

    function toggleMenu() {
        sidebar.classList.toggle('active');
        menuToggle.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        menuToggle.innerHTML = sidebar.classList.contains('active') ?
            '<i class="fas fa-times"></i>' :
            '<i class="fas fa-bars"></i>';
    }

    // Remove any existing listeners first
    menuToggle.removeEventListener('click', toggleMenu);
    sidebarOverlay.removeEventListener('click', toggleMenu);

    // Add fresh event listeners
    menuToggle.addEventListener('click', toggleMenu);
    sidebarOverlay.addEventListener('click', toggleMenu);

    // Close menu when clicking nav buttons on mobile
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                menuToggle.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    });
}

// Check if user is CEO
async function checkCeoRole(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        console.log('User doc exists:', userDoc.exists());
        console.log('User role:', userDoc.data()?.role);
        return userDoc.exists() && userDoc.data().role === 'ceo';
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            console.log('Auth state changed - user:', user.uid);
            const isCeo = await checkCeoRole(user);
            console.log('Is CEO:', isCeo);

            if (isCeo) {
                currentUser = user;
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                ceoName.textContent = userDoc.data().name || 'CEO';

                // Restore active section
                const activeSection = loadActiveSection();
                const activeBtn = document.querySelector(`.nav-btn[data-section="${activeSection}"]`);
                if (activeBtn) {
                    navBtns.forEach(b => b.classList.remove('active'));
                    sections.forEach(s => s.classList.remove('active'));
                    activeBtn.classList.add('active');
                    document.getElementById(activeSection).classList.add('active');
                }

                // Initialize UI components
                initTheme();
                initMobileMenu();
                
                // Load existing admins
                await loadExistingAdmins();
                
                // Initialize search functionality
                initAdminSearch();
            } else {
                console.log('Not a CEO, redirecting to login');
                await signOut(auth);
                window.location.replace('index.html');
            }
        } else {
            console.log('No user, redirecting to login');
            window.location.replace('index.html');
        }
    } catch (error) {
        console.error('Error in auth state observer:', error);
        // Handle error gracefully
        window.location.replace('index.html');
    }
});

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetSection = btn.dataset.section;
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetSection).classList.add('active');
        saveActiveSection(targetSection); // Save the active section
    });
});

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

// Create Admin Form Submission
createAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        // Show loading state
        const submitBtn = createAdminForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        // Check if email already exists
        const methods = await fetchSignInMethodsForEmail(auth, adminEmail.value);
        if (methods.length > 0) {
            alert('This email is already registered');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Admin';
            return;
        }

        // Create a secondary app instance
        const secondaryApp = initializeSecondaryApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        // Create new user with secondary auth instance
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, adminEmail.value, adminPassword.value);

        // Save user data in Firestore using the main db
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: adminName.value,
            email: adminEmail.value,
            phone: adminPhone.value,
            role: 'admin',
            hashedPassword: adminPassword.value, // Store password for future reference
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid,  // Store the CEO ID who created this admin
            // Note: Admins don't have a createdBy field for user creation since they're created by CEO
        });

        // Delete the secondary app
        await deleteApp(secondaryApp);

        // Clear form and show success message
        createAdminForm.reset();
        alert('Admin created successfully');

        // Refresh admin list
        await loadExistingAdmins();

    } catch (error) {
        console.error('Error creating admin:', error);
        alert('Error creating admin: ' + error.message);
    } finally {
        // Reset button state
        const submitBtn = createAdminForm.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Admin';
    }
});

// Load Existing Admins
async function loadExistingAdmins() {
    try {
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const snapshot = await getDocs(q);
        
        let html = '';
        if (snapshot.docs.length === 0) {
            html = `<tr><td colspan="4" style="text-align: center; padding: 20px;">No admins found</td></tr>`;
        } else {
            html = snapshot.docs.map(doc => {
                const data = doc.data();
                return `
                    <tr data-adminid="${doc.id}">
                        <td>${data.name || ''}</td>
                        <td>${data.email || ''}</td>
                        <td>${data.phone || ''}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn delete-admin-btn" onclick="window.deleteAdmin('${doc.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        adminsList.innerHTML = html;

        // Add delete admin handler to window object
        window.deleteAdmin = async (adminId) => {
            if (!confirm('Are you sure you want to delete this admin?')) {
                return;
            }
            
            try {
                // Show loading state
                const deleteButton = document.querySelector(`tr[data-adminid="${adminId}"] .delete-admin-btn`);
                if (deleteButton) {
                    deleteButton.disabled = true;
                    deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                }
                
                // Delete admin data using a batch
                const batch = writeBatch(db);
                
                // Mark admin as deleted in users collection to preserve authentication
                const userDocRef = doc(db, 'users', adminId);
                batch.update(userDocRef, {
                    role: 'deleted',
                    lastUpdated: serverTimestamp()
                });
                
                await batch.commit();
                
                // Remove row from UI
                const row = document.querySelector(`tr[data-adminid="${adminId}"]`);
                if (row) row.remove();
                
                alert('Admin deleted successfully');
            } catch (error) {
                console.error('Error deleting admin:', error);
                alert('Error deleting admin: ' + error.message);
                
                // Reset button state
                const deleteButton = document.querySelector(`tr[data-adminid="${adminId}"] .delete-admin-btn`);
                if (deleteButton) {
                    deleteButton.disabled = false;
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                }
            }
        };
    } catch (error) {
        console.error('Error loading existing admins:', error);
        adminsList.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Error loading admins</td></tr>`;
    }
}

// Admin search functionality
function initAdminSearch() {
    if (!adminSearchInput) return;
    
    adminSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const adminRows = document.querySelectorAll('#adminsList tr');
        
        adminRows.forEach(row => {
            // Skip any message rows (like "No admins found")
            if (row.cells.length < 3) return;
            
            const name = row.cells[0].textContent.toLowerCase();
            const email = row.cells[1].textContent.toLowerCase();
            const phone = row.cells[2].textContent.toLowerCase();
            
            const isMatch = name.includes(searchTerm) || 
                           email.includes(searchTerm) || 
                           phone.includes(searchTerm);
            
            row.style.display = isMatch ? '' : 'none';
        });
        
        // Show message if no results
        const visibleRows = Array.from(adminRows).filter(row => row.style.display !== 'none');
        const noResultsRow = document.querySelector('.no-results-row');
        
        if (searchTerm && visibleRows.length === 0) {
            if (!noResultsRow) {
                const tbody = adminsList;
                const newRow = document.createElement('tr');
                newRow.className = 'no-results-row';
                newRow.innerHTML = `<td colspan="4" style="text-align: center; padding: 20px;">No admins found matching "${searchTerm}"</td>`;
                tbody.appendChild(newRow);
            } else {
                noResultsRow.style.display = '';
                noResultsRow.querySelector('td').textContent = `No admins found matching "${searchTerm}"`;
            }
        } else if (noResultsRow) {
            noResultsRow.style.display = 'none';
        }
    });
}
