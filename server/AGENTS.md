# Module Context

Bun 런타임 위에서 도는 AI 프록시 서버. API 키를 보관하고, 프롬프트를 Anthropic/Google에 전달한 뒤 응답을 `react-live`(src/components/LivePreview.tsx)가 바로 실행 가능한 JS 코드 문자열로 정규화해 프론트엔드에 돌려준다.

## Tech Stack & Constraints

- 단일 프로세스 `Bun.serve` (server/index.ts:138), 포트 3002 고정. Vite dev 서버의 `/api` 프록시(vite.config.ts:9-14)가 이 포트를 하드코딩해서 가리키므로, 포트를 바꾸면 두 파일을 함께 수정해야 한다.
- 외부 API 호출은 `fetch`만 사용한다(index.ts:69,101) — axios 등 별도 HTTP 클라이언트를 추가하지 않는다.

## Implementation Patterns

- 부수효과 없는 텍스트 정규화 로직(`stripCodeFences`, `ensureRenderCall`)은 generator.ts에 순수 함수로 분리되어 있다. index.ts는 이 함수들을 조합만 하고 직접 문자열 파싱 로직을 갖지 않는다.
- 여러 후보 모델을 순서대로 시도하는 로직이 필요하면 fallback.ts의 제네릭 `withModelFallback`을 재사용한다(index.ts:135) — provider별로 재구현하지 않는다.

## Testing Strategy

- 테스트 명령: `bun run test` (vitest run; `server/**/*.test.ts` 포함, vite.config.ts:20)
- generator.test.ts / fallback.test.ts처럼, 부수효과 없는 순수 함수만 유닛 테스트 대상이다. index.ts의 `Bun.serve` 핸들러 자체는 테스트되지 않으므로, 새 로직은 가능하면 순수 함수로 뽑아 generator.ts/fallback.ts에 추가하고 테스트를 붙인다.

## Local Golden Rules

- **Provider 비대칭:** `callGoogle`은 `GOOGLE_MODELS` 배열 전체를 `withModelFallback`으로 순차 시도하지만(index.ts:5,134-136), `callAnthropic`은 단일 모델을 하드코딩해 폴백이 없다(index.ts:68-96). Anthropic 쪽에 재시도 로직을 추가할 때는 새로 만들지 말고 fallback.ts의 기존 헬퍼를 그대로 쓴다.
- **보안 경계:** API 키는 `resolveApiKey`(index.ts:64-66) 안에서만 조합되고, 응답 바디·에러 메시지에는 절대 포함하지 않는다. `/api/config`가 노출하는 것은 boolean뿐이다(index.ts:147-157).
- **하드 제약 (finishReason):** Google 경로는 `finishReason === 'MAX_TOKENS'`를 명시적으로 감지해 사용자에게 안내 메시지를 반환한다(index.ts:123-125). Anthropic 경로에는 이런 잘림 감지가 없다 — Anthropic 응답 처리 로직을 바꿀 때 이 차이를 인지할 것.
