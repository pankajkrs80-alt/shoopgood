// ... existing code ...
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
const catalogSection = document.getElementById('catalog-section'); 

// 1. Keep button visible, just track user state
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
    } else {
        currentUser = null;
    }
});

// 2. Click Logic: Login Screen OR Dashboard
if (myAccountBtn) {
    myAccountBtn.addEventListener('click', () => {
        // Hide storefront safely
        if (catalogSection) catalogSection.classList.add('hidden');
        if (productSection) productSection.classList.add('hidden');
        if (addressSection) addressSection.classList.add('hidden');

        if (!currentUser) {
            // NOT LOGGED IN: Show Login Screen
            if (loginSection) loginSection.classList.remove('hidden');
            
            // BULLETPROOF RECAPTCHA: Only set it up if it doesn't exist yet!
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                    'size': 'invisible'
                });
            }
        } else {
            // LOGGED IN: Show Account Dashboard
            if (loginSection) loginSection.classList.add('hidden');
            if (accountSection) {
                accountSection.classList.remove('hidden');
                loadAccountData();
            }
        }
        window.scrollTo(0,0);
    });
}

// 3. Bulletproof "Back to Shop" button
if (backToShopBtn) {
    backToShopBtn.addEventListener('click', () => {
        if (accountSection) accountSection.classList.add('hidden');
        if (loginSection) loginSection.classList.add('hidden');
        if (catalogSection) catalogSection.classList.remove('hidden'); 
        if (productSection) productSection.classList.remove('hidden'); 
        window.scrollTo(0,0);
    });
}

// 4. Logout User (Force page reset)
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = window.location.pathname; 
        });
    });
}

// 5. Fetch Profile and Orders (Updated with Tailwind CSS styling!)
async function loadAccountData() {
    const profileDiv = document.getElementById('profile-details');
    const ordersDiv = document.getElementById('orders-list');
    
    if (!profileDiv || !ordersDiv) return;

    profileDiv.innerHTML = "<p class='text-slate-500 font-medium animate-pulse'>Loading profile...</p>";
    ordersDiv.innerHTML = "<p class='text-slate-500 font-medium animate-pulse'>Loading orders...</p>";
    
    try {
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
        }

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
                
                const imageLink = order.customImageUrl 
                    ? `<div class="mt-4 pt-4 border-t border-gray-100">
                           <a href="${order.customImageUrl}" target="_blank" class="text-brand-blue font-bold hover:text-blue-500 transition-colors flex items-center gap-2">
                               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                               View Custom Photo Upload
                           </a>
                       </div>` 
                    : '';

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