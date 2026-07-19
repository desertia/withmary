// MARK: =====================================================
// MARK: 관리자 공통 설정
// ============================================================

export const ADMIN_EMAILS = [
    "desertia.ils@gmail.com"
];

// MARK: - 관리자 이메일 확인
export function isAdminEmail(email) {
    if (!email) {
        return false;
    }

    return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// MARK: - Firebase 로그인 오류 문구 변환
export function loginErrorMessage(errorCode) {
    switch (errorCode) {
    case "auth/invalid-email":
        return "이메일 주소 형식이 올바르지 않습니다.";
    case "auth/missing-password":
        return "비밀번호를 입력해 주세요.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
        return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/too-many-requests":
        return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/network-request-failed":
        return "네트워크 연결을 확인해 주세요.";
    default:
        return "로그인 중 오류가 발생했습니다. 다시 시도해 주세요.";
    }
}
