# Ralphy Skills for Claude Code

This directory contains Claude Code skills (slash commands) for autonomous task execution from PRD files.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| [init-ralphy](./init-ralphy.md) | `/init-ralphy` | Initialize project configuration |
| [parse-prd](./parse-prd.md) | `/parse-prd <file>` | Parse and display tasks from PRD |
| [run-tasks](./run-tasks.md) | `/run-tasks <file>` | Execute tasks sequentially |
| [run-parallel](./run-parallel.md) | `/run-parallel <file>` | Execute tasks with git worktree isolation |

## Quick Start

```bash
# 1. Initialize Ralphy in your project
/init-ralphy

# 2. Create a PRD file with tasks
# (see formats below)

# 3. Preview tasks
/parse-prd PRD.md

# 4. Execute tasks
/run-tasks PRD.md
# or for parallel execution:
/run-parallel PRD.md
```

## Installation

Copy the `skills/` directory to your project:

```bash
cp -r ralphy/skills .claude/skills
# or
cp -r ralphy/skills .skills
```

Claude Code will automatically detect skills in:
- `.claude/skills/`
- `.opencode/skills/`
- `.skills/`

## PRD File Formats

### Markdown Format

Simple checkbox format, one task per line:

```markdown
# Project Requirements Document

## Features

- [ ] Implement user authentication
- [ ] Add password reset flow
- [ ] Create user profile page
- [ ] Add email notifications
- [x] Set up project structure (completed)
```

### YAML Format

Structured format with parallel groups:

```yaml
tasks:
  - title: "Set up database models"
    parallel_group: 1
    description: "Create User, Product, and Order models"

  - title: "Create API endpoints"
    parallel_group: 1
    description: "RESTful endpoints for all models"

  - title: "Build React components"
    parallel_group: 2

  - title: "Add integration tests"
    parallel_group: 3
    completed: false
```

**Parallel Groups**: Tasks in the same group can run independently. Groups are processed in order (1, then 2, then 3).

## Configuration

Ralphy uses `.ralphy/config.yaml` for project settings:

```yaml
project:
  name: "my-app"
  language: "TypeScript"
  framework: "Next.js"
  description: "E-commerce platform"

commands:
  test: "npm test"
  lint: "npm run lint"
  build: "npm run build"

rules:
  - "Use TypeScript strict mode"
  - "Follow existing error handling patterns"
  - "Write tests for all new functions"

boundaries:
  never_touch:
    - "node_modules"
    - ".git"
    - ".env"
    - "*.lock"

capabilities:
  browser: false  # Set true for Playwright MCP testing
```

## Browser Automation

Enable browser testing with Playwright MCP:

1. Set `capabilities.browser: true` in config
2. Use `--browser` flag: `/run-tasks PRD.md --browser`

Available Playwright MCP tools:
- `mcp__playwright__browser_navigate` - Navigate to URL
- `mcp__playwright__browser_snapshot` - Get accessibility tree
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type into inputs
- `mcp__playwright__browser_screenshot` - Capture screenshots

## Workflow Examples

### Sequential Execution

```bash
# Run all tasks one by one
/run-tasks PRD.md

# Skip tests for faster iteration
/run-tasks PRD.md --skip-tests

# Skip linting
/run-tasks PRD.md --skip-lint

# Enable browser testing
/run-tasks PRD.md --browser
```

### Parallel Execution

```bash
# Run with default 3 parallel worktrees
/run-parallel PRD.md

# Limit parallel worktrees
/run-parallel PRD.md --max-parallel 2

# Skip auto-merge (for manual review)
/run-parallel PRD.md --skip-merge
```

## How It Works

### Sequential (`/run-tasks`)

```
┌─────────────┐
│  Load PRD   │
└──────┬──────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐
│ Get next    │───▶│ Implement   │
│ task        │    │ task        │
└─────────────┘    └──────┬──────┘
       ▲                  │
       │                  ▼
       │           ┌─────────────┐
       │           │ Run tests   │
       │           └──────┬──────┘
       │                  │
       │                  ▼
       │           ┌─────────────┐
       │           │ Commit      │
       │           └──────┬──────┘
       │                  │
       │                  ▼
       │           ┌─────────────┐
       └───────────│ Mark done   │
                   └─────────────┘
```

### Parallel (`/run-parallel`)

```
┌─────────────┐
│  Load PRD   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Create worktrees               │
│  .ralphy-worktrees/agent-N/     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Worktree 1  │  │ Worktree 2  │  │ Worktree 3  │
│ Task A      │  │ Task B      │  │ Task C      │
│ branch-1    │  │ branch-2    │  │ branch-3    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Merge branches  │
               │ (AI conflicts)  │
               └─────────────────┘
```

## Removed Features (vs Original Ralphy CLI)

The Claude Code skills version removes these features that required external dependencies:

- **GitHub Integration**: No `--github` flag, GitHub issue parsing, or PR creation
- **Multiple AI Engines**: Skills use Claude Code natively
- **External Browser CLI**: Uses Playwright MCP instead of `agent-browser`

## Troubleshooting

### "Config not found"
Run `/init-ralphy` to create `.ralphy/config.yaml`

### Tasks not being marked complete
Ensure the PRD file is writable and using correct format:
- Markdown: `- [ ] Task` (not `* [ ]` or other variations)
- YAML: Must have `completed: false` field

### Merge conflicts in parallel mode
The skill uses AI to resolve conflicts. If it fails:
1. Use `--skip-merge` to leave branches unmerged
2. Review and merge manually
3. Or create PRs for code review

### Worktrees not cleaned up
Run manually:
```bash
git worktree list
git worktree remove .ralphy-worktrees/<name>
git worktree prune
```

## Contributing

To add new skills:

1. Create `skill-name.md` in this directory
2. Use frontmatter for metadata:
   ```yaml
   ---
   description: What this skill does
   user-invocable: true
   argument-hint: <args>
   ---
   ```
3. Document instructions clearly
4. Update this README

## License

Same as the parent Ralphy project.
