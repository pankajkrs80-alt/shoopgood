import { app } from "./firebase.js";
import { createUserIfNotExists } from "./firestore.js";

import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const auth = getAuth(app);

let confirmationResult = null;

export function openLoginModal() {

    const modal = document.getElementById("modalContainer");

    modal.innerHTML = `
        <div class="modal">

            <div class="modal-box">

                <h2>Login</h2>

                <input
                    id="phone"
                    placeholder="+919999999999">

                <br><br>

                <button id="sendOtp">
                    Send OTP
                </button>

                <div id="recaptcha-container"></div>

            </div>

        </div>
    `;

    window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
            size: "normal"
        }
    );

    document
        .getElementById("sendOtp")
        .addEventListener("click", sendOTP);
}

async function sendOTP() {

    const phone = document.getElementById("phone").value;

    try {

        confirmationResult = await signInWithPhoneNumber(
            auth,
            phone,
            window.recaptchaVerifier
        );

        showOTPBox();

    } catch (error) {

        alert(error.message);
        console.error(error);

    }

}

function showOTPBox() {

    document.querySelector(".modal-box").innerHTML = `

        <h2>Verify OTP</h2>

        <input
            id="otp"
            placeholder="Enter OTP">

        <br><br>

        <button id="verifyOtp">

            Verify

        </button>

    `;

    document
        .getElementById("verifyOtp")
        .addEventListener("click", verifyOTP);

}

async function verifyOTP() {

    const otp = document.getElementById("otp").value;

    try {

        const result = await confirmationResult.confirm(otp);

        await createUserIfNotExists(result.user);

        alert("Welcome!");

        document.getElementById("modalContainer").innerHTML = "";

    }

    catch (error) {

        alert(error.message);

        console.error(error);

    }

}