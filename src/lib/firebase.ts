import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAytsEqI8uZYz8HgfaDdipEhhPmKQoxLeg",
    authDomain: "galeria-privada-kaelia.firebaseapp.com",
    projectId: "galeria-privada-kaelia",
    storageBucket: "galeria-privada-kaelia.firebasestorage.app",
    messagingSenderId: "1:248784254099:web:ea3d671cccc8bc8bd58966",
    appId: "G-V30D7EWJ0T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);