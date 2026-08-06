Here's the blocker list, tiered by how hard each one hits. Sources annotated; effort sizing is my judgment, not from any doc.

## Tier 1 — no equivalent exists in deepagents (you build it or drop it)

| # | Claude Agent SDK feature | Why it blocks | Source |
|---|---|---|---|
| 1 | **`WebSearch` / `WebFetch`** as built-in tools | deepagents ships zero web tools. You wire your own search provider + fetcher, including retry/rate-limit/robots handling. | [CAS capabilities](https://code.claude.com/docs/en/agent-sdk/overview) vs [DA tool table](https://docs.langchain.com/oss/python/deepagents/overview) |
| 2 | **`AskUserQuestion`** | In-loop user questioning, and it always falls through to the `canUseTool` callback even when an allow rule matches. deepagents has `interrupt_on` for *tool approval*, not for the agent asking a question mid-turn. | [CAS permissions](https://code.claude.com/docs/en/agent-sdk/permissions) |
| 3 | **File checkpointing / rewind** | Sessions persist the conversation, not the filesystem; snapshotting and reverting file changes is a separate feature. deepagents checkpoints *graph state*, not the working tree. If your flow has an undo path, this is a rebuild. | [CAS sessions](https://code.claude.com/docs/en/agent-sdk/sessions) |
| 4 | **Slash commands in the SDK** | You can send `/review src/auth` as a prompt and CAS resolves it from `.claude/commands/`. Built-ins like `/compact` and `/clear` work the same way. deepagents has slash commands only in its CLI, not the library. | [CAS docs index](https://platform.claude.com/docs/en/agent-sdk/permissions) lists "Slash Commands in the SDK" |
| 5 | **Plugins** | Bundles of skills, agents, hooks, and MCP servers loaded by local path. deepagents has skills + `AGENTS.md`, but no bundle format. Every plugin becomes hand-wired middleware + tools. | [CAS overview](https://code.claude.com/docs/en/agent-sdk/overview) |
| 6 | **Bash-aware permission rules** | Rules like `Bash(rm *)` parse the *command*, and a scoped deny pattern blocks matching calls in every mode including bypassPermissions. deepagents permissions are glob rules over **read/write paths only**, and the docs state plainly that permissions do not apply to sandbox backends, which support arbitrary command execution via `execute`. If your safety story is command-level, there is nothing to port to. | [CAS permissions](https://code.claude.com/docs/en/agent-sdk/permissions), [DA overview](https://docs.langchain.com/oss/python/deepagents/overview) |
| 7 | **Cost telemetry per run** | `total_cost_usd`, `num_turns`, `usage` on every `ResultMessage`, plus OpenTelemetry export for tokens and cost. deepagents gives LangSmith traces instead. Any chargeback/budget-cap logic is rewritten. | [Konishi guide](https://hidekazu-konishi.com/entry/claude_agent_sdk_complete_guide.html) |
| 8 | **Session admin APIs** | `listSessions()`, `getSessionMessages()`, rename/tag/delete, and deletion cascading to the sibling subagent transcript directory. LangGraph threads are a different model — no drop-in for any of this. | [DeepWiki, claude-agent-sdk-python](https://deepwiki.com/anthropics/claude-agent-sdk-python/6.1-session-management-and-forking) |
| 9 | **Claude-native capabilities** | Extended thinking, computer use, the memory tool, `NotebookEdit`, `MultiEdit`, tool search. Anthropic ships these to its own SDK first; third-party harnesses follow. | [CAS tools reference](https://code.claude.com/docs/en/tools-reference) |

## Tier 2 — an equivalent exists but the shape differs enough to force a rewrite

| # | Feature | The mismatch |
|---|---|---|
| 10 | **Permission modes** | CAS has six — `default`, `dontAsk`, `acceptEdits`, `bypassPermissions`, `plan`, and `auto` (TypeScript only, a model classifier approving each call) — plus runtime `setPermissionMode()`. deepagents has `interrupt_on` per tool name. Global posture switching has no analogue; you'd encode modes yourself in middleware. |
| 11 | **The permission pipeline** | Fixed order: PreToolUse hook → deny rules → allow rules → ask rules → permission mode → `canUseTool` → PostToolUse hook. Deny-beats-ask-beats-allow precedence is a semantic you must re-implement, not inherit. Note the documented footgun you may be *relying* on: subagents inherit `bypassPermissions`/`acceptEdits`/`auto` from the parent and cannot override them per subagent. |
| 12 | **Hooks → middleware** | CAS exposes ~30 lifecycle events (`PreToolUse`, `PostToolUse`, `PostToolBatch`, `PermissionRequest`, `PreCompact`/`PostCompact`, `SubagentStart/Stop`, `SessionStart/End`, `FileChanged`, `Stop`…). deepagents has **six** middleware hooks: `before_agent`, `before_model`, `wrap_model_call`, `wrap_tool_call`, `after_model`, `after_agent`. Tool-lifecycle hooks map cleanly to `wrap_tool_call`. Compaction, session, subagent-lifecycle and file-watch events have **no hook point at all**. |
| 13 | **`Bash` → `execute`** | Zero-config in CAS. In deepagents `execute` only appears when the backend implements the sandbox protocol; the default in-memory backend has no execution. Confirmed by practitioners: Claude Agent SDK's Bash is zero-config and ready immediately, while Deep Agents' execute requires explicitly choosing a backend. |
| 14 | **Session resume/fork** | CAS: `resume` + `fork_session`, transcripts as `.jsonl` under `~/.claude/projects/<encoded-cwd>/`, with the known trap that a mismatched cwd causes resume to return a fresh session, and cross-host resume needs a SessionStore adapter. deepagents: LangGraph thread IDs + a checkpointer. Better for multi-host, but every session-handling line changes. |
| 15 | **`.claude/` config loading** | CAS auto-loads skills, commands, `CLAUDE.md` and `settings.json` from project and `~/.claude/`, gated by `setting_sources`. deepagents loads skills and `AGENTS.md` explicitly via constructor params. Your `settings.json` permission rules in particular have **no destination**. |
| 16 | **Auth/provider switching** | CAS flips to Bedrock/Vertex with env vars (`CLAUDE_CODE_USE_BEDROCK=1`) and accepts model aliases like `"sonnet"`. deepagents uses LangChain provider strings and model objects. Trivial to change, but it's in every config path. |

## Tier 3 — behavioural drift that won't fail your build but will fail your evals

17. **The system prompt is not the same.** CAS runs Claude Code's harness prompt, tuned and benchmarked against Claude. deepagents has its own, with harness profiles (beta) for per-model tuning. This is the item most teams underestimate — nothing errors, the agent just behaves differently.
18. **Planning became opt-in.** Starting in v0.7 task planning is opt-in only; earlier versions included the middleware by default. If you assume `write_todos` exists, you silently lose it.
19. **Security philosophy is looser by default.** Deep Agents follows a "trust the LLM" model — the agent can do anything its tools allow, and boundaries are enforced at the tool/sandbox level rather than by expecting the model to self-police.
20. **`delete` may not be there in TS.** Python's tool table lists it (`>=0.7`); the JavaScript table omits it.

## What I'd actually do with this

Items 1–9 are the ones that determine whether "lift & shift" is even the right word. If your flow touches **file checkpointing, slash commands, plugins, or bash-level permission rules**, it isn't a migration — it's a port with new subsystems.

The fastest way to size it: grep your codebase for `permissionMode`, `canUseTool`, `hooks:`, `resume`, `fork_session`, `settingSources`, `total_cost_usd`, and any tool name in `allowedTools`. Every hit is one of the rows above. Paste me the results and I'll tell you which tier each falls in.

One caveat on sourcing: several precedence and footgun details above (subagent permission inheritance, `allowed_tools` not constraining `bypassPermissions`) come from a third-party production guide rather than Anthropic's docs. They're consistent with the official permissions page, but verify against your own SDK version before designing around them — that page notes behaviour changed as recently as v2.1.198.
