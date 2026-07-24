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

// 2. UI Elements
const adminLoginSection = document.getElementById('admin-login-section');
const adminContent = document.getElementById('admin-content');
const logoutBtn = document.getElementById('admin-logout-btn');
const tableBody = document.getElementById('orders-table-body');
const loginError = document.getElementById('login-error');

// 3. Define the Admin UID (Paste your GOOGLE account UID here)
const ADMIN_UID = "GDULd9emeCWRjKj2TFZx6ByhEO23"; 

// 4. Handle Google Sign-In
const googleProvider = new firebase.auth.GoogleAuthProvider();

document.getElementById('admin-login-btn').addEventListener('click', () => {
    // Hide previous errors
    loginError.style.display = 'none';

    auth.signInWithPopup(googleProvider)
        .catch((error) => {
            console.error("Login Error:", error);
            loginError.innerText = "Error signing in. Please try again.";
            loginError.style.display = 'block';
        });
});
// 5. Listen for Auth State
auth.onAuthStateChanged((user) => {
    if (user && user.uid === ADMIN_UID) {
        // Correct admin is logged in
        adminLoginSection.classList.add('hidden');
        adminContent.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        fetchOrders();
    } else if (user) {
        // Someone logged in, but they are NOT the admin (e.g. a customer on this page)
        loginError.innerText = "Access Denied. You do not have admin privileges.";
        loginError.style.display = 'block';
        auth.signOut(); 
    } else {
        // No one is logged in
        adminLoginSection.classList.remove('hidden');
        adminContent.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
});

// 6. Fetch All Orders & Calculate Affiliate Stats
async function fetchOrders() {
    // Notice colspan is now 7 to match our new column count
    tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Loading orders...</td></tr>";
    
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>No orders found.</td></tr>";
            document.getElementById('affiliate-stats').innerHTML = "<p>No sales yet.</p>";
            return;
        }

        let tableHtml = "";
        let affiliateCounts = {}; 
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' };
            const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleDateString(undefined, dateOptions) : 'N/A';
            
            // --- THIS GRABS THE URL YOU FOUND AND MAKES A BUTTON ---
            const imageLink = order.customImageUrl 
                ? `<a href="${order.customImageUrl}" target="_blank" style="color: #4285F4; font-weight: bold; text-decoration: none;">🖼️ View Photo</a>` 
                : `<span style="color: #999;">No Image</span>`;
            
            // Build the table rows (Now includes the 7th column for the image)
            tableHtml += `
                <tr>
                    <td>${orderDate}</td>
                    <td><strong>${order.fullName || 'N/A'}</strong></td>
                    <td>${order.phoneNumber || 'N/A'}</td>
                    <td>${order.streetAddress || ''}, ${order.city || ''} ${order.zipCode || ''}</td>
                    <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${order.affiliateCode || 'none'}</span></td>
                    <td><small>${order.paymentId || 'Pending'}</small></td>
                    <td>${imageLink}</td> <!-- New image column -->
                </tr>
            `;

            // Tally up successful affiliate sales
            if (order.status === 'paid' && order.affiliateCode && order.affiliateCode !== 'none') {
                affiliateCounts[order.affiliateCode] = (affiliateCounts[order.affiliateCode] || 0) + 1;
            }
        });
        
        tableBody.innerHTML = tableHtml;

        // Build the Affiliate Leaderboard HTML
        let statsHtml = "";
        for (const [code, count] of Object.entries(affiliateCounts)) {
            statsHtml += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 8px 0;">
                            <span><strong>${code}</strong></span>
                            <span style="color: #10b981; font-weight: bold;">${count} Sales</span>
                          </div>`;
        }
        document.getElementById('affiliate-stats').innerHTML = statsHtml || "<p>No affiliate sales yet.</p>";
        
    } catch (error) {
        console.error("Error fetching orders: ", error);
        tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center; color:red;'>Error loading data. Check console.</td></tr>";
    }
}
// 7. Logout Logic
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.reload();
    });
});