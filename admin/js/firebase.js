// MARK: =====================================================
// MARK: Firebase 초기화
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Firebase Console에서 등록한 With Mary Admin 웹 앱 설정입니다.
const firebaseConfig = {
    apiKey: "AIzaSyAZeU9evyniyQ6KQNh9RQW9XTMHV46VSRs",
    authDomain: "with-mary.firebaseapp.com",
    projectId: "with-mary",
    storageBucket: "with-mary.firebasestorage.app",
    messagingSenderId: "157803734635",
    appId: "1:157803734635:web:f2e24842c8c430e576732e",
    measurementId: "G-157F25LYFB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
