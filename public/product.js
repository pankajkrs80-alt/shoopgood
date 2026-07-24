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
        uploadError.style.display = 'block';
        return;
    }
    uploadError.style.display = 'none';

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
    
    // UI Loading state
    completeOrderBtn.style.display = 'none';
    loadingMsg.style.display = 'block';

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
            "name": "Custom Photo Necklace",
            "description": "Custom Jewelry Order",
            "prefill": {
                "name": fullName,
                "email": "customer@yourstore.com",
                "contact": finalPhone
            },
            "readonly": {
                "contact": true,
                "email": true
            },
            "theme": { "color": "#000000" },
            
            // FIX: Using an arrow function here guarantees 'imageUrl' is remembered
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

                // Tracker 2: Prove exactly what we are sending to Firestore
                console.log("3. Sending this exact data to Firestore:", orderData);

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

                    addressSection.innerHTML = `
                        <div class="card" style="text-align: center; padding: 40px 20px;">
                            <h2 style="color: #10b981;">Payment Successful! 🎉</h2>
                            <p>Thank you, ${fullName}. Your order (ID: ${paymentId}) is confirmed.</p>
                            <p>We have successfully received your custom photo.</p>
                            <a href="index.html" class="primary-btn" style="text-decoration: none; display: inline-block; margin-top: 20px;">Back to Shop</a>
                        </div>
                    `;
                } catch (dbError) {
                    console.error("Firestore Save Error:", dbError);
                    alert("Payment succeeded, but we had trouble saving your order.");
                }
            }
        };
        const rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', function (response){
            alert("Payment Failed. Reason: " + response.error.description);
            completeOrderBtn.style.display = 'block';
            loadingMsg.style.display = 'none';
        });
        rzp1.open();

    } catch (error) {
        console.error("Error during checkout process:", error);
        alert("An error occurred while uploading your image. Please try again.");
        completeOrderBtn.style.display = 'block';
        loadingMsg.style.display = 'none';
    }
});