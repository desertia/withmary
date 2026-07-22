// MARK: =====================================================
// MARK: 앱 버전 관리 화면
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { isAdminEmail } from "./common.js";

// MARK: - Firestore 문서 경로
const LIVE_COLLECTION = "appConfig";
const DRAFT_COLLECTION = "dev_appConfig";
const DOCUMENT_ID = "ios";

// MARK: - 화면 요소
const pageLoading = document.getElementById("pageLoading");
const adminContent = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const logoutButton = document.getElementById("logoutButton");
const versionMessage = document.getElementById("versionMessage");

const liveLatestVersion = document.getElementById("liveLatestVersion");
const liveMinimumVersion = document.getElementById("liveMinimumVersion");
const liveTitle = document.getElementById("liveTitle");
const liveMessage = document.getElementById("liveMessage");
const liveUpdatedAt = document.getElementById("liveUpdatedAt");

const draftUpdatedAt = document.getElementById("draftUpdatedAt");
const versionForm = document.getElementById("versionForm");
const latestVersionInput = document.getElementById("latestVersion");
const minimumVersionInput = document.getElementById("minimumVersion");
const titleInput = document.getElementById("versionTitle");
const messageInput = document.getElementById("versionBody");
const saveState = document.getElementById("saveState");
const formError = document.getElementById("formError");
const saveDraftButton = document.getElementById("saveDraftButton");
const publishButton = document.getElementById("publishButton");

const publishModal = document.getElementById("publishModal");
const cancelPublishButton = document.getElementById("cancelPublishButton");
const confirmPublishButton = document.getElementById("confirmPublishButton");
const modalLiveLatestVersion = document.getElementById("modalLiveLatestVersion");
const modalDraftLatestVersion = document.getElementById("modalDraftLatestVersion");
const modalLiveMinimumVersion = document.getElementById("modalLiveMinimumVersion");
const modalDraftMinimumVersion = document.getElementById("modalDraftMinimumVersion");
const modalNoChanges = document.getElementById("modalNoChanges");
const versionToast = document.getElementById("versionToast");

const draftInputs = [latestVersionInput, minimumVersionInput, titleInput, messageInput];

let liveConfig = null;
let savedDraftConfig = null;
let draftDocumentExists = false;
let isWorking = false;
let toastTimer = null;

// MARK: - 화면 상태
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

function showStatus(message, type = "success") {
    versionMessage.textContent = message;
    versionMessage.className = `version-message is-${type}`;
}

function clearStatus() {
    versionMessage.textContent = "";
    versionMessage.className = "version-message";
}

function showToast(message) {
    window.clearTimeout(toastTimer);
    versionToast.textContent = message;
    versionToast.hidden = false;

    requestAnimationFrame(() => {
        versionToast.classList.add("is-visible");
    });

    toastTimer = window.setTimeout(() => {
        versionToast.classList.remove("is-visible");

        window.setTimeout(() => {
            versionToast.hidden = true;
        }, 220);
    }, 2600);
}

function setWorking(working, action = "") {
    isWorking = working;

    saveDraftButton.textContent = working && action === "save" ? "저장 중..." : "초안 저장";
    publishButton.textContent = working && action === "publish" ? "게시 중..." : "게시";
    confirmPublishButton.textContent = working && action === "publish" ? "게시 중..." : "게시";
    cancelPublishButton.disabled = working;

    updateActionState();
}

// MARK: - 표시용 변환
function formatUpdatedAt(updatedAt) {
    let date = null;

    if (updatedAt instanceof Date) {
        date = updatedAt;
    } else if (updatedAt && typeof updatedAt.toDate === "function") {
        date = updatedAt.toDate();
    }

    if (!date) {
        return "수정일 없음";
    }

    return `수정 ${new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date)}`;
}

function textOrDash(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "-";
}

function getComparableConfig(config) {
    return {
        latestVersion: config?.latestVersion ?? "",
        minimumVersion: config?.minimumVersion ?? "",
        title: config?.title ?? "",
        message: config?.message ?? ""
    };
}

function getInputConfig() {
    return {
        latestVersion: latestVersionInput.value,
        minimumVersion: minimumVersionInput.value,
        title: titleInput.value,
        message: messageInput.value
    };
}

function configsEqual(left, right) {
    const leftConfig = getComparableConfig(left);
    const rightConfig = getComparableConfig(right);

    return Object.keys(leftConfig).every((key) => leftConfig[key] === rightConfig[key]);
}

function hasUnsavedChanges() {
    return !draftDocumentExists || !configsEqual(getInputConfig(), savedDraftConfig);
}

