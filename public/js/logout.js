import { app } from "./firebase.js";

import {

getAuth,

signOut

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const auth = getAuth(app);

document

.getElementById("logout")

.addEventListener("click", ()=>{

signOut(auth);

location.href="login.html";

});