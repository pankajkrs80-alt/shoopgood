import { app } from "./firebase.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const db = getFirestore(app);

const auth = getAuth(app);

export function openAddressModal() {

    const modal = document.getElementById("modalContainer");

    modal.innerHTML = `

<div class="modal">

<div class="modal-box">

<h2>Shipping Address</h2>

<input id="name" placeholder="Full Name">

<br><br>

<input id="mobile" placeholder="Mobile">

<br><br>

<textarea id="address"
placeholder="Address"></textarea>

<br><br>

<input id="city" placeholder="City">

<br><br>

<input id="state" placeholder="State">

<br><br>

<input id="pincode"
placeholder="Pincode">

<br><br>

<button id="saveAddress">

Save & Continue

</button>

</div>

</div>

`;

document
.getElementById("saveAddress")
.addEventListener("click", saveAddress);

}

async function saveAddress(){

const user=auth.currentUser;

await addDoc(

collection(db,"customers",user.uid,"addresses"),

{

name:document.getElementById("name").value,

mobile:document.getElementById("mobile").value,

address:document.getElementById("address").value,

city:document.getElementById("city").value,

state:document.getElementById("state").value,

pincode:document.getElementById("pincode").value,

createdAt:serverTimestamp()

}

);

alert("Address Saved!");

document.getElementById("modalContainer").innerHTML="";

}