function hasPublishChanges() {
    return !configsEqual(getInputConfig(), liveConfig);
}

function updateSaveState(isDirty) {
    saveState.className = `version-save-state ${isDirty ? "is-dirty" : "is-saved"}`;
    saveState.innerHTML = isDirty
        ? '<span aria-hidden="true">●</span> 저장되지 않은 변경사항'
        : '<span aria-hidden="true">✓</span> 모든 변경사항 저장됨';
}

function updateActionState() {
    const isDirty = hasUnsavedChanges();
    const canPublish = hasPublishChanges();

    updateSaveState(isDirty);
    saveDraftButton.disabled = isWorking || !isDirty;
    publishButton.disabled = isWorking || !canPublish;

    confirmPublishButton.disabled = isWorking || !canPublish || !modalNoChanges.hidden;
}

// MARK: - 버전 검증
function parseVersion(value) {
    const trimmed = value.trim();

    // major.minor.patch 형식만 허용합니다. 예: 1.0.0, 10.15.8
    if (!/^\d+\.\d+\.\d+$/.test(trimmed)) {
        return null;
    }

    return trimmed.split(".").map((part) => Number(part));
}

function compareVersions(left, right) {
    for (let index = 0; index < 3; index += 1) {
        if (left[index] > right[index]) return 1;
        if (left[index] < right[index]) return -1;
    }

    return 0;
}

function getValidatedDraft() {
    const latestVersion = latestVersionInput.value.trim();
    const minimumVersion = minimumVersionInput.value.trim();
    const title = titleInput.value.trim();
    const message = messageInput.value.trim();

    formError.textContent = "";

    const parsedLatest = parseVersion(latestVersion);
    if (!parsedLatest) {
        formError.textContent = "최신 버전은 1.0.0과 같은 세 자리 숫자 형식으로 입력해 주세요.";
        latestVersionInput.focus();
        return null;
    }

    const parsedMinimum = parseVersion(minimumVersion);
    if (!parsedMinimum) {
        formError.textContent = "최소 지원 버전은 1.0.0과 같은 세 자리 숫자 형식으로 입력해 주세요.";
        minimumVersionInput.focus();
        return null;
    }

    if (compareVersions(parsedMinimum, parsedLatest) > 0) {
        formError.textContent = "최소 지원 버전은 최신 버전보다 높을 수 없습니다.";
        minimumVersionInput.focus();
        return null;
    }

    if (!title) {
        formError.textContent = "제목을 입력해 주세요.";
        titleInput.focus();
        return null;
    }

    if (!message) {
        formError.textContent = "메시지를 입력해 주세요.";
        messageInput.focus();
        return null;
    }

    return { latestVersion, minimumVersion, title, message };
}

// MARK: - 데이터 표시
function renderLive(data) {
    liveLatestVersion.textContent = textOrDash(data?.latestVersion);
    liveMinimumVersion.textContent = textOrDash(data?.minimumVersion);
    liveTitle.textContent = textOrDash(data?.title);
    liveMessage.textContent = textOrDash(data?.message);
    liveUpdatedAt.textContent = formatUpdatedAt(data?.updatedAt);
}

function renderDraft(data) {
    latestVersionInput.value = data?.latestVersion ?? "";
    minimumVersionInput.value = data?.minimumVersion ?? "";
    titleInput.value = data?.title ?? "";
    messageInput.value = data?.message ?? "";
    draftUpdatedAt.textContent = formatUpdatedAt(data?.updatedAt);
}

// MARK: - Firestore 조회
async function loadVersionConfig() {
    clearStatus();

    const liveRef = doc(db, LIVE_COLLECTION, DOCUMENT_ID);
    const draftRef = doc(db, DRAFT_COLLECTION, DOCUMENT_ID);
    const [liveSnapshot, draftSnapshot] = await Promise.all([
        getDoc(liveRef),
        getDoc(draftRef)
    ]);

    liveConfig = liveSnapshot.exists() ? liveSnapshot.data() : null;
    renderLive(liveConfig);

    draftDocumentExists = draftSnapshot.exists();

    if (draftDocumentExists) {
        savedDraftConfig = draftSnapshot.data();
        renderDraft(savedDraftConfig);
    } else if (liveSnapshot.exists()) {
        // 초안 문서가 없으면 운영 값을 입력란에 복사해 새 초안을 시작합니다.
        savedDraftConfig = null;
        renderDraft(liveConfig);
        showStatus("초안 문서가 없어 운영 버전 값을 불러왔습니다. 초안 저장을 눌러 생성해 주세요.", "info");
    } else {
        savedDraftConfig = null;
        renderDraft(null);
        showStatus("운영 및 초안 버전 문서가 없습니다. 초안 정보를 입력해 주세요.", "info");
    }

    updateActionState();
}

