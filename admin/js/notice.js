// MARK: =====================================================
// MARK: 새 공지 작성 화면
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    collection,
    deleteField,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { isAdminEmail } from "./common.js";
import {
    collectLocalizations,
    CONTENT_LANGUAGES,
    findIncompleteLocalization,
    findMissingTargetLanguageContent,
    populateLocalizationEditor,
    setupLocalizationEditor,
    setupTargetLanguageSelector
} from "./content-localizations.js";

// MARK: - 화면 요소
const pageLoading = document.getElementById("pageLoading");
const adminContent = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const logoutButton = document.getElementById("logoutButton");
const documentTitle = document.getElementById("documentTitle");
const pageTitle = document.getElementById("pageTitle");
const pageDescription = document.getElementById("pageDescription");
const noticeForm = document.getElementById("noticeForm");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const localizationEditor = setupLocalizationEditor(
    document.getElementById("noticeLocalizationEditor"),
    {
        prefix: "notice",
        fields: [
            {
                name: "title",
                type: "input",
                maxLength: 200,
                placeholders: {
                    en: "Enter the notice title.",
                    fr: "Saisissez le titre de l’avis.",
                    es: "Introduce el título del aviso."
                }
            },
            {
                name: "body",
                type: "textarea",
                rows: 10,
                placeholders: {
                    en: "Enter the notice content.",
                    fr: "Saisissez le contenu de l’avis.",
                    es: "Introduce el contenido del aviso."
                }
            }
        ]
    }
);
const targetLanguageSelector = setupTargetLanguageSelector(
    document.getElementById("targetLanguageOptions")
);
targetLanguageSelector.setSelected(null);
const formError = document.getElementById("formError");
const cancelButton = document.getElementById("cancelButton");
const saveButton = document.getElementById("saveButton");

let isSaving = false;
const documentId = new URLSearchParams(window.location.search).get("id")?.trim() || null;
const isEditMode = documentId !== null;
let existingVersion = null;

// MARK: - 화면 상태 전환
function showAdminContent(user) {
    adminEmail.textContent = user.email ?? "관리자";
    pageLoading.hidden = true;
    adminContent.hidden = false;
    titleInput.focus();
}

function applyEditorMode() {
    if (!isEditMode) {
        return;
    }

    documentTitle.textContent = "공지 수정 | With Mary Admin";
    pageTitle.textContent = "공지 수정";
    pageDescription.textContent = "기존 공지 내용을 확인하고 수정합니다.";
    saveButton.textContent = "수정 저장";
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
    localizationEditor.inputs.forEach((input) => { input.disabled = saving; });
    targetLanguageSelector.inputs.forEach((input) => { input.disabled = saving; });
    saveButton.textContent = saving
        ? (isEditMode ? "수정 저장 중..." : "저장 중...")
        : (isEditMode ? "수정 저장" : "저장");
}

// MARK: - 기존 공지 조회
async function loadNoticeForEditing() {
    const noticeSnapshot = await getDoc(doc(db, "dev_notices", documentId));

    if (!noticeSnapshot.exists()) {
        alert("공지를 찾을 수 없습니다.");
        window.location.replace("notices.html");
        return false;
    }

    const notice = noticeSnapshot.data();
    existingVersion = notice.version;

    populateLocalizationEditor(localizationEditor, notice);

    targetLanguageSelector.setSelected(notice.targetLanguages);

    return true;
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
    const targetLanguages = targetLanguageSelector.selectedCodes();

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

    const incompleteLocalization = findIncompleteLocalization(localizationEditor);
    if (incompleteLocalization) {
        const { language, missingInput } = incompleteLocalization;
        showFormError(`${language.name} 번역은 제목과 본문을 모두 입력하거나 모두 비워 주세요.`);
        localizationEditor.activate(language.code);
        missingInput.focus();
        return;
    }

    if (targetLanguages.length === 0) {
        showFormError("노출 언어를 하나 이상 선택해 주세요.");
        targetLanguageSelector.inputs[0].focus();
        return;
    }

    const missingTargetContent = findMissingTargetLanguageContent(
        localizationEditor,
        targetLanguages
    );
    if (missingTargetContent) {
        const { language, missingInput } = missingTargetContent;
        showFormError(`${language.name} 노출을 선택하려면 제목과 본문을 모두 입력해 주세요.`);
        localizationEditor.activate(language.code);
        missingInput.focus();
        return;
    }

    setSaving(true);

    try {
        const version = isEditMode ? existingVersion : await getNextVersion();
        const noticeDocumentId = isEditMode ? documentId : String(version);
        const noticeDocument = doc(db, "dev_notices", noticeDocumentId);
        const localizations = collectLocalizations(localizationEditor);

        const noticeData = {
            title,
            body,
            targetLanguages,
            localizations,
            updatedAt: serverTimestamp(),
            version
        };

        if (isEditMode) {
            // 수정 시 기존 isEnabled 필드는 변경하지 않습니다.
            const localizationUpdates = {};
            CONTENT_LANGUAGES.forEach((language) => {
                localizationUpdates[`localizations.${language.code}`] =
                    localizations[language.code] ?? deleteField();
            });

            await updateDoc(noticeDocument, {
                title,
                body,
                targetLanguages,
                updatedAt: noticeData.updatedAt,
                version,
                ...localizationUpdates
            });
        } else {
            await setDoc(noticeDocument, {
                ...noticeData,
                isEnabled: true
            });
        }

        alert(isEditMode ? "수정되었습니다." : "저장되었습니다.");
        window.location.replace("notices.html");
    } catch (error) {
        console.error(isEditMode ? "dev_notices 수정 실패:" : "dev_notices 저장 실패:", error);
        showFormError(isEditMode
            ? "공지를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "공지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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

        applyEditorMode();

        try {
            if (isEditMode) {
                const noticeExists = await loadNoticeForEditing();
                if (!noticeExists) {
                    return;
                }
            }

            showAdminContent(user);
        } catch (error) {
            console.error("dev_notices 공지 조회 실패:", error);
            showLoadingMessage("공지 내용을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
