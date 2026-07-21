import { app } from "./firebase.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const db = getFirestore(app);

export async function createUserIfNotExists(user) {

    const ref = doc(db, "customers", user.uid);

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {

        const affiliateRef = localStorage.getItem("affiliateRef") || "";

        await setDoc(ref, {

            uid: user.uid,

            phone: user.phoneNumber || "",

            email: user.email || "",

            name: user.displayName || "",

            affiliateRef: affiliateRef,

            createdAt: serverTimestamp(),

            totalOrders: 0,

            totalSpent: 0

        });

        console.log("New customer created");

    } else {

        console.log("Customer already exists");

    }

}