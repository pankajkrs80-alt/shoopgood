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

let currentUser = null;
if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' });
}

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');

document.getElementById('send-otp-btn').addEventListener('click', () => {
    const phone = document.getElementById('partner-phone').value;
    const btn = document.getElementById('send-otp-btn');
    btn.disabled = true; btn.innerText = "Sending...";
    
    auth.signInWithPhoneNumber(phone, window.recaptchaVerifier).then((result) => {
        window.confirmationResult = result;
        document.getElementById('phone-input-group').classList.add('hidden');
        document.getElementById('otp-input-group').classList.remove('hidden');
    }).catch((error) => {
        alert("Error sending OTP. Ensure format is +919876543210");
        btn.disabled = false; btn.innerText = "Send OTP";
    });
});

document.getElementById('verify-otp-btn').addEventListener('click', () => {
    const code = document.getElementById('otp-code').value;
    window.confirmationResult.confirm(code).then((result) => {
        // Success
    }).catch(() => alert("Invalid OTP"));
});

document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.reload());
});

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        loadPartnerData();
        loadLeaderboard();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
});

async function loadPartnerData() {
    // 1. Find the affiliate document using their phone number
    const query = await db.collection('affiliates').where('phoneNumber', '==', currentUser.phoneNumber).get();
    
    if (query.empty) {
        alert("No partner account found for this number. Contact Admin to create your account.");
        auth.signOut();
        return;
    }

    const affiliateDoc = query.docs[0];
    const data = affiliateDoc.data();
    const affiliateCode = affiliateDoc.id; // Their code is the Document ID (e.g., PRIYA)

    // 2. Populate UI
    document.getElementById('partner-name').innerText = `Welcome, ${data.name}!`;
    document.getElementById('stat-sales').innerText = data.totalSales || 0;
    document.getElementById('stat-pending').innerText = `₹${data.pendingBalance || 0}`;
    document.getElementById('stat-lifetime').innerText = `₹${data.totalCommission || 0}`;
    
    // Generate Custom Link (FIXED FOR VERCEL)
    const baseUrl = window.location.origin + '/';
    const referralLink = `${baseUrl}?ref=${affiliateCode}`;
    document.getElementById('ref-link').innerText = referralLink;

    // 3. Setup Copy Button
    document.getElementById('copy-btn').addEventListener('click', (e) => {
        // Use legacy copy for max compatibility in standard iframes/mobile
        const textArea = document.createElement("textarea");
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        
        e.target.innerText = "Copied!";
        e.target.classList.add("bg-white", "text-brand-dark");
        setTimeout(() => { 
            e.target.innerText = "Copy"; 
            e.target.classList.remove("bg-white", "text-brand-dark");
        }, 2000);
    });

    // 4. Calculate Next Payout Date (15th or 30th)
    const today = new Date();
    let nextPayout = new Date();
    if (today.getDate() <= 15) {
        nextPayout.setDate(15);
    } else {
        // Last day of the current month
        nextPayout = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
    }
    const dateOptions = { month: 'short', day: 'numeric' };
    document.getElementById('next-payout-text').innerText = `Next Payout: ${nextPayout.toLocaleDateString(undefined, dateOptions)}`;
}

async function loadLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboard-body');
    leaderboardBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-slate-400">Loading ranks...</td></tr>';
    
    try {
        // Fetch top 5 affiliates by total sales
        const snapshot = await db.collection('affiliates')
                                 .orderBy('totalSales', 'desc')
                                 .limit(5)
                                 .get();
        
        let html = '';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            // Emojis for top 3
            let rankIcon = rank;
            if(rank === 1) rankIcon = '🥇';
            if(rank === 2) rankIcon = '🥈';
            if(rank === 3) rankIcon = '🥉';

            html += `
                <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td class="py-4 font-bold ${rank <= 3 ? 'text-lg' : 'text-slate-500'}">${rankIcon}</td>
                    <td class="py-4 font-bold text-brand-dark">${data.name}</td>
                    <td class="py-4 text-right font-extrabold text-emerald-600">${data.totalSales || 0}</td>
                </tr>
            `;
            rank++;
        });
        
        leaderboardBody.innerHTML = html;
    } catch (e) {
        console.error("Leaderboard error:", e);
        leaderboardBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-red-500">Could not load leaderboard</td></tr>';
    }
}