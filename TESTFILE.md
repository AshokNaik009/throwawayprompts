---
name: pkg-test-gen
description: Generate comprehensive test suites for NPM packages — especially wrapper libraries around Express, LangChain, Axios, and similar. Use when user asks to "write tests", "test this package", "add test coverage", "generate unit tests", or mentions testing a library, SDK, wrapper, or module.
---

Generate production-grade test cases for this NPM package. Before writing any test code, explore the codebase to understand the package's public API surface, internal architecture, and what it wraps.

This is a **library** — not a web app. There are no pages, no UI, no browser flows. Think like a package consumer who will `npm install` this and call its API.

## Discovery phase

1. Read `package.json` — identify the entry point (`main`, `module`, `exports`), peer dependencies, the wrapped library (Express, Axios, LangChain, etc.), and the existing test runner if any.
2. Read the `src/` or `lib/` directory tree. Map the public API: every exported function, class, factory, middleware, decorator, hook, or config builder.
3. Read existing tests in `test/`, `__tests__/`, or `*.test.ts` files. Understand what's already covered — never duplicate.
4. Read `README.md` and any `examples/` directory. These show the author's intended usage and are your primary source for happy-path test scenarios.
5. Identify the wrapper boundary: what does this package add, transform, or hide compared to using the underlying library directly? That boundary is where most bugs live.

Do not ask the user to explain the package if the codebase is available — read it yourself.

## Test runner setup

- Default to **Vitest** unless the project already uses Jest, Mocha, or another runner.
- If no test config exists, scaffold a minimal `vitest.config.ts` with proper TypeScript and path resolution.
- Use the project's existing assertion style. If none exists, use Vitest's built-in `expect`.

## Test design rules

For every unit you test, follow these rules without exception:

- **Test the public API, not internals.** Import the package the way a consumer would. If it's not exported, don't test it directly — test it through the export that uses it.
- **Mock the wrapped library, not your own code.** When testing an Axios wrapper, mock Axios. When testing an Express middleware wrapper, mock `req`, `res`, `next`. When testing a LangChain wrapper, mock the LLM/chain/tool. Never mock the package's own functions to make tests pass.
- **One behavior per test.** The test name should be a sentence that describes a single expected behavior. If it contains "and", split it.
- **Arrange-Act-Assert.** Every test must have these three sections, visually separated. No test should be a wall of interleaved setup and assertions.
- **No snapshot tests for logic.** Snapshots are only acceptable for serialized output formats (JSON schemas, error message shapes). Never snapshot a function's return value as a substitute for asserting specific fields.
- **Type-level tests where applicable.** If the package exposes complex TypeScript generics, add `expectTypeOf` assertions or `// @ts-expect-error` comments that fail if types break.

## Mocking patterns by wrapped library

### Express / Fastify / Koa wrappers
- Create lightweight `req`/`res`/`next` mocks. Use `node:events` for `req` if streaming is involved.
- Use `supertest` with a real mini-app for integration tests that need the full middleware chain.
- Test middleware ordering: does your wrapper register handlers in the right sequence?

### Axios / Fetch / Got wrappers
- Mock at the adapter level: `vi.mock('axios')` or use `msw` (Mock Service Worker) for HTTP-level interception.
- Test request construction separately from response handling: does the wrapper set the right headers, base URL, timeouts, retries?
- Test interceptor behavior: are request/response transforms applied in order?

### LangChain / AI SDK wrappers
- Mock the model/LLM call. Never hit a real API in tests.
- Test prompt construction: given these inputs, does the wrapper build the right prompt/messages array?
- Test output parsing: given this raw LLM response, does the wrapper extract and transform the result correctly?
- Test streaming if supported: mock a readable stream and assert chunks are processed correctly.
- Test tool/function-calling schemas: does the wrapper register tools with the right shapes?
- Test fallback/retry logic: simulate rate limits (429) and model errors.

### Database / ORM wrappers (Prisma, Drizzle, Mongoose)
- Use an in-memory database or test containers, not mocks, for integration tests.
- For unit tests, mock the query builder or client.
- Test transaction behavior: rollback on error, commit on success.

### Generic patterns (any wrapper)
- Test config merging: user config + defaults = correct final config.
- Test that passthrough options reach the underlying library unchanged.
- Test that wrapped errors contain the original error in the `cause` chain.

## Coverage priorities

Generate tests in this order:

1. **Public API contract** — every exported function/class called with valid arguments returns the expected result. This is the minimum bar. If these fail, the package is broken.
2. **Configuration & defaults** — calling with no options uses sane defaults. Partial options merge correctly with defaults. Invalid options throw descriptive errors at construction time, not at runtime.
3. **Wrapper boundary** — the arguments your package passes to the underlying library are correct. Mock the underlying library and assert it was called with the right parameters, headers, options, etc. This catches silent regressions where your wrapper silently drops or mangles a user's config.
4. **Error propagation** — when the wrapped library throws, your package surfaces the error correctly. Test: wrapped errors have the right type/class, error messages are helpful (not swallowed or generic), error codes/status codes are preserved, async rejections are not silently eaten.
5. **Input validation & guards** — required fields, type coercion, null/undefined handling, empty strings, arrays vs single values, numbers at boundaries (0, -1, Infinity, NaN).
6. **Lifecycle & cleanup** — initialization and teardown work correctly. Connections are opened/closed. Event listeners are removed. Timers are cleared. Test that calling `.destroy()` or `.close()` twice doesn't throw.
7. **Concurrency & async behavior** — parallel calls don't corrupt shared state. Race conditions in caches or connection pools. Retry logic under concurrent load. Streaming backpressure.
8. **Interop & environment** — ESM and CJS imports both work (if dual-published). Node.js version boundaries. Optional peer dependencies missing gracefully. Environment variables are read correctly.

## Output structure

Organize generated tests to mirror the source:

```
tests/
  unit/
    [module-name].test.ts       # One test file per source module
  integration/
    [feature-name].test.ts      # Tests that spin up real servers, DBs, etc.
  helpers/
    mock-server.ts              # Shared test utilities
    fixtures.ts                 # Reusable test data factories
```

Each test file must:
- Import from the package entry point, not relative source paths, unless testing internals intentionally.
- Have a top-level `describe` matching the module or class name.
- Name each test as a behavior sentence: `it('throws TypeError when baseURL is not a string', ...)`.
- Group related tests in nested `describe` blocks by method or scenario.

## What NOT to do

- Do not test the wrapped library's behavior. If Axios handles retries correctly, don't re-test that. Test that YOUR wrapper passes the retry config correctly to Axios.
- Do not mock everything. If a function is pure (input → output, no side effects), call it for real.
- Do not use `any` to silence TypeScript in tests. Tests should enforce the same types the consumer sees.
- Do not write integration tests that require real API keys, running databases, or network access unless behind a flag (`--integration`). Unit tests must run offline and fast.
- Do not generate a single 500-line test file. Split by module.
- Do not write tests that only assert `toBeDefined()` or `not.toBeNull()`. Assert the actual value.
- Do not `try/catch` inside tests to check if something throws. Use `expect(() => fn()).toThrow()` or `expect(promise).rejects.toThrow()`.

## After generating

1. Run the tests with `npx vitest run` (or the project's test command) and fix any failures before presenting them.
2. Run with coverage (`--coverage`) and report which public API surfaces are still uncovered.
3. If tests fail due to actual package bugs (not test bugs), note them clearly as discovered issues with the expected vs actual behavior.
4. If no CI config exists, offer to add a GitHub Actions workflow that runs tests on push and PR.
