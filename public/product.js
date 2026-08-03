// 1. Initialize Firebase (Ensure this matches your credentials)
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

// Sections
const productSection = document.getElementById('product-section');
const loginSection = document.getElementById('login-section');
const addressSection = document.getElementById('address-section');

// Dynamic Product Inputs (Some may be null depending on which page we are on!)
const imageInput = document.getElementById('pendant-image');
const frontTextInput = document.getElementById('front-text');
const backTextInput = document.getElementById('back-text');
const colorDropdown = document.getElementById('color-style');
const chainDropdown = document.getElementById('chain-style');

const uploadError = document.getElementById('upload-error');
const completeOrderBtn = document.getElementById('complete-order-btn');
const loadingMsg = document.getElementById('loading-msg');
const buyNowBtn = document.getElementById('buy-now-btn');

// 3. Setup Recaptcha Safely
if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
    });
}

// 4. Buy Now Button Click (Smart Validation)
if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
        
        // A. Photo Necklace Validation
        if (imageInput && !frontTextInput) {
            if (imageInput.files.length === 0) {
                if(uploadError) uploadError.classList.remove('hidden');
                return;
            }
            if(uploadError) uploadError.classList.add('hidden');
        }
        
        // B. Bar Necklace Validation
        if (frontTextInput) {
            if (frontTextInput.value.trim() === '') {
                alert("Please enter text for the Front Engraving.");
                return;
            }
        }

        // Move to login or address section
        if (currentUser) {
            productSection.classList.add('hidden');
            addressSection.classList.remove('hidden');
            loadUserAddress();
        } else {
            productSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// 5. Authentication Logic (OTP)
const sendOtpBtn = document.getElementById('send-otp-btn');
if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => {
        const phoneNumber = document.getElementById('phone-number').value;
        
        // Disable button to prevent double-charges!
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerText = "Sending...";
        sendOtpBtn.classList.add('opacity-50', 'cursor-not-allowed');

        auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
            .then((confirmationResult) => {
                window.confirmationResult = confirmationResult;
                document.getElementById('phone-input-group').classList.add('hidden');
                document.getElementById('otp-input-group').classList.remove('hidden');
            }).catch((error) => {
                console.error("SMS not sent", error);
                alert("Error sending OTP. Check the format (e.g., +91).");
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerText = "Send Security Code";
                sendOtpBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
    });
}

const verifyOtpBtn = document.getElementById('verify-otp-btn');
if(verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
        const code = document.getElementById('otp-code').value;
        window.confirmationResult.confirm(code).then((result) => {
            currentUser = result.user;
            loginSection.classList.add('hidden');
            addressSection.classList.remove('hidden');
            loadUserAddress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }).catch((error) => {
            alert("Invalid OTP");
        });
    });
}

auth.onAuthStateChanged((user) => {
    if (user) currentUser = user;
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

// 6. Final Checkout (Universal Logic for all products)
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI Loading state
        completeOrderBtn.classList.add('hidden');
        loadingMsg.classList.remove('hidden');

        // Address Details
        const fullName = document.getElementById('fullName').value;
        const streetAddress = document.getElementById('streetAddress').value;
        const city = document.getElementById('city').value;
        const zipCode = document.getElementById('zipCode').value;

        // Dynamic Product Details (Safely fetching if they exist)
        const selectedChain = chainDropdown ? chainDropdown.value : 'Default Chain';
        const priceElement = document.getElementById('product-price');
        const productPriceInPaise = priceElement ? priceElement.getAttribute('data-price') : "49900"; 
        const titleElement = document.getElementById('product-title');
        const productName = titleElement ? titleElement.innerText : "Custom Jewelry";

        try {
            let imageUrl = null;

            // ONLY upload if this is a Photo Necklace and a file was provided
            if (imageInput && imageInput.files.length > 0) {
                const file = imageInput.files[0];
                const imgbbApiKey = "979703ccbef01ef78d075cd6e3769125"; 
                const formData = new FormData();
                formData.append("image", file);

                const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                    method: "POST",
                    body: formData
                });
                
                const imgbbData = await imgbbResponse.json();
                if (!imgbbData.success) throw new Error("Image upload failed");
                imageUrl = imgbbData.data.url;
            }

            const rawPhone = currentUser.phoneNumber || "9999999999"; 
            const finalPhone = rawPhone.replace(/\D/g, '').slice(-10);

            // C. Trigger Razorpay
            const options = {
                "key": "rzp_test_w79rV4Vq76jNyY", 
                "amount": productPriceInPaise, 
                "currency": "INR",
                "name": productName,
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
                "theme": { "color": "#0f172a" }, 
                
                "handler": async (response) => { 
                    const paymentId = response.razorpay_payment_id;

                    // D. Save Order to Database
                    const orderData = {
                        userId: currentUser.uid,
                        phoneNumber: currentUser.phoneNumber,
                        fullName: fullName,
                        streetAddress: streetAddress,
                        city: city,
                        zipCode: zipCode,
                        productName: productName,
                        chainStyle: selectedChain, 
                        affiliateCode: affiliateRef,
                        paymentId: paymentId, 
                        status: 'paid', 
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Only add these to Firestore if they exist on the current page!
                    if (imageUrl) orderData.customImageUrl = imageUrl;
                    if (frontTextInput && frontTextInput.value) orderData.frontText = frontTextInput.value.trim();
                    if (backTextInput && backTextInput.value) orderData.backText = backTextInput.value.trim();
                    if (colorDropdown) orderData.colorStyle = colorDropdown.value;

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

                        // Premium Success Screen
                        addressSection.innerHTML = `
                            <div class="text-center p-8">
                                <div class="w-16 h-16 bg-brand-mint text-brand-dark rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <h2 class="text-3xl font-bold text-brand-dark mb-4">Payment Successful! 🎉</h2>
                                <p class="text-slate-600 mb-2">Thank you, ${fullName}. Your order (ID: <span class="font-mono text-sm">${paymentId}</span>) is confirmed.</p>
                                <p class="text-slate-600 mb-8">We have successfully received your custom design requests.</p>
                                <a href="index.html" class="inline-block px-8 py-4 rounded-full bg-brand-dark text-white font-bold hover:bg-slate-800 transition-colors">
                                    Back to Shop
                                </a>
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
                completeOrderBtn.classList.remove('hidden');
                loadingMsg.classList.add('hidden');
            });
            rzp1.open();

        } catch (error) {
            console.error("Error during checkout process:", error);
            alert("An error occurred processing your request. Please try again.");
            completeOrderBtn.classList.remove('hidden');
            loadingMsg.classList.add('hidden');
        }
    });
}