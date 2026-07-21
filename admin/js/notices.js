// MARK: =====================================================
// MARK: 공지 목록 화면 인증 보호
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { isAdminEmail } from "./common.js";

// MARK: - 화면 요소
const pageLoading = document.getElementById("pageLoading");
const adminContent = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const logoutButton = document.getElementById("logoutButton");

// MARK: - 화면 상태 전환
function showAdminContent(user) {
    adminEmail.textContent = user.email ?? "관리자";

    // 변경: CSS의 display:grid/flex 규칙과 충돌하지 않도록
    // hidden 속성을 명확하게 전환합니다.
    pageLoading.hidden = true;
    adminContent.hidden = false;
}

function showLoadingMessage(message) {
    pageLoading.textContent = message;
    pageLoading.hidden = false;
    adminContent.hidden = true;
}


// MARK: - 개발용 공지 조회
async function loadNotices() {
    const noticesQuery = query(
        collection(db, "dev_notices"),
        orderBy("version", "desc")
    );

    const snapshot = await getDocs(noticesQuery);

    console.log("dev_notices 조회 완료:", snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
    })));
}

// MARK: - 로그인 및 관리자 권한 확인
onAuthStateChanged(
    auth,
    async (user) => {
        if (!user) {
            window.location.replace("index.html");
            return;
        }

        if (!isAdminEmail(user.email)) {
            await signOut(auth);
            window.location.replace("index.html");
            return;
        }

        showAdminContent(user);

        try {
            await loadNotices();
        } catch (error) {
            console.error("dev_notices 조회 실패:", error);
        }
    },
    (error) => {
        console.error("관리자 인증 상태 확인 실패:", error);
        showLoadingMessage("로그인 상태를 확인하지 못했습니다. 페이지를 새로고침해 주세요.");
    }
);

// MARK: - 로그아웃
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "로그아웃 중...";

    try {
        await signOut(auth);
        window.location.replace("index.html");
    } catch (error) {
        console.error("로그아웃 실패:", error);
        logoutButton.disabled = false;
        logoutButton.textContent = "로그아웃";
        alert("로그아웃 중 오류가 발생했습니다.");
    }
});
