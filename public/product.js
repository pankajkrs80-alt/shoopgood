// ==========================================
// 8. DYNAMIC FONT PREVIEW & SELECTION UI
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const fontRadios = document.querySelectorAll('input[name="font_choice"]');
    const frontTextInput = document.getElementById('front-text');
    const backTextInput = document.getElementById('back-text');
    const fontCards = document.querySelectorAll('.font-card'); 

    if (fontRadios.length > 0) {
        fontRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                
                // 1. UPDATE THE VISUAL BORDERS ON THE CARDS
                fontCards.forEach(card => {
                    // Reset all cards to gray/inactive
                    card.classList.remove('border-brand-dark', 'bg-slate-50', 'text-brand-dark', 'shadow-md');
                    card.classList.add('border-gray-200', 'bg-white', 'text-slate-400');
                });

                // Find the specific card that was just clicked and make it dark/active
                const activeCard = radio.closest('.font-card');
                if (activeCard) {
                    activeCard.classList.remove('border-gray-200', 'bg-white', 'text-slate-400');
                    activeCard.classList.add('border-brand-dark', 'bg-slate-50', 'text-brand-dark', 'shadow-md');
                }

                // 2. UPDATE THE TEXT PREVIEW FONT
                const selectedFont = e.target.value;
                let fontFamilyStyle = "'Inter', sans-serif"; // Modern (Default)

                if (selectedFont === 'classic') {
                    fontFamilyStyle = "'Playfair Display', serif";
                } else if (selectedFont === 'script') {
                    fontFamilyStyle = "'Dancing Script', cursive";
                }

                // Apply to input boxes
                if (frontTextInput) frontTextInput.style.fontFamily = fontFamilyStyle;
                if (backTextInput) backTextInput.style.fontFamily = fontFamilyStyle;
            });
        });
    }
});
// 1. Initialize Firebase Safely
if (typeof firebase === 'undefined') {
    console.error("Firebase SDK is missing. Please ensure Firebase scripts are included in your HTML.");
} else {
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

    // Cuff Bracelet Inputs
    const braceletNameInput = document.getElementById('bracelet-name');
    const braceletSymbolDropdown = document.getElementById('bracelet-symbol');

    const uploadError = document.getElementById('upload-error');
    const completeOrderBtn = document.getElementById('complete-order-btn');
    const loadingMsg = document.getElementById('loading-msg');
    const buyNowBtn = document.getElementById('buy-now-btn');

    // 3. Setup Recaptcha Safely (Only if the container exists)
    if (!window.recaptchaVerifier && document.getElementById('recaptcha-container')) {
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
                    if (uploadError) uploadError.classList.remove('hidden');
                    return;
                }
                if (uploadError) uploadError.classList.add('hidden');
            }
            
            // B. Bar Necklace Validation
            if (frontTextInput) {
                const frontError = document.getElementById('front-error');
                if (frontTextInput.value.trim() === '') {
                    if (frontError) frontError.classList.remove('hidden');
                    else alert("⚠️ Please enter the text to be engraved.");
                    return;
                } else {
                    if (frontError) frontError.classList.add('hidden');
                }
            }

            // C. Cuff Bracelet Validation
            if (braceletNameInput) {
                const nameError = document.getElementById('name-error');
                if (braceletNameInput.value.trim() === '') {
                    if (nameError) nameError.classList.remove('hidden');
                    else alert("⚠️ Please enter a name to engrave.");
                    return;
                } else {
                    if (nameError) nameError.classList.add('hidden');
                }
            }

            // Move to login or address section (Safeguarded)
            if (currentUser) {
                if (productSection) productSection.classList.add('hidden');
                if (addressSection) addressSection.classList.remove('hidden');
                loadUserAddress();
            } else {
                if (productSection) productSection.classList.add('hidden');
                if (loginSection) loginSection.classList.remove('hidden');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 5. Authentication Logic (OTP)
    const sendOtpBtn = document.getElementById('send-otp-btn');
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', () => {
            const phoneInputEl = document.getElementById('phone-number');
            if (!phoneInputEl || !phoneInputEl.value) {
                alert("Please enter a valid phone number.");
                return;
            }

            // Clean the input by removing any accidental spaces
            const rawNumber = phoneInputEl.value.replace(/\s+/g, '');

            // Validate that the user entered exactly 10 digits
            if (!/^\d{10}$/.test(rawNumber)) {
                alert("Please enter a valid 10-digit phone number.");
                return;
            }

            // Automatically prepend +91 for Firebase
            const phoneNumber = '+91' + rawNumber;
            
            // Disable button to prevent double-charges!
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerText = "Sending...";
            sendOtpBtn.classList.add('opacity-50', 'cursor-not-allowed');

            auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
                .then((confirmationResult) => {
                    window.confirmationResult = confirmationResult;
                    const phoneGroup = document.getElementById('phone-input-group');
                    const otpGroup = document.getElementById('otp-input-group');
                    
                    if (phoneGroup) phoneGroup.classList.add('hidden');
                    if (otpGroup) otpGroup.classList.remove('hidden');
                }).catch((error) => {
                    console.error("SMS not sent", error);
                    alert("Error sending OTP. Please try again.");
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerText = "Send Security Code";
                    sendOtpBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                });
        });
    }

    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', () => {
            const otpCodeEl = document.getElementById('otp-code');
            if (!otpCodeEl || !otpCodeEl.value) return;
            
            const code = otpCodeEl.value;
            window.confirmationResult.confirm(code).then((result) => {
                currentUser = result.user;
                if (loginSection) loginSection.classList.add('hidden');
                if (addressSection) addressSection.classList.remove('hidden');
                loadUserAddress();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }).catch((error) => {
                alert("Invalid OTP");
                console.error("OTP Error:", error);
            });
        });
    }

    auth.onAuthStateChanged((user) => {
        if (user) currentUser = user;
    });

    async function loadUserAddress() {
        if (!currentUser) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid).get();
            if (doc.exists) {
                const data = doc.data();
                // Safely update DOM if elements exist
                const fnEl = document.getElementById('fullName');
                const saEl = document.getElementById('streetAddress');
                const ciEl = document.getElementById('city');
                const zcEl = document.getElementById('zipCode');

                if (fnEl) fnEl.value = data.fullName || '';
                if (saEl) saEl.value = data.streetAddress || '';
                if (ciEl) ciEl.value = data.city || '';
                if (zcEl) zcEl.value = data.zipCode || '';
            }
        } catch (err) {
            console.error("Failed to load address:", err);
        }
    }

    // 6. Final Checkout (Universal Logic for all products)
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Prevent execution if Razorpay is not loaded
            if (typeof Razorpay === 'undefined') {
                alert("Payment gateway failed to load. Please refresh the page or check your internet connection.");
                return;
            }

            // UI Loading state
            if (completeOrderBtn) completeOrderBtn.classList.add('hidden');
            if (loadingMsg) loadingMsg.classList.remove('hidden');

            // Address Details (Using optional chaining to prevent null errors)
            const fullName = document.getElementById('fullName')?.value || "";
            const streetAddress = document.getElementById('streetAddress')?.value || "";
            const city = document.getElementById('city')?.value || "";
            const zipCode = document.getElementById('zipCode')?.value || "";

            // STRICT MANUAL VALIDATION: Ensure no address fields are blank!
            if (!fullName.trim() || !streetAddress.trim() || !city.trim() || !zipCode.trim()) {
                alert("⚠️ Please fill in your complete shipping address before paying.");
                if (completeOrderBtn) completeOrderBtn.classList.remove('hidden');
                if (loadingMsg) loadingMsg.classList.add('hidden');
                return; // This stops the payment from opening!
            }

            // Dynamic Product Details (Safely fetching if they exist)
            const selectedChain = chainDropdown ? chainDropdown.value : 'Default Chain';
            const priceElement = document.getElementById('product-price');
            const productPriceInPaise = priceElement ? priceElement.getAttribute('data-price') : "49900"; 
            const titleElement = document.getElementById('product-title');
            const productName = titleElement ? titleElement.innerText : "Custom Jewelry";

            // --- NEW: Capture Font Safely ---
            const fontInput = document.querySelector('input[name="font_choice"]:checked');
            const selectedFont = fontInput ? fontInput.value : null;
            // --------------------------------

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
                        "email": false
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

                        // Add Cuff Bracelet fields if present
                        if (braceletNameInput && braceletNameInput.value) orderData.braceletName = braceletNameInput.value.trim();
                        if (braceletSymbolDropdown) orderData.braceletSymbol = braceletSymbolDropdown.value;
                        
