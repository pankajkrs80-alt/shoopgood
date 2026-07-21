import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

const firebaseConfig = {

    apiKey: "AIzaSyAi-UUUJdje3uyuKqcQRkCPUelH7Zx3N-U",

    authDomain: "shopgood-5f298.firebaseapp.com",

    projectId: "shopgood-5f298",

    storageBucket: "shopgood-5f298.firebasestorage.app",

    messagingSenderId: "990509179696",

    appId: "1:990509179696:web:690f44a01bbb71b56edef5"

};

const app = initializeApp(firebaseConfig);

export { app };