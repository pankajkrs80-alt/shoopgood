// 1. Initialize Firebase (Replace with your config from Firebase Console)
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
// Grabs the '?ref=CODE' from the URL (e.g., yoursite.com/?ref=influencerX)
const urlParams = new URLSearchParams(window.location.search);
const affiliateRef = urlParams.get('ref') || 'none';

// 3. UI Elements
const productSection = document.getElementById('product-section');
const loginSection = document.getElementById('login-section');
const addressSection = document.getElementById('address-section');

// 4. State Management
let currentUser = null;
let confirmationResult = null; // Stores the OTP confirmation object

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    currentUser = user;
});

// 5. Navigation Logic
document.getElementById('buy-now-btn').addEventListener('click', () => {
    productSection.classList.add('hidden');
    
    if (currentUser) {
        // Already logged in, skip to address
        addressSection.classList.remove('hidden');
    } else {
        // Need to log in
        loginSection.classList.remove('hidden');
        setupRecaptcha();
    }
});

// 6. OTP Auth Flow
function setupRecaptcha() {
    // Invisible reCAPTCHA to prevent spam
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
        // User signed in successfully
        currentUser = result.user;
        
        // --- NEW CODE: Save user to Firestore Database ---
        try {
            await db.collection('users').doc(currentUser.uid).set({
                phoneNumber: currentUser.phoneNumber,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                // You can add more default fields here if needed
            }, { merge: true }); // merge: true prevents overwriting existing data
        } catch (error) {
            console.error("Error saving user data: ", error);
        }
        // -------------------------------------------------

        loginSection.classList.add('hidden');
        addressSection.classList.remove('hidden');
    }).catch((error) => {
        console.error("Invalid OTP", error);
        alert("Invalid OTP code. Please try again.");
    });
});

// 7. Order Submission
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Gather form data
    const orderData = {
        userId: currentUser.uid,
        phoneNumber: currentUser.phoneNumber,
        fullName: document.getElementById('fullName').value,
        streetAddress: document.getElementById('streetAddress').value,
        city: document.getElementById('city').value,
        zipCode: document.getElementById('zipCode').value,
        affiliateCode: affiliateRef, // Tracks who referred this sale
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // Save to Firestore 'orders' collection
        await db.collection('orders').add(orderData);
        alert("Order placed successfully!");
        // Optional: Redirect to a success page or refresh
        window.location.reload(); 
    } catch (error) {
        console.error("Error saving order: ", error);
        alert("There was an error processing your order.");
    }
});