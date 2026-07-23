// 1. Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAi-UUUJdje3uyuKqcQRkCPUelH7Zx3N-U",
  authDomain: "shopgood-5f298.firebaseapp.com",
  projectId: "shopgood-5f298",
  storageBucket: "shopgood-5f298.firebasestorage.app",
  messagingSenderId: "990509179696",
  appId: "1:990509179696:web:690f44a01bbb71b56edef5"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. Affiliate Tracking
const urlParams = new URLSearchParams(window.location.search);
const affiliateRef = urlParams.get('ref') || 'none';

// 3. UI Elements
const productSection = document.getElementById('product-section');
const loginSection = document.getElementById('login-section');
const addressSection = document.getElementById('address-section');

// 4. State Management
let currentUser = null;
let confirmationResult = null; 

auth.onAuthStateChanged((user) => {
    currentUser = user;
});

// 5. Navigation Logic
document.getElementById('buy-now-btn').addEventListener('click', () => {
    productSection.classList.add('hidden');
    
    if (currentUser) {
        addressSection.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
        setupRecaptcha();
    }
});

// 6. OTP Auth Flow
function setupRecaptcha() {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
    });
}

document.getElementById('send-otp-btn').addEventListener('click', () => {
    const phoneNumber = document.getElementById('phone-number').value;
    
    auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
        .then((result) => {
            confirmationResult = result;
            document.getElementById('phone-input-group').classList.add('hidden');
            document.getElementById('otp-input-group').classList.remove('hidden');
        }).catch((error) => {
            console.error("Error sending OTP", error);
            alert("Error sending OTP. Ensure number includes country code (e.g., +1).");
        });
});

document.getElementById('verify-otp-btn').addEventListener('click', () => {
    const code = document.getElementById('otp-code').value;
    
    confirmationResult.confirm(code).then(async (result) => {
        currentUser = result.user;
        
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.streetAddress) {
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

        loginSection.classList.add('hidden');
        addressSection.classList.remove('hidden');
    }).catch((error) => {
        console.error("Invalid OTP", error);
        alert("Invalid OTP code. Please try again.");
    });
});

// 7. Order Submission (Razorpay Integration Only)
document.getElementById('checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const streetAddress = document.getElementById('streetAddress').value;
    const city = document.getElementById('city').value;
    const zipCode = document.getElementById('zipCode').value;

    // 1. EXTRACT AND CLEAN THE PHONE NUMBER FIRST
    // This takes the Firebase number (e.g. +919876543210), removes the +91, 
    // and guarantees it is exactly a 10-digit string.
    const rawPhone = currentUser.phoneNumber || "9999999999"; 
    const finalPhone = rawPhone.replace(/\D/g, '').slice(-10);

    // 2. PASS THE CLEANED NUMBER TO RAZORPAY
    const options = {
        "key": "rzp_test_w79rV4Vq76jNyY", // Keep your real test key here
        "amount": "49900", 
        "currency": "INR",
        "name": "Custom Product",
        "description": "Purchase of Custom Product",
        
        "prefill": {
            "name": fullName,
            "email": "customer@yourstore.com", 
            "contact": finalPhone // Pass the clean 10-digit number
        },
        
        // 3. LOCK THE FIELDS TO SKIP THE SCREEN
        "readonly": {
            "contact": true,
            "email": true
        },
        
        "theme": {
            "color": "#000000"
        },
        "handler": async function (response) {
            // (Keep all your existing database saving code here)
            const paymentId = response.razorpay_payment_id;

            const orderData = {
                userId: currentUser.uid,
                phoneNumber: currentUser.phoneNumber, // Save original +91 format to DB
                fullName: fullName,
                streetAddress: streetAddress,
                city: city,
                zipCode: zipCode,
                affiliateCode: affiliateRef,
                paymentId: paymentId, 
                status: 'paid', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await db.collection('orders').add(orderData);
                
                await db.collection('users').doc(currentUser.uid).set({
                    fullName: fullName,
                    streetAddress: streetAddress,
                    city: city,
                    zipCode: zipCode,
                    lastOrderDate: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                const cardElement = document.querySelector('#address-section .card');
                cardElement.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <h2 style="color: #10b981;">Payment Successful! 🎉</h2>
                        <p>Thank you, ${fullName}. Your payment (ID: ${paymentId}) has been received.</p>
                        <p>We will contact you at ${currentUser.phoneNumber} with shipping updates.</p>
                    </div>
                `;
                
            } catch (error) {
                console.error("Error saving order: ", error);
                alert("Payment successful, but there was an error saving your order details.");
            }
        }
    };

    const rzp1 = new Razorpay(options);
    
    rzp1.on('payment.failed', function (response){
        console.error(response.error);
        alert("Payment Failed. Reason: " + response.error.description);
    });

    rzp1.open();
});
// ==========================================
// CUSTOMER DASHBOARD & NAVIGATION LOGIC
// ==========================================

const myAccountBtn = document.getElementById('my-account-btn');
const accountSection = document.getElementById('account-section');
const logoutBtn = document.getElementById('logout-btn');
const backToShopBtn = document.getElementById('back-to-shop-btn');

// 1. Show the "My Account" button only if logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        myAccountBtn.classList.remove('hidden');
    } else {
        myAccountBtn.classList.add('hidden');
    }
});

// 2. Open Account Dashboard
myAccountBtn.addEventListener('click', () => {
    // Hide all other sections
    productSection.classList.add('hidden');
    loginSection.classList.add('hidden');
    addressSection.classList.add('hidden');
    
    // Show Account section and load data
    accountSection.classList.remove('hidden');
    loadAccountData();
});

// 3. Return to Shop
backToShopBtn.addEventListener('click', () => {
    accountSection.classList.add('hidden');
    productSection.classList.remove('hidden');
});

// 4. Logout User
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        // Refresh the page to clear states completely
        window.location.reload();
    });
});

// 5. Fetch Profile and Orders from Firestore
async function loadAccountData() {
    const profileDiv = document.getElementById('profile-details');
    const ordersDiv = document.getElementById('orders-list');
    
    profileDiv.innerHTML = "<p>Loading profile...</p>";
    ordersDiv.innerHTML = "<p>Loading orders...</p>";
    
    try {
        // A. Load Profile Details
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            profileDiv.innerHTML = `
                <p><strong>Mobile:</strong> ${data.phoneNumber}</p>
                <p><strong>Name:</strong> ${data.fullName || 'Not provided yet'}</p>
                <p><strong>Address:</strong> ${data.streetAddress ? `${data.streetAddress}, ${data.city}, ${data.zipCode}` : 'Not provided yet'}</p>
            `;
        }

        // B. Load Order History (Only pulling orders matching this user's UID)
        const ordersSnapshot = await db.collection('orders')
                                     .where('userId', '==', currentUser.uid)
                                     .get();
                                     
        if (ordersSnapshot.empty) {
            ordersDiv.innerHTML = "<p>You have not placed any orders yet.</p>";
        } else {
            let ordersHtml = "";
            
            // Loop through all orders and create a visual card for each
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                
                // Format the Firebase Timestamp into a readable date
                const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
                const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleDateString(undefined, dateOptions) : 'Just now';
                
                ordersHtml += `
                    <div class="order-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong>Order Date: ${orderDate}</strong>
                            <span class="status-badge">${order.status.toUpperCase()}</span>
                        </div>
                        <p><strong>Payment ID:</strong> ${order.paymentId || 'N/A'}</p>
                        <p><strong>Shipping To:</strong> ${order.fullName}, ${order.city}</p>
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