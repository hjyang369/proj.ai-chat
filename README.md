# WeeAI-like Multi-LLM Chat (Monorepo)

Next.js + NestJS 데모 모노레포입니다. WeeAI의 멀티 모델 채팅 플로우를 로컬에서 시연할 수 있도록 BFF 프록시와 Mock 모드를 제공합니다.

English summary below.

## 구성
- apps/web: Next.js (App Router, TypeScript, Tailwind CSS, Zustand, Axios)
- apps/api: NestJS (TypeScript, Axios) — BFF 프록시 + Mock SSE
- 패키지 매니저: npm workspaces

## 빠른 시작
1) 의존성 설치
```bash
npm install
```
2) 환경변수 템플릿 복사
```bash
cp .env.example .env
# 기본값: MOCK_WEEAI=true (업스트림 없이 동작)
```
3) 개발 서버 실행
```bash
# 두 서버 동시 실행
npm run dev
# 또는 개별 실행
npm run dev:api
npm run dev:web
```
4) 브라우저에서 열기
- Web: http://127.0.0.1:${WEB_PORT:-43219}
- API(BFF): http://127.0.0.1:${API_PORT:-43210}/bff/health

## 환경 변수
- WEB_PORT: 웹 포트 (기본 43219)
- API_PORT: API 포트 (기본 43210)
- WEEAI_BASE: 업스트림 WeeAI 서버 (기본 https://weeai.kr)
- WEEAI_ACCESS_TOKEN: Bearer 토큰 (실제 비밀은 커밋 금지)
- WEEAI_MB_NO: credit/check 등에 사용할 멤버 번호(옵션, 기본 1)
- MOCK_WEEAI: true면 업스트림 호출 없이 Mock SSE로 동작

주의: WeeAI 실제 서버는 IP 허용 목록 정책이 있을 수 있습니다. 로컬 개발에서는 MOCK_WEEAI=true를 권장합니다.

## 기능
- 로그인 화면: 액세스 토큰(선택) 저장 (localStorage)
- 채팅 화면:
  - 1~3개 모델 선택 토글
  - 메시지 전송 시 병렬 스트리밍 응답 렌더링(마크다운)
- BFF:
  - /bff/chat/init: credit/check → job → conversation → user message → analyze/complexity (Mock 모드에선 간소화)
  - /bff/chat/stream: 모델별 SSE 스트리밍 (Mock/Live 공용)
  - /bff/models: 모델 목록 제공
  - /bff/health: 상태 점검

## 타입
- 핵심 요청/응답 타입은 `apps/api/src/bff/bff.types.ts` 참고
- 첨부된 OpenAPI(`uploads/openapi_*.json`) 기반의 구조를 반영

## 실제 업스트림과 연동
- `.env`에 `MOCK_WEEAI=false` 설정
- `WEEAI_ACCESS_TOKEN`에 유효한 Bearer 토큰을 주입
- IP 허용 목록 이슈가 있을 수 있으므로 내부망/허용 IP에서 테스트 필요

---

## English (short)

This monorepo demonstrates a WeeAI-like multi-LLM chat:
- Frontend: Next.js (TypeScript, Tailwind, Zustand, Axios)
- Backend: NestJS (TypeScript, Axios) with a BFF proxy to `https://weeai.kr` and a local mock mode.

Run locally:
```bash
npm install
cp .env.example .env   # default MOCK_WEEAI=true (no upstream required)
npm run dev            # starts API on 43210 and Web on 43219
```

Environment:
- `MOCK_WEEAI=true` to use mock SSE without upstream
- `WEEAI_ACCESS_TOKEN` if you want to try the real WeeAI API (note: IP allowlist may apply)

Happy path:
- Open the app, select 1–3 models, send a message, see parallel streaming markdown answers.

# New repo

This repo was created by a Cursor cloud agent.
