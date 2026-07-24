// 1. Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAi-UUUJdje3uyuKqcQRkCPUelH7Zx3N-U",
    authDomain: "shopgood-5f298.firebaseapp.com",
    projectId: "shopgood-5f298",
    storageBucket: "shopgood-5f298.firebasestorage.app",
    messagingSenderId: "990509179696",
    appId: "1:990509179696:web:690f44a01bbb71b56edef5"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// 2. Affiliate Tracking
const urlParams = new URLSearchParams(window.location.search);
const affiliateRef = urlParams.get('ref') || 'none';

// 3. UI Elements
const productSection = document.getElementById('product-section') || document.getElementById('catalog-section');
const loginSection = document.getElementById('login-section');
const addressSection = document.getElementById('address-section');

// 4. State Management
let currentUser = null;
let confirmationResult = null; 

auth.onAuthStateChanged((user) => {
    currentUser = user;
});

// 5. Navigation Logic (Null-Safe)
const buyNowBtn = document.getElementById('buy-now-btn');
if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
        if (productSection) productSection.classList.add('hidden');
        
        if (currentUser) {
            if (addressSection) addressSection.classList.remove('hidden');
        } else {
            if (loginSection) loginSection.classList.remove('hidden');
            setupRecaptcha();
        }
    });
}

// 6. OTP Auth Flow (Null-Safe)
function setupRecaptcha() {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
    });
}

const sendOtpBtn = document.getElementById('send-otp-btn');
if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => {
        const phoneNumber = document.getElementById('phone-number').value;
        
        auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
            .then((result) => {
                confirmationResult = result;
                document.getElementById('phone-input-group').classList.add('hidden');
                document.getElementById('otp-input-group').classList.remove('hidden');
            }).catch((error) => {
                console.error("Error sending OTP", error);
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
            
            try {
                const userDoc = await db.collection('users').doc(currentUser.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.streetAddress && document.getElementById('fullName')) {
                        document.getElementById('fullName').value = userData.fullName || '';
                        document.getElementById('streetAddress').value = userData.streetAddress || '';
                        document.getElementById('city').value = userData.city || '';
                        document.getElementById('zipCode').value = userData.zipCode || '';
                    }
                } else {
                    await db.collection('users').doc(currentUser.uid).set({
                        phoneNumber: currentUser.phoneNumber,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                }
            } catch (error) {
                console.error("Error handling user data: ", error);
            }

            if (loginSection) loginSection.classList.add('hidden');
            
            // If they are on the index page logging in for their account, show account immediately
            if (window.location.pathname.includes('index') || window.location.pathname === '/') {
                if (document.getElementById('account-section')) {
                    document.getElementById('account-section').classList.remove('hidden');
                    loadAccountData();
                }
            } else {
                if (addressSection) addressSection.classList.remove('hidden');
            }
            
        }).catch((error) => {
            console.error("Invalid OTP", error);
            alert("Invalid OTP code. Please try again.");
        });
    });
}

// 7. Order Submission (Null-Safe)
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // ... Checkout logic remains handled in product.js ...
    });
}


// ==========================================
// 8. CUSTOMER DASHBOARD & NAVIGATION LOGIC
// ==========================================

const myAccountBtn = document.getElementById('my-account-btn');
const accountSection = document.getElementById('account-section');
const logoutBtn = document.getElementById('logout-btn');
const backToShopBtn = document.getElementById('back-to-shop-btn');

// Show the "My Account" button only if logged in
auth.onAuthStateChanged((user) => {
    if (user && myAccountBtn) {
        myAccountBtn.classList.remove('hidden');
    } else if (myAccountBtn) {
        myAccountBtn.classList.add('hidden');
    }
});

// Open Account Dashboard
if (myAccountBtn) {
    myAccountBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert("Please log in to view your account.");
            if (productSection) productSection.classList.add('hidden');
            if (loginSection) loginSection.classList.remove('hidden');
            setupRecaptcha();
            return;
        }

        // Hide all other sections safely
        if (productSection) productSection.classList.add('hidden');
        if (loginSection) loginSection.classList.add('hidden');
        if (addressSection) addressSection.classList.add('hidden');
        
        // Show Account section and load data
        if (accountSection) {
            accountSection.classList.remove('hidden');
            loadAccountData();
        }
    });
}

// Return to Shop
if (backToShopBtn) {
    backToShopBtn.addEventListener('click', () => {
        if (accountSection) accountSection.classList.add('hidden');
        if (productSection) productSection.classList.remove('hidden');
    });
}

// Logout User
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.reload();
        });
    });
}

// Fetch Profile and Orders from Firestore
async function loadAccountData() {
    const profileDiv = document.getElementById('profile-details');
    const ordersDiv = document.getElementById('orders-list');
    
    if (!profileDiv || !ordersDiv) return;

    profileDiv.innerHTML = "<p>Loading profile...</p>";
    ordersDiv.innerHTML = "<p>Loading orders...</p>";
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            profileDiv.innerHTML = `
                <p style="margin: 5px 0;"><strong>Mobile:</strong> ${data.phoneNumber || currentUser.phoneNumber}</p>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${data.fullName || 'Not provided yet'}</p>
                <p style="margin: 5px 0;"><strong>Address:</strong> ${data.streetAddress ? `${data.streetAddress}, ${data.city}, ${data.zipCode}` : 'Not provided yet'}</p>
            `;
        }

        const ordersSnapshot = await db.collection('orders')
                                     .where('userId', '==', currentUser.uid)
                                     .get();
                                     
        if (ordersSnapshot.empty) {
            ordersDiv.innerHTML = "<p>You have not placed any orders yet.</p>";
        } else {
            let ordersHtml = "";
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
                const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleDateString(undefined, dateOptions) : 'Just now';
                
                const imageLink = order.customImageUrl 
                    ? `<p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;"><strong>Custom Photo:</strong> <a href="${order.customImageUrl}" target="_blank" style="color: #4285F4; text-decoration: none; font-weight: bold;">🖼️ View Upload</a></p>` 
                    : '';

                ordersHtml += `
                    <div class="order-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px; background: white;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong>Order Date: ${orderDate}</strong>
                            <span class="status-badge" style="color: #10b981; font-weight: bold;">${order.status.toUpperCase()}</span>
                        </div>
                        <p style="margin: 5px 0;"><strong>Payment ID:</strong> <small>${order.paymentId || 'N/A'}</small></p>
                        <p style="margin: 5px 0;"><strong>Shipping To:</strong> ${order.fullName}, ${order.city}</p>
                        ${imageLink}
                    </div>
                `;
            });
            ordersDiv.innerHTML = ordersHtml;
        }
    } catch (error) {
        console.error("Error loading account data:", error);
        profileDiv.innerHTML = "<p style='color:red;'>Failed to load account data. Please check your internet connection.</p>";
        ordersDiv.innerHTML = "";
    }
}