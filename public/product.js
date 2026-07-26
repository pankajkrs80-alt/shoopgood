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

// 2. Variables & UI Elements
let currentUser = null;
let affiliateRef = localStorage.getItem('affiliateRef') || 'none';

const productSection = document.getElementById('product-section');
const loginSection = document.getElementById('login-section');
const addressSection = document.getElementById('address-section');
const imageInput = document.getElementById('pendant-image');
const uploadError = document.getElementById('upload-error');
const completeOrderBtn = document.getElementById('complete-order-btn');
const loadingMsg = document.getElementById('loading-msg');

// 3. Setup Recaptcha
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible'
});

// 4. Buy Now Button Click
document.getElementById('buy-now-btn').addEventListener('click', () => {
    // Check if an image was selected
    if (imageInput.files.length === 0) {
        uploadError.classList.remove('hidden'); // Updated for Tailwind
        return;
    }
    uploadError.classList.add('hidden'); // Updated for Tailwind

    // Move to login or address section
    if (currentUser) {
        productSection.classList.add('hidden');
        addressSection.classList.remove('hidden');
        loadUserAddress();
    } else {
        productSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    }
});

// 5. Authentication Logic (OTP)
document.getElementById('send-otp-btn').addEventListener('click', () => {
    const phoneNumber = document.getElementById('phone-number').value;
    auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            document.getElementById('phone-input-group').classList.add('hidden');
            document.getElementById('otp-input-group').classList.remove('hidden');
        }).catch((error) => {
            console.error("SMS not sent", error);
            alert("Error sending OTP. Check the format.");
        });
});

document.getElementById('verify-otp-btn').addEventListener('click', () => {
    const code = document.getElementById('otp-code').value;
    window.confirmationResult.confirm(code).then((result) => {
        currentUser = result.user;
        loginSection.classList.add('hidden');
        addressSection.classList.remove('hidden');
        loadUserAddress();
    }).catch((error) => {
        alert("Invalid OTP");
    });
});

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
    }
});

async function loadUserAddress() {
    if (!currentUser) return;
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
        const data = doc.data();
        document.getElementById('fullName').value = data.fullName || '';
        document.getElementById('streetAddress').value = data.streetAddress || '';
        document.getElementById('city').value = data.city || '';
        document.getElementById('zipCode').value = data.zipCode || '';
    }
}

// 6. Final Checkout (Upload Image -> Razorpay -> Save Order)
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // UI Loading state (Tailwind toggles)
    completeOrderBtn.classList.add('hidden');
    loadingMsg.classList.remove('hidden');

    const file = imageInput.files[0];
        const fullName = document.getElementById('fullName').value;
        const streetAddress = document.getElementById('streetAddress').value;
        const city = document.getElementById('city').value;
        const zipCode = document.getElementById('zipCode').value;

        try {
            // A. Upload Image to ImgBB
            const imgbbApiKey = "979703ccbef01ef78d075cd6e3769125"; 
            const formData = new FormData();
            formData.append("image", file);

            const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                method: "POST",
                body: formData
            });
            
            const imgbbData = await imgbbResponse.json();
            
            if (!imgbbData.success) {
                throw new Error("Image upload failed");
            }

            // Get the secure public URL from ImgBB
            const imageUrl = imgbbData.data.url;

            // B. Clean Phone Number for Razorpay
            const rawPhone = currentUser.phoneNumber || "9999999999"; 
            const finalPhone = rawPhone.replace(/\D/g, '').slice(-10);

            // C. Trigger Razorpay
            const options = {
                "key": "rzp_test_w79rV4Vq76jNyY", 
                "amount": "49900", 
                "currency": "INR",
                "name": "ShopGood",
                "description": "Custom Photo Necklace",
                "prefill": {
                    "name": fullName,
                    "email": "customer@shopgood.com",
                    "contact": finalPhone
                },
                "readonly": {
                    "contact": true,
                    "email": true
                },
                "theme": { "color": "#0f172a" },
                
                "handler": async (response) => { 
                    const paymentId = response.razorpay_payment_id;
                    
                    // Tracker 1: Let's prove the image URL survived the payment
                    console.log("1. Payment ID:", paymentId);
                    console.log("2. Image URL from ImgBB:", imageUrl);

                    // D. Save Order to Database
                    const orderData = {
                        userId: currentUser.uid,
                        phoneNumber: currentUser.phoneNumber,
                        fullName: fullName,
                        streetAddress: streetAddress,
                        city: city,
                        zipCode: zipCode,
                        affiliateCode: affiliateRef,
                        paymentId: paymentId, 
                        customImageUrl: imageUrl, // <-- Securely passed in
                        status: 'paid', 
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    try {
                        await db.collection('orders').add(orderData);
                        
                        await db.collection('users').doc(currentUser.uid).set({
                            fullName, streetAddress, city, zipCode,
                            lastOrderDate: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                        if (affiliateRef !== 'none') {
                        await db.collection('affiliates').doc(affiliateRef).set({
                            totalSales: firebase.firestore.FieldValue.increment(1),
                            totalCommission: firebase.firestore.FieldValue.increment(100),
                            lastSaleAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }

                    // Success Screen (Styled with premium Tailwind CSS)
                    const addressSecInner = document.querySelector('#address-section > div');
                    if (addressSecInner) {
                        addressSecInner.innerHTML = `
                            <div class="text-center">
                                <span class="inline-block w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                </span>
                                <h2 class="text-3xl font-bold text-brand-dark mb-4">Payment Successful!</h2>
                                <p class="text-slate-600 mb-2">Thank you, <strong>${fullName}</strong>. Your order is confirmed.</p>
                                <p class="text-sm text-slate-400 mb-6 font-mono">Payment ID: ${paymentId}</p>
                                <div class="bg-blue-50 text-blue-800 p-4 rounded-xl mb-8 font-medium">
                                    We have securely received your photo. Our jewelers are reviewing it now.
                                </div>
                                <a href="index.html" class="inline-block px-8 py-4 rounded-full bg-brand-dark text-white font-bold hover:bg-slate-800 transition-colors shadow-soft hover:-translate-y-1">
                                    Return to Store
                                </a>
                            </div>
                        `;
                    }
                } catch (dbError) {
                    console.error("Firestore Save Error:", dbError);
                    alert("Payment succeeded, but we had trouble saving your order.");
                }
            }
        };
        const rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', function (response){
            alert("Payment Failed. Reason: " + response.error.description);
            completeOrderBtn.classList.remove('hidden');
            loadingMsg.classList.add('hidden');
        });
        rzp1.open();

    } catch (error) {
        console.error("Error during checkout process:", error);
        alert("An error occurred while uploading your image. Please try again.");
        completeOrderBtn.classList.remove('hidden');
        loadingMsg.classList.add('hidden');
    }
});