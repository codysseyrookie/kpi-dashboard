# KPI Desk 샘플 앱

월·부서별 목표와 실적을 비교하는 정적 KPI 대시보드입니다. 기존 `02_실습자료`는 유지하고 앱을 `실습앱`에 별도로 만들었습니다.

## 실행 방법

HTTP 서버로 열어야 Supabase 로그인 세션이 안정적으로 유지됩니다. Supabase 설정이 없을 때 표시되는 기본 샘플은 2026-09/2026-10의 영업A·B·C 6건이며, 전체 목표 60,000,000원·실적 59,400,000원·달성률 99%입니다. 이 모드의 실적은 브라우저 `localStorage`에만 저장됩니다.

`index.html`에서 헤더의 테마 선택기를 사용하면 Meadow(그린), Sunrise(산호색), Ink & Blue(코발트) 디자인을 한 페이지에서 전환할 수 있습니다. 선택한 테마는 브라우저에 기억됩니다. 개별 시안 미리보기는 `02-sunrise.html`과 `03-ink-blue.html`을 열면 됩니다. 세 디자인은 같은 샘플 데이터와 동작 코드를 사용합니다.

## 파일 역할

- `index.html`: 페이지 구조, 요약, 필터, 테마 선택기, 근거표, 입력 대화상자
- `style.css`: 데스크톱·모바일 화면
- `app.js`: 화면 동작과 필터·합계 표시
- `data/repository.js`: Supabase 사용자별 읽기·저장 또는 설정 미완료 시 브라우저 샘플 adapter
- `02-sunrise.html`: 주황·산호색의 밝은 Sunrise 디자인
- `03-ink-blue.html`: 코발트 블루와 네이비 중심의 Ink & Blue 디자인
- `styles/shared.css`: 공통 벡터·플랫 스타일, Pretendard·Material Symbols 설정
- `styles/01-meadow.css`, `styles/02-sunrise.css`, `styles/03-ink-blue.css`: 각 버전별 색상과 도형
- `styles/switchable-themes.css`: 한 페이지 테마 선택기가 사용하는 세 가지 테마
- `styles/theme-polish.css`: 테마 선택기 스타일

## 계산과 입력 규칙

- 달성률은 선택 결과의 실적 합계 ÷ 목표 합계 × 100입니다. 행별 달성률의 평균을 사용하지 않습니다.
- 합산 목표가 0원이면 `목표 미설정`을 표시합니다.
- 월은 유효한 `YYYY-MM`, 부서명은 앞뒤 공백을 정리한 1~80자, 금액은 0 이상의 안전한 정수(원)로 검사합니다.
- 같은 월과 부서의 중복 입력은 거부합니다. 빈 결과와 데이터 읽기 오류도 구분합니다.

## 글꼴과 아이콘

Pretendard와 Google Material Symbols Rounded를 Google Fonts에서 불러옵니다. 따라서 두 리소스는 온라인 상태에서 표시되며, 오프라인에서는 시스템 한글 글꼴과 아이콘 텍스트 대체값을 사용합니다. Supabase JS v2는 공식 CDN에서 불러옵니다.

## Supabase 연결 및 실행

`config.js`의 기존 `supabaseUrl`, `supabasePublishableKey` 설정을 읽고 공식 Supabase JS v2 CDN을 사용합니다. 로그인은 이미 등록된 이메일·비밀번호 계정으로 합니다. 별도 가입은 만들지 않았습니다. 세션은 Supabase 클라이언트의 브라우저 저장소에 유지되어 새로고침 뒤 복원됩니다. DB 모드에서 조회와 저장은 로그인 사용자 ID로 제한하고, DB RLS 정책도 함께 적용되어야 합니다.

앱 폴더에서 `python -m http.server 8000`을 실행한 뒤 `http://localhost:8000/`을 여세요. 브라우저의 `file://`로 열면 로그인 세션 저장이 제한될 수 있습니다. Python이 없는 환경에서는 기존 정적 서버를 사용하세요.

제공된 `02_실습자료/schema.sql`은 읽어 앱과 비교했지만 실제 DB에서는 실행하지 않았습니다. 새 교육용 DB에 아직 표가 없을 때만, 소유자와 함께 SQL을 검토하고 한 번 실행해야 합니다. 테이블이 이미 있거나 정책 중복 오류가 있으면 재실행하거나 삭제하지 마세요. SQL 적용 전에는 저장이 성공하지 않으며 화면이 오류를 표시합니다.

URL이나 publishable key를 인식하지 못하면 샘플 모드로 실행하고, DB 미연결 경고를 표시합니다. 샘플 입력은 브라우저에만 저장하며 Supabase로 전송하지 않습니다. Secret 또는 service_role 키를 브라우저 설정에 넣지 마세요. 기존 `config.js`는 덮어쓰거나 값을 출력하지 않았습니다.

## 공개 배포

GitHub Pages에 공개하기로 선택한 경우 `실습앱` 안의 화면 파일을 대상에 포함할 수 있습니다. 외부 업로드, 공개 배포, Git 커밋은 이번 작업에서 하지 않았습니다.
