# With Mary Official Website v3

GitHub Pages에서 바로 사용할 수 있는 정적 홈페이지입니다.

## 확인 방법
`index.html`을 브라우저에서 열어 확인합니다.

## 스크린샷 자산 구조
스크린샷은 `assets/screenshots/{language}/` 아래에서 언어별 `ko`, `en`, `fr` 구조를 사용합니다.

- `iphone/original`: iPhone 원본 스크린샷
- `iphone/promo`: iPhone 프로모션용 스크린샷
- `watch/original`: Apple Watch 원본 스크린샷(App Store Connect 보관용 자산 포함 가능)
- `watch/promo`: Apple Watch 프로모션용 스크린샷

웹에서 현재 사용하지 않는 `original` 또는 `promo` 파일도 App Store Connect나 디자인 작업용 보관 자산일 수 있습니다.

## 출시 전에 교체할 항목
- App Store 링크
- 공식 문의 이메일
- 실제 앱 스크린샷
- Open Graph 공유 이미지
- Privacy Policy와 Terms 최종 검토

## GitHub Pages
저장소의 Settings → Pages → Deploy from a branch → main / root를 선택합니다.

## 다국어 공용 리소스 경로
향후 `/en/`, `/fr/`, `/it/` 아래에 언어별 페이지를 추가할 때 공용 리소스는 사이트 루트 기준 절대경로를 사용합니다.

- CSS: `/css/style.css`
- JavaScript: `/js/main.js`
- 이미지 및 아이콘: `/assets/...`

기존 루트 한국어 페이지의 상대경로는 현재 동작을 유지하기 위해 그대로 둡니다.

## Sprint 8
- Hero 타이포그래피와 여백 조정
- 3중 앱 화면 스테이지 적용
- 오늘의 말씀 카드 추가
- 오로라와 브랜드 워터마크 절제
- 데스크톱 미세 포인터 반응 적용
