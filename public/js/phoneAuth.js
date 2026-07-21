import { app } from "./firebase.js";

import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const auth = getAuth(app);

window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "normal"
});

let confirmationResult = null;

document.getElementById("sendOtp").addEventListener("click", async () => {

    const phone = document.getElementById("phone").value;

    try {

        confirmationResult = await signInWithPhoneNumber(
            auth,
            phone,
            window.recaptchaVerifier
        );

        alert("OTP Sent");

    } catch (error) {

        alert(error.message);

        console.log(error);

    }

});

document.getElementById("verifyOtp").addEventListener("click", async () => {

    const otp = document.getElementById("otp").value;

    try {

        const result = await confirmationResult.confirm(otp);

        alert("Welcome " + result.user.phoneNumber);

        window.location.href = "index.html";

    } catch (error) {

        alert("Invalid OTP");

    }

});