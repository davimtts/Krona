// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getAuth,
    browserLocalPersistence,
    setPersistence
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDlJvLN8nXBNG7Yi2mh-vnYmuUUnEeFeh4",
    authDomain: "krona-78f6d.firebaseapp.com",
    projectId: "krona-78f6d",
    storageBucket: "krona-78f6d.firebasestorage.app",
    messagingSenderId: "1001729453371",
    appId: "1:1001729453371:web:98bef70239d1b583425b1e",
    measurementId: "G-5HDDJCRGMR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);

export { app, auth, db };