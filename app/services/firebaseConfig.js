// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "",
  authDomain: "de-fato.firebaseapp.com",
  databaseURL: "https://de-fato-default-rtdb.firebaseio.com",
  projectId: "de-fato",
  storageBucket: "de-fato.appspot.com", 
  messagingSenderId: "1047948482546",
  appId: "1:1047948482546:web:9e4f3c9d5487f7cb18fd6b",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); 

export { app, auth, db, storage };