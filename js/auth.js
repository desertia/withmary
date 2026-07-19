// MARK: =====================================================
// MARK: 로그인 화면 인증 기능
// ============================================================

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { auth } from "./firebase.js";
import {
    isAdminEmail,
    loginErrorMessage
} from "./common.js";

// MARK: - 화면 요소
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

// MARK: - 로그인 상태 확인
// 이미 로그인한 관리자라면 로그인 화면을 건너뛰고 공지 목록으로 이동합니다.
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        return;
    }

    if (isAdminEmail(user.email)) {
        window.location.replace("notices.html");
        return;
    }

    await signOut(auth);
    showError("관리자 계정만 사용할 수 있습니다.");
});

// MARK: - 로그인 버튼 이벤트
loginButton.addEventListener("click", handleLogin);

// 비밀번호 입력창에서 Return 키를 눌러도 로그인합니다.
passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleLogin();
    }
});

// MARK: - 로그인 처리
async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    clearError();

    if (!email) {
        showError("이메일을 입력해 주세요.");
        emailInput.focus();
        return;
    }

    if (!password) {
        showError("비밀번호를 입력해 주세요.");
        passwordInput.focus();
        return;
    }

    setLoading(true);

    try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const user = credential.user;

        if (!isAdminEmail(user.email)) {
            await signOut(auth);
            showError("관리자 계정만 사용할 수 있습니다.");
            return;
        }

        window.location.replace("notices.html");
    } catch (error) {
        showError(loginErrorMessage(error.code));
    } finally {
        setLoading(false);
    }
}

// MARK: - 화면 상태 변경
function setLoading(isLoading) {
    loginButton.disabled = isLoading;
    loginButton.textContent = isLoading ? "로그인 중..." : "로그인";
    emailInput.disabled = isLoading;
    passwordInput.disabled = isLoading;
}

function showError(message) {
    loginError.textContent = message;
}

function clearError() {
    loginError.textContent = "";
}
