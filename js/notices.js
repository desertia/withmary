// MARK: =====================================================
// MARK: 공지 목록 화면 인증 보호
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { auth } from "./firebase.js";
import { isAdminEmail } from "./common.js";

const pageLoading = document.getElementById("pageLoading");
const adminContent = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const logoutButton = document.getElementById("logoutButton");

// MARK: - 로그인 및 관리자 권한 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("index.html");
        return;
    }

    if (!isAdminEmail(user.email)) {
        await signOut(auth);
        window.location.replace("index.html");
        return;
    }

    adminEmail.textContent = user.email ?? "관리자";
    pageLoading.hidden = true;
    adminContent.hidden = false;
});

// MARK: - 로그아웃
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "로그아웃 중...";

    try {
        await signOut(auth);
        window.location.replace("index.html");
    } catch (error) {
        logoutButton.disabled = false;
        logoutButton.textContent = "로그아웃";
        alert("로그아웃 중 오류가 발생했습니다.");
    }
});
