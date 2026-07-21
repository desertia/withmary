// MARK: =====================================================
// MARK: 새 공지 작성 화면
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { isAdminEmail } from "./common.js";

// MARK: - 화면 요소
const pageLoading = document.getElementById("pageLoading");
const adminContent = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const logoutButton = document.getElementById("logoutButton");
const noticeForm = document.getElementById("noticeForm");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const targetInputs = [...document.querySelectorAll('input[name="targets"]')];
const isEnabledInput = document.getElementById("isEnabled");
const formError = document.getElementById("formError");
const cancelButton = document.getElementById("cancelButton");
const saveButton = document.getElementById("saveButton");

let isSaving = false;

// MARK: - 화면 상태 전환
function showAdminContent(user) {
    adminEmail.textContent = user.email ?? "관리자";
    pageLoading.hidden = true;
    adminContent.hidden = false;
    titleInput.focus();
}

function showLoadingMessage(message) {
    pageLoading.textContent = message;
    pageLoading.hidden = false;
    adminContent.hidden = true;
}

function showFormError(message) {
    formError.textContent = message;
}

function setSaving(saving) {
    isSaving = saving;
    saveButton.disabled = saving;
    cancelButton.disabled = saving;
    titleInput.disabled = saving;
    bodyInput.disabled = saving;
    targetInputs.forEach((input) => { input.disabled = saving; });
    isEnabledInput.disabled = saving;
    saveButton.textContent = saving ? "저장 중..." : "저장";
}

// MARK: - 다음 버전 조회
async function getNextVersion() {
    const latestVersionQuery = query(
        collection(db, "dev_notices"),
        orderBy("version", "desc"),
        limit(1)
    );

    const snapshot = await getDocs(latestVersionQuery);

    if (snapshot.empty) {
        return 1;
    }

    const latestVersion = Number(snapshot.docs[0].data().version);
    return Number.isFinite(latestVersion) ? latestVersion + 1 : 1;
}

// MARK: - 공지 저장
noticeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSaving) {
        return;
    }

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const targets = targetInputs
        .filter((input) => input.checked)
        .map((input) => input.value);

    showFormError("");

    if (!title) {
        showFormError("제목을 입력해 주세요.");
        titleInput.focus();
        return;
    }

    if (!body) {
        showFormError("내용을 입력해 주세요.");
        bodyInput.focus();
        return;
    }

    if (targets.length === 0) {
        showFormError("대상을 하나 이상 선택해 주세요.");
        targetInputs[0].focus();
        return;
    }

    setSaving(true);

    try {
        const version = await getNextVersion();
        const noticeDocument = doc(db, "dev_notices", String(version));

        await setDoc(noticeDocument, {
            title,
            body,
            targets,
            isEnabled: isEnabledInput.checked,
            updatedAt: serverTimestamp(),
            version
        });

        alert("저장되었습니다.");
        window.location.replace("notices.html");
    } catch (error) {
        console.error("dev_notices 저장 실패:", error);
        showFormError("공지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setSaving(false);
    }
});

// MARK: - 취소
cancelButton.addEventListener("click", () => {
    if (!isSaving) {
        window.location.href = "notices.html";
    }
});

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
