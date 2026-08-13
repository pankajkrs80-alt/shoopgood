const firebaseConfig = {
    apiKey: "AIzaSyAi-UUUJdje3uyuKqcQRkCPUelH7Zx3N-U",
    authDomain: "shopgood-5f298.firebaseapp.com",
    projectId: "shopgood-5f298",
    storageBucket: "shopgood-5f298.firebasestorage.app",
    messagingSenderId: "990509179696",
    appId: "1:990509179696:web:690f44a01bbb71b56edef5"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// UI Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('partner-login-form');
const logoutBtn = document.getElementById('logout-btn');

// 1. Check if partner is already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    const activePartner = localStorage.getItem('shopGoodPartnerId');
    if (activePartner) {
        loadDashboard(activePartner);
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
});

// 2. Handle Login Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('login-btn');
    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = 'Authenticating...';
    btn.disabled = true;

    const username = document.getElementById('partner-username').value.trim();
    const pin = document.getElementById('partner-password').value.trim();

    try {
        // Search Firestore for a matching username and pin
        const querySnapshot = await db.collection('affiliates')
            .where('username', '==', username)
            .where('pin', '==', pin)
            .get();

        if (querySnapshot.empty) {
            alert("Invalid Username or Security Pin. Please try again.");
            btn.innerHTML = originalBtnHTML;
            btn.disabled = false;
            return;
        }

        // Success! Save their ID to local storage so they stay logged in
        const partnerDoc = querySnapshot.docs[0];
        localStorage.setItem('shopGoodPartnerId', partnerDoc.id);
        
        loadDashboard(partnerDoc.id);

    } catch (error) {
        console.error("Login Error:", error);
        alert("Connection error. Please check your internet and try again.");
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
});

// 3. Handle Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('shopGoodPartnerId');
    window.location.reload(); // Refreshes page to show login screen
});

// 4. Load Dashboard Data
async function loadDashboard(partnerId) {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    try {
        const docRef = await db.collection('affiliates').doc(partnerId).get();
        if (!docRef.exists) {
            localStorage.removeItem('shopGoodPartnerId');
            window.location.reload();
            return;
        }

        const data = docRef.data();

        // Populate Text Elements
        document.getElementById('partner-name').innerText = `Welcome back, ${data.name}!`;
        document.getElementById('stat-sales').innerText = data.totalSales || 0;
        document.getElementById('stat-pending').innerText = `₹${data.pendingBalance || 0}`;
        document.getElementById('stat-lifetime').innerText = `₹${data.totalCommission || 0}`;
        
        // Populate Links & Promo Code (Assuming Document ID is the Promo Code)
        const baseUrl = window.location.origin + '/';
        const referralLink = `${baseUrl}?ref=${partnerId}`;
        
        document.getElementById('ref-link').innerText = referralLink;
        document.getElementById('promo-code').innerText = partnerId;

        // Copy Button Listeners
        document.getElementById('copy-link-btn').onclick = (e) => copyToClipboard(referralLink, e.target);
        document.getElementById('copy-code-btn').onclick = (e) => copyToClipboard(partnerId, e.target);

        // Load Leaderboard
        loadLeaderboard();

    } catch (error) {
        console.error("Dashboard Load Error:", error);
    }
}

// 5. Copy to Clipboard Utility
function copyToClipboard(text, btnElement) {
    const originalText = btnElement.innerText;
    const originalClasses = btnElement.className;

    navigator.clipboard.writeText(text).then(() => {
        btnElement.innerText = "Copied!";
        btnElement.className = "bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex-shrink-0 transition-colors";
        
        setTimeout(() => {
            btnElement.innerText = originalText;
            btnElement.className = originalClasses;
        }, 2000);
    }).catch(err => {
        // Fallback for older mobile browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        btnElement.innerText = "Copied!";
        setTimeout(() => { btnElement.innerText = originalText; }, 2000);
    });
}

// 6. Load Leaderboard
async function loadLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboard-body');
    
    try {
        const snapshot = await db.collection('affiliates')
            .orderBy('totalSales', 'desc')
            .limit(5)
            .get();
        
        let html = '';
        let rank = 1;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Emojis for top 3
            let rankIcon = `<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">${rank}</span>`;
            if(rank === 1) rankIcon = '<span class="text-2xl" title="1st">🥇</span>';
            if(rank === 2) rankIcon = '<span class="text-2xl" title="2nd">🥈</span>';
            if(rank === 3) rankIcon = '<span class="text-2xl" title="3rd">🥉</span>';

            html += `
                <tr class="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                    <td class="py-4 pl-2 align-middle w-16">${rankIcon}</td>
                    <td class="py-4 align-middle font-bold text-brand-dark">${data.name}</td>
                    <td class="py-4 pr-2 align-middle text-right font-extrabold text-emerald-500">${data.totalSales || 0}</td>
                </tr>
            `;
            rank++;
        });
        
        leaderboardBody.innerHTML = html;
    } catch (e) {
        console.error("Leaderboard error:", e);
        leaderboardBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-red-500 font-medium">Could not load rankings</td></tr>';
    }
}