// MARK: - 초안 저장
versionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isWorking || !hasUnsavedChanges()) return;

    const draft = getValidatedDraft();
    if (!draft) return;

    clearStatus();
    setWorking(true, "save");

    try {
        await setDoc(doc(db, DRAFT_COLLECTION, DOCUMENT_ID), {
            ...draft,
            updatedAt: serverTimestamp()
        });

        const localUpdatedAt = new Date();
        savedDraftConfig = { ...draft, updatedAt: localUpdatedAt };
        draftDocumentExists = true;
        renderDraft(savedDraftConfig);
        showStatus("초안이 저장되었습니다.");
    } catch (error) {
        console.error("버전 초안 저장 실패:", error);
        formError.textContent = error.message || "초안을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    } finally {
        setWorking(false);
    }
});

// MARK: - 게시 확인 모달
function openPublishModal() {
    const draft = getValidatedDraft();
    if (!draft) return;

    const noChanges = configsEqual(draft, liveConfig);

    modalLiveLatestVersion.textContent = textOrDash(liveConfig?.latestVersion);
    modalDraftLatestVersion.textContent = textOrDash(draft.latestVersion);
    modalLiveMinimumVersion.textContent = textOrDash(liveConfig?.minimumVersion);
    modalDraftMinimumVersion.textContent = textOrDash(draft.minimumVersion);
    modalNoChanges.hidden = !noChanges;
    confirmPublishButton.disabled = noChanges;

    publishModal.hidden = false;
    publishModal.removeAttribute("aria-hidden");
    document.body.classList.add("has-version-modal");
    cancelPublishButton.focus();
}

function closePublishModal(force = false) {
    if (isWorking && !force) return;

    publishModal.hidden = true;
    publishModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-version-modal");
    publishButton.focus();
}

publishButton.addEventListener("click", () => {
    if (isWorking || !hasPublishChanges()) return;
    openPublishModal();
});

cancelPublishButton.addEventListener("click", closePublishModal);

publishModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-close]")) {
        closePublishModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !publishModal.hidden) {
        closePublishModal();
    }
});

// MARK: - 운영 버전 게시
confirmPublishButton.addEventListener("click", async () => {
    if (isWorking) return;

    const draft = getValidatedDraft();
    if (!draft) {
        closePublishModal();
        return;
    }

    if (configsEqual(draft, liveConfig)) {
        modalNoChanges.hidden = false;
        confirmPublishButton.disabled = true;
        return;
    }

    clearStatus();
    setWorking(true, "publish");

    try {
        // 현재 Draft를 초안과 운영 문서에 함께 저장합니다.
        await Promise.all([
            setDoc(doc(db, DRAFT_COLLECTION, DOCUMENT_ID), {
                ...draft,
                updatedAt: serverTimestamp()
            }),
            setDoc(doc(db, LIVE_COLLECTION, DOCUMENT_ID), {
                ...draft,
                updatedAt: serverTimestamp()
            })
        ]);

        // 게시 성공 후 재조회하지 않고 현재 Draft 값으로 Live UI를 즉시 갱신합니다.
        const localUpdatedAt = new Date();
        liveConfig = { ...draft, updatedAt: localUpdatedAt };
        savedDraftConfig = { ...draft, updatedAt: localUpdatedAt };
        draftDocumentExists = true;
        renderLive(liveConfig);
        renderDraft(savedDraftConfig);

        // 게시 완료 상태를 먼저 반영한 뒤 모달을 닫고 완료 알림을 표시합니다.
        setWorking(false);
        closePublishModal(true);
        showToast("운영 버전이 게시되었습니다.");
    } catch (error) {
        console.error("운영 버전 게시 실패:", error);
        formError.textContent = error.message || "게시하지 못했습니다. 잠시 후 다시 시도해 주세요.";

        // 실패 시에는 모달을 유지하고 게시 버튼을 다시 사용할 수 있게 합니다.
        setWorking(false);
    }
});

// MARK: - 입력 변경 감지
draftInputs.forEach((input) => {
    input.addEventListener("input", () => {
        formError.textContent = "";
        clearStatus();
        updateActionState();
    });
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

        try {
            await loadVersionConfig();
        } catch (error) {
            console.error("앱 버전 정보 조회 실패:", error);
            showStatus("버전 정보를 불러오지 못했습니다. Firestore 권한과 문서 경로를 확인해 주세요.", "error");
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
