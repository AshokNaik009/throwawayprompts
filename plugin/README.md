# Ralphy Plugin for Claude Code

A Claude Code plugin that enables iterative task execution from PRD files using a stop-hook loop mechanism.

## Overview

This plugin provides a self-referential development loop for Claude Code. Instead of requiring external bash scripts, it uses Claude Code's hook system to:

1. Read tasks from a PRD file (Markdown or YAML)
2. Execute each task one by one
3. Intercept session exit via a stop hook
4. Feed the next task back to Claude
5. Continue until all tasks are complete



## Installation

Copy this plugin folder to your Claude Code plugins directory:

```bash
# Option 1: Copy to global plugins
cp -r plugin ~/.claude/plugins/ralphy

# Option 2: Copy to project (for project-specific use)
cp -r plugin .claude-plugins/ralphy
```

Or symlink for development:
```bash
ln -s $(pwd)/plugin ~/.claude/plugins/ralphy
```

## Commands

### `/ralphy-loop`

Start iterative task execution from a PRD file.

```bash
# Basic usage (uses PRD.md)
/ralphy-loop

# Specify PRD file
/ralphy-loop PRD.md

# Skip tests for faster iteration
/ralphy-loop PRD.md --skip-tests

# Enable browser testing
/ralphy-loop PRD.md --browser

# All options
/ralphy-loop tasks.yaml --skip-tests --skip-lint --browser
```

**Options:**
- `--skip-tests` - Skip running tests after each task
- `--skip-lint` - Skip running linter after each task
- `--browser` - Enable Playwright MCP for browser automation
- `--max-retries N` - Max retries per task on failure (default: 3)

### `/cancel-ralphy`

Cancel an active Ralphy loop.

```bash
/cancel-ralphy
```

## How the Loop Works

```
┌─────────────────────────────────────────────────┐
│  1. /ralphy-loop PRD.md                         │
│     └── Creates .claude/ralphy-loop.local.md    │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  2. Claude reads first incomplete task          │
│     Implements, tests, commits, marks complete  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  3. Claude tries to exit                        │
│     └── Stop hook intercepts                    │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  4. Stop hook checks PRD for remaining tasks    │
│     └── If tasks remain: feeds next task        │
│     └── If all done: allows exit                │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
                 (Repeat 2-4)
```

## PRD File Formats

### Markdown Format

```markdown
# Project Requirements Document

## Tasks

- [ ] Implement user authentication
- [ ] Add password reset functionality
- [ ] Create user profile page
- [x] Set up project structure (completed)
```

### YAML Format

```yaml
tasks:
  - title: "Implement user authentication"
    completed: false
    description: "Add JWT-based auth"

  - title: "Add password reset flow"
    completed: false

  - title: "Set up project structure"
    completed: true
```

## Project Configuration

Create `.ralphy/config.yaml` for project-specific settings:

```yaml
project:
  name: "my-app"
  language: "TypeScript"
  framework: "Next.js"

commands:
  test: "npm test"
  lint: "npm run lint"
  build: "npm run build"

rules:
  - "Use TypeScript strict mode"
  - "Follow existing patterns in src/utils"
  - "Write tests for new functionality"

boundaries:
  never_touch:
    - "node_modules"
    - ".git"
    - ".env"
    - "*.lock"

capabilities:
  browser: false  # Set true for Playwright MCP
```

## Directory Structure

```
plugin/
├── .claude-plugin/
│   └── hooks.json          # Hook configuration
├── commands/
│   ├── ralphy-loop.md      # /ralphy-loop command
│   └── cancel-ralphy.md    # /cancel-ralphy command
├── hooks/
│   └── stop-hook.sh        # Stop hook for loop continuation
├── scripts/
│   └── setup-ralphy-loop.sh # Loop initialization script
├── skills/
│   ├── init-ralphy.md      # /init-ralphy skill
│   ├── parse-prd.md        # /parse-prd skill
│   ├── run-tasks.md        # /run-tasks skill
│   ├── run-parallel.md     # /run-parallel skill
│   └── README.md           # Skills documentation
└── README.md               # This file
```

## Completion Mechanism

The loop uses a promise-based completion system. When all tasks are done, Claude outputs:

```
<promise>ALL_TASKS_COMPLETE</promise>
```

The stop hook detects this and allows the session to exit normally.

**Important:** Only output the promise when tasks are genuinely complete. The loop is designed to continue until the promise is true.

## Browser Automation

When `--browser` is enabled, Playwright MCP tools become available:

```
- mcp__playwright__browser_navigate: Navigate to URL
- mcp__playwright__browser_snapshot: Get accessibility tree
- mcp__playwright__browser_click: Click elements
- mcp__playwright__browser_type: Type into inputs
- mcp__playwright__browser_screenshot: Capture screenshots
```

Use these for:
- Testing web UI after implementing features
- Verifying that changes work in the browser
- Filling forms or checking workflows

## Monitoring Progress

```bash
# View loop state
cat .claude/ralphy-loop.local.md

# View PRD progress
grep -E '^\- \[.\]' PRD.md

# Count remaining tasks
grep -c '^\- \[ \] ' PRD.md
```

## State File Format

The loop creates `.claude/ralphy-loop.local.md`:

```yaml
---
active: true
prd_file: "/path/to/PRD.md"
prd_format: "markdown"
current_task: 1
tasks_completed: 0
skip_tests: false
skip_lint: false
browser_enabled: false
max_retries: 3
retry_count: 0
started_at: "2024-01-22T12:00:00Z"
---

Execute tasks from PRD file: PRD.md
...
```

## Differences from Original Ralphy CLI

| Feature | Original CLI | Plugin |
|---------|--------------|--------|
| Execution | External bash script | Claude Code hooks |
| AI Engine | Multiple (Claude, Cursor, etc.) | Claude Code only |
| GitHub Integration | Yes | No |
| PR Creation | Yes | No |
| Parallel Execution | Git worktrees | Via /run-parallel skill |
| Browser | agent-browser CLI | Playwright MCP |
| Loop Mechanism | Bash while loop | Stop hook |

## Troubleshooting

### Loop not starting
- Check that the PRD file exists and has incomplete tasks
- Verify the markdown format uses `- [ ]` checkboxes

### Tasks not being marked complete
- Ensure the PRD file is writable
- Check the format matches expected patterns

### Stop hook not triggering
- Verify `.claude-plugin/hooks.json` is configured
- Check that `hooks/stop-hook.sh` is executable

### Infinite loop
- Run `/cancel-ralphy` to stop
- Or manually delete `.claude/ralphy-loop.local.md`

## Skills (Alternative Usage)

The `skills/` directory contains standalone skills that can be used without the loop mechanism:

| Skill | Description |
|-------|-------------|
| `/init-ralphy` | Initialize project configuration |
| `/parse-prd` | Parse and display tasks from PRD |
| `/run-tasks` | Execute tasks sequentially (manual) |
| `/run-parallel` | Execute with git worktree isolation |

Copy skills to your project:
```bash
cp -r plugin/skills .claude/skills
# or
cp -r plugin/skills .skills
```

## License

MIT - Same as parent Ralphy project
