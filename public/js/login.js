import { app } from "./firebase.js";

import {

getAuth,

GoogleAuthProvider,

signInWithPopup

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

document

.getElementById("login")

.addEventListener("click", async () => {

try {

const result = await signInWithPopup(auth, provider);

alert("Welcome " + result.user.displayName);

window.location = "index.html";

}

catch(error){

alert(error.message);

}

});