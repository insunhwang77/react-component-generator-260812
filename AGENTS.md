# AGENTS.md

## Operational Commands

- Package manager: `bun` only (package.json has no npm/yarn lockfile semantics; `bun.lock` is the lockfile). Do not run `npm install` / `yarn` / `pnpm`.
- Install: `bun install`
- Dev (API server + Vite together): `bun run dev` (package.json:7 — runs `bun run server` and `vite` concurrently)
- API server only: `bun run server` (package.json:8 — `bun --watch run server/index.ts`, port 3002)
- Build: `bun run build`
- Test (all): `bun run test` — vitest run, includes `src/**/*.test.{ts,tsx}` and `server/**/*.test.ts` (vite.config.ts:20)
- Test watch: `bun run test:watch`
- Lint: `bun run lint`

## Golden Rules

- **Asymmetry — provider fallback.** `callGoogle` tries a list of models (`GOOGLE_MODELS`, server/index.ts:5) through `withModelFallback` (server/fallback.ts, used at server/index.ts:134-136); `callAnthropic` (server/index.ts:68-96) hardcodes a single model with no fallback. Don't assume the two provider paths are symmetric — check both before changing shared behavior.
- **Hard constraint — generated code has no module system.** The system prompt forbids `import` statements and TypeScript syntax in generated components (server/index.ts:10,20). This is required because `LiveProvider ... noInline` (src/components/LivePreview.tsx:14) evaluates the returned code string directly with only a global `React` in scope — there is no bundler or type stripping at runtime. Relaxing this prompt rule breaks the live preview.
- **Double defense — don't trust the model, verify in code too.** The system prompt tells the model not to wrap output in markdown fences and to always end with `render(...)` (server/index.ts:16,49), and the code re-checks both independently: `stripCodeFences` strips any fences anyway, and `ensureRenderCall` injects a `render(...)` call if one is missing (server/generator.ts:5-24). Keep both layers even if the prompt already covers it.
- **Security boundary — API keys never leave the server.** `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` are read from `process.env` only inside server/index.ts (lines 59-66) and combined with any client-supplied key via `resolveApiKey`. The only key-related data sent to the client is a boolean map (`GET /api/config`, index.ts:147-157: `envKeys: { anthropic: bool, google: bool }`). Never add a response field, log line, or error message that echoes an actual key value.
- **Test boundary — the request handler itself is untested.** `server/generator.ts` and `server/fallback.ts` are pure functions and have matching `*.test.ts` files; `server/index.ts`, which owns API-key resolution and the `Bun.serve` request handling, has no test file. New branching logic in index.ts has no safety net — prefer extracting it into a pure, tested function in generator.ts/fallback.ts over growing index.ts directly.

## Project Context

React 컴포넌트를 프롬프트로 생성하고 `react-live`로 즉시 미리보는 도구. Anthropic Claude와 Google Gemini 중 선택해 호출하는 Bun 프록시 서버(server/)와 Vite 기반 React 프론트엔드(src/)로 구성된다.

Tech stack: React 19, TypeScript, Vite, Bun, react-live, Vitest. 설치/실행 방법과 주요 기능은 README.md 참고.

## Standards & References

- Lint config: eslint.config.js — `js.configs.recommended` + `typescript-eslint recommended` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. Run `bun run lint` before considering frontend/server TS changes done.
- Commit messages in this repo follow Conventional Commits prefixes in Korean (`feat:`, `fix:`, `chore:` — see `git log`). Use the `commit` skill (.claude/skills/commit) rather than running `git commit` freehand.
- **Maintenance Policy:** if code changes make any Golden Rule above inaccurate, update this file in the same change rather than leaving it stale.
