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
const noticeList = document.getElementById("noticeList");
const noticeCount = document.getElementById("noticeCount");

// MARK: - 화면 상태 전환
function showAdminContent(user) {
    adminEmail.textContent = user.email ?? "관리자";
    pageLoading.hidden = true;
    adminContent.hidden = false;
}

function showLoadingMessage(message) {
    pageLoading.textContent = message;
    pageLoading.hidden = false;
    adminContent.hidden = true;
}

function showNoticeMessage(message) {
    noticeList.replaceChildren();

    const messageElement = document.createElement("div");
    messageElement.className = "notice-list-message";
    messageElement.textContent = message;
    noticeList.append(messageElement);
}

// MARK: - 공지 표시용 변환
function formatTargets(targets) {
    if (!Array.isArray(targets) || targets.length === 0) {
        return "대상 없음";
    }

    return targets.join(" · ");
}

function formatUpdatedAt(updatedAt) {
    if (!updatedAt || typeof updatedAt.toDate !== "function") {
        return "수정일 없음";
    }

    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(updatedAt.toDate());
}

function createMetaItem(text, extraClass = "") {
    const element = document.createElement("span");
    element.className = `notice-meta-item ${extraClass}`.trim();
    element.textContent = text;
    return element;
}

function createNoticeCard(documentSnapshot) {
    const notice = documentSnapshot.data();

    const article = document.createElement("article");
    article.className = "notice-card";
    article.dataset.noticeId = documentSnapshot.id;

    const header = document.createElement("div");
    header.className = "notice-card-header";

    const title = document.createElement("h3");
    title.className = "notice-title";
    title.textContent = notice.title?.trim() || "제목 없음";

    const status = document.createElement("span");
    const isEnabled = notice.isEnabled === true;
    status.className = `notice-status ${isEnabled ? "is-enabled" : "is-disabled"}`;
    status.textContent = isEnabled ? "게시중" : "비활성";

    header.append(title, status);

    const body = document.createElement("p");
    body.className = "notice-body";
    body.textContent = notice.body?.trim() || "내용이 없습니다.";

    const meta = document.createElement("div");
    meta.className = "notice-meta";
    meta.append(
        createMetaItem(formatTargets(notice.targets)),
        createMetaItem(`v${notice.version ?? "-"}`),
        createMetaItem(formatUpdatedAt(notice.updatedAt), "notice-meta-date")
    );

    article.append(header, body, meta);
    return article;
}

// MARK: - 개발용 공지 조회
async function loadNotices() {
    noticeCount.textContent = "불러오는 중...";
    showNoticeMessage("공지 목록을 불러오고 있습니다...");

    const noticesQuery = query(
        collection(db, "dev_notices"),
        orderBy("version", "desc")
    );

    const snapshot = await getDocs(noticesQuery);

    if (snapshot.empty) {
        noticeCount.textContent = "총 0개";
        showNoticeMessage("등록된 공지가 없습니다.");
        return;
    }

    const fragment = document.createDocumentFragment();
    snapshot.docs.forEach((documentSnapshot) => {
        fragment.append(createNoticeCard(documentSnapshot));
    });

    noticeList.replaceChildren(fragment);
    noticeCount.textContent = `총 ${snapshot.size}개`;
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
            noticeCount.textContent = "조회 실패";
            showNoticeMessage("공지 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
