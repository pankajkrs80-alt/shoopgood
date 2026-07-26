// ==========================================
// 1. INITIALIZE FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAi-UUUJdje3uyuKqcQRkCPUelH7Zx3N-U",
    authDomain: "shopgood-5f298.firebaseapp.com",
    projectId: "shopgood-5f298",
    storageBucket: "shopgood-5f298.firebasestorage.app",
    messagingSenderId: "990509179696",
    appId: "1:990509179696:web:690f44a01bbb71b56edef5"
};

// Prevent duplicate initialization errors
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. GLOBAL STATE & UI ELEMENTS
// ==========================================
let currentUser = null;
let confirmationResult = null;

// Sections
const catalogSection = document.getElementById('catalog-section');
const loginSection = document.getElementById('login-section');
const accountSection = document.getElementById('account-section');
const addressSection = document.getElementById('address-section'); 

// Buttons
const myAccountBtn = document.getElementById('my-account-btn');
const logoutBtn = document.getElementById('logout-btn');
const backToShopBtn = document.getElementById('back-to-shop-btn');

// ==========================================
// 3. AUTH STATE MONITOR
// ==========================================
auth.onAuthStateChanged((user) => {
    currentUser = user;
});

// ==========================================
// 4. MAIN NAVIGATION: "MY ACCOUNT" BUTTON
// ==========================================
if (myAccountBtn) {
    myAccountBtn.addEventListener('click', () => {
        // 1. Hide the storefront
        if (catalogSection) catalogSection.classList.add('hidden');
        if (addressSection) addressSection.classList.add('hidden');

        if (currentUser) {
            // LOGGED IN: Show the Dashboard
            if (loginSection) loginSection.classList.add('hidden');
            if (accountSection) {
                accountSection.classList.remove('hidden');
                loadAccountData();
            }
        } else {
            // NOT LOGGED IN: Show the Login Screen
            if (accountSection) accountSection.classList.add('hidden');
            if (loginSection) loginSection.classList.remove('hidden');

            // Setup Recaptcha safely (only once!)
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                    'size': 'invisible'
                });
            }
        }
        
        // Scroll to top of the page smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==========================================
// 5. OTP LOGIN FLOW
// ==========================================
const sendOtpBtn = document.getElementById('send-otp-btn');
if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => {
        const phoneNumber = document.getElementById('phone-number').value;
        
        // Basic validation
        if(phoneNumber.length < 10) {
            alert("Please enter a valid mobile number.");
            return;
        }

        auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
            .then((result) => {
                confirmationResult = result;
                document.getElementById('phone-input-group').classList.add('hidden');
                document.getElementById('otp-input-group').classList.remove('hidden');
            }).catch((error) => {
                console.error("SMS not sent", error);
                alert("Error sending OTP. Ensure number includes country code (e.g., +91).");
            });
    });
}

const verifyOtpBtn = document.getElementById('verify-otp-btn');
if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
        const code = document.getElementById('otp-code').value;
        
        confirmationResult.confirm(code).then(async (result) => {
            currentUser = result.user;
            
            // Save basic user info if first login
            try {
                const userDoc = await db.collection('users').doc(currentUser.uid).get();
                if (!userDoc.exists) {
                    await db.collection('users').doc(currentUser.uid).set({
                        phoneNumber: currentUser.phoneNumber,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                }
            } catch(e) {
                console.error(e);
            }

            // Successfully verified! Move from Login to Dashboard
            if (loginSection) loginSection.classList.add('hidden');
            if (accountSection) {
                accountSection.classList.remove('hidden');
                loadAccountData();
            }
        }).catch((error) => {
            console.error("Invalid OTP", error);
            alert("Invalid OTP code. Please try again.");
        });
    });
}

// ==========================================
// 6. SUB-NAVIGATION BUTTONS
// ==========================================
if (backToShopBtn) {
    backToShopBtn.addEventListener('click', () => {
        if (accountSection) accountSection.classList.add('hidden');
        if (loginSection) loginSection.classList.add('hidden');
        if (catalogSection) catalogSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html'; 
        });
    });
}

// ==========================================
// 7. LOAD CUSTOMER DASHBOARD DATA
// ==========================================
async function loadAccountData() {
    const profileDiv = document.getElementById('profile-details');
    const ordersDiv = document.getElementById('orders-list');
    
    if (!profileDiv || !ordersDiv) return;

    // Show Tailwind Loading states
    profileDiv.innerHTML = "<p class='text-slate-500 font-medium animate-pulse'>Loading profile...</p>";
    ordersDiv.innerHTML = "<p class='text-slate-500 font-medium animate-pulse'>Loading orders...</p>";
    
    try {
        // Fetch Profile
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            profileDiv.innerHTML = `
                <div class="space-y-3">
                    <p><strong class="text-brand-dark">Mobile:</strong> ${data.phoneNumber || currentUser.phoneNumber}</p>
                    <p><strong class="text-brand-dark">Name:</strong> ${data.fullName || 'Not provided yet'}</p>
                    <p><strong class="text-brand-dark">Address:</strong> ${data.streetAddress ? `${data.streetAddress}, ${data.city}, ${data.zipCode}` : 'Not provided yet'}</p>
                </div>
            `;
        } else {
            profileDiv.innerHTML = `<p class='text-slate-500'>Profile details will appear here after your first purchase.</p>`;
        }

        // Fetch Orders
        const ordersSnapshot = await db.collection('orders')
                                     .where('userId', '==', currentUser.uid)
                                     .get();
                                     
        if (ordersSnapshot.empty) {
            ordersDiv.innerHTML = "<p class='text-slate-500'>You have not placed any orders yet.</p>";
        } else {
            let ordersHtml = "";
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
                const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleDateString(undefined, dateOptions) : 'Just now';
                
                // Securely render image link if it exists
                const imageLink = order.customImageUrl 
                    ? `<div class="mt-4 pt-4 border-t border-gray-100">
                           <a href="${order.customImageUrl}" target="_blank" class="text-brand-blue font-bold hover:text-blue-500 transition-colors flex items-center gap-2">
                               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                               View Custom Photo Upload
                           </a>
                       </div>` 
                    : '';

                // Tailwind styled Order Card
                ordersHtml += `
                    <div class="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm mb-4 hover:shadow-soft transition-shadow">
                        <div class="flex flex-wrap justify-between items-center mb-4 gap-2">
                            <strong class="text-brand-dark">Order Date: ${orderDate}</strong>
                            <span class="px-3 py-1 bg-brand-mint text-brand-dark text-xs font-bold rounded-full uppercase tracking-wide">${order.status}</span>
                        </div>
                        <p class="text-slate-600 mb-1"><strong class="text-brand-dark">Payment ID:</strong> <span class="font-mono text-sm">${order.paymentId || 'N/A'}</span></p>
                        <p class="text-slate-600"><strong class="text-brand-dark">Shipping To:</strong> ${order.fullName}, ${order.city}</p>
                        ${imageLink}
                    </div>
                `;
            });
            ordersDiv.innerHTML = ordersHtml;
        }
    } catch (error) {
        console.error("Error loading account data:", error);
        profileDiv.innerHTML = "<p class='text-red-500 font-bold'>Failed to load account data. Please check your internet connection.</p>";
        ordersDiv.innerHTML = "";
    }
}