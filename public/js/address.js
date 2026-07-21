import { app } from "./firebase.js";

import {

getFirestore,
collection,
addDoc,
serverTimestamp

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {

getAuth,
onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const db = getFirestore(app);

const auth = getAuth(app);

let currentUser = null;

onAuthStateChanged(auth,(user)=>{

if(user){

currentUser=user;

}else{

window.location.href="login.html";

}

});

document.getElementById("addressForm").addEventListener("submit",async(e)=>{

e.preventDefault();

await addDoc(

collection(db,"customers",currentUser.uid,"addresses"),

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

alert("Address Saved");

window.location.href="index.html";

});