// NEW: Save the selected font if it exists!
                        // NEW: Save the selected font if it exists!
                        if (selectedFont) orderData.fontStyle = selectedFont;

                        try {
                            // 1. Save to Firebase Database
                            await db.collection('orders').add(orderData);

                            // --- NEW: GENERATE SHOPGOOD ORDER ID ---
                            const today = new Date();
                            const dd = String(today.getDate()).padStart(2, '0');
                            const mm = String(today.getMonth() + 1).padStart(2, '0');
                            const yyyy = today.getFullYear();
                            const shopGoodOrderId = `91${finalPhone}${dd}${mm}${yyyy}`;
                            // ---------------------------------------
                            
                            // 2. Prepare SAFE data for Google Sheets
                            const sheetData = {
                                shopGoodOrderId: shopGoodOrderId, // <--- ADDED HERE
                                paymentId: paymentId,
                                fullName: fullName,
                                phoneNumber: finalPhone,
                                city: city,
                                productName: productName,
                                fontStyle: selectedFont || "None",
                                frontText: frontTextInput ? frontTextInput.value.trim() : "None",
                                backText: backTextInput ? backTextInput.value.trim() : "None",
                                customImageUrl: imageUrl || "None",
                                affiliateCode: affiliateRef !== 'none' ? affiliateRef : "Organic"
                            };

                            // 3. Sync live order to Google Sheets
                            const googleSheetUrl = "https://script.google.com/macros/s/AKfycbyTs1crrIOD2rwvdQu4Uv6oAdW--LNw30ri2gW7_xfLNJBuDhNf1ytcskhboio7EXrw/exec";
                            
                            fetch(googleSheetUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                                body: JSON.stringify(sheetData)
                            }).catch(err => console.error("Sheet Sync Failed:", err));
                            
                            // 4. Save User Address Data
                            await db.collection('users').doc(currentUser.uid).set({
                                fullName, streetAddress, city, zipCode,
                                lastOrderDate: firebase.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });

                            // 5. Update Affiliate Commissions
                            if (affiliateRef !== 'none') {
                                await db.collection('affiliates').doc(affiliateRef).set({
                                    totalSales: firebase.firestore.FieldValue.increment(1),
                                    totalCommission: firebase.firestore.FieldValue.increment(75),
                                    pendingBalance: firebase.firestore.FieldValue.increment(75),
                                    lastSaleAt: firebase.firestore.FieldValue.serverTimestamp()
                                }, { merge: true });
                            }
                            // Premium Success Screen
                            if (addressSection) {
                                addressSection.innerHTML = `
                                    <div class="text-center p-8">
                                        <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <h2 class="text-3xl font-bold text-slate-800 mb-4">Payment Successful! 🎉</h2>
                                        <p class="text-slate-600 mb-2">Thank you, ${fullName}. Your order (ID: <span class="font-mono text-sm">${paymentId}</span>) is confirmed.</p>
                                        <p class="text-slate-600 mb-8">We have successfully received your custom design requests.</p>
                                        <a href="/" class="inline-block px-8 py-4 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">
                                            Back to Shop
                                        </a>
                                    </div>
                                `;
                            }
                        } catch (dbError) {
                            console.error("Firestore Save Error:", dbError);
                            alert("Payment succeeded, but we had trouble saving your order to our database. Please contact support.");
                        }
                    }
                };
                
                const rzp1 = new Razorpay(options);
                rzp1.on('payment.failed', function (response){
                    alert("Payment Failed. Reason: " + response.error.description);
                    if (completeOrderBtn) completeOrderBtn.classList.remove('hidden');
                    if (loadingMsg) loadingMsg.classList.add('hidden');
                });
                rzp1.open();

            } catch (error) {
                console.error("Error during checkout process:", error);
                alert("An error occurred processing your request. Please try again.");
                if (completeOrderBtn) completeOrderBtn.classList.remove('hidden');
                if (loadingMsg) loadingMsg.classList.add('hidden');
            }
        });
    }
}