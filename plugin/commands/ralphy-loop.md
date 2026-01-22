# /ralphy-loop

Execute tasks from a PRD file in a continuous loop until all are complete.

---
description: Start iterative task execution from PRD file
allowed-tools: ["Bash"]
user-invocable: true
argument-hint: <prd-file> [--skip-tests] [--skip-lint] [--browser]
---

## Overview

This command starts a Ralphy loop that processes tasks from a PRD file one by one. The stop hook prevents normal exit and continues to the next task until all tasks are marked complete.

## How It Works

1. You run `/ralphy-loop PRD.md`
2. Ralphy reads the first incomplete task
3. Claude implements the task, runs tests, commits
4. When Claude tries to exit, the stop hook intercepts
5. The hook feeds the next task back to Claude
6. Process repeats until all tasks are complete

## Usage

```bash
# Basic usage with default PRD.md
/ralphy-loop

# Specify PRD file
/ralphy-loop PRD.md

# Skip tests for faster iteration
/ralphy-loop PRD.md --skip-tests

# Enable browser testing with Playwright
/ralphy-loop PRD.md --browser

# All options
/ralphy-loop tasks.yaml --skip-tests --skip-lint --browser
```

## Instructions

Run the setup script to initialize the loop:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralphy-loop.sh" $ARGUMENTS
```

The script will:
1. Validate the PRD file exists
2. Count incomplete tasks
3. Create the loop state file at `.claude/ralphy-loop.local.md`
4. Display the first task to execute

## PRD File Formats

### Markdown Format

```markdown
# Project Requirements

- [ ] Implement user authentication
- [ ] Add password reset flow
- [ ] Create user profile page
- [x] Set up project (completed)
```

### YAML Format

```yaml
tasks:
  - title: "Implement user authentication"
    completed: false
  - title: "Add password reset flow"
    completed: false
```

## Stopping the Loop

The loop stops automatically when:
- All tasks are marked complete in the PRD
- Claude outputs `<promise>ALL_TASKS_COMPLETE</promise>`

To stop manually:
```
/cancel-ralphy
```

## Monitoring Progress

```bash
# View loop state
cat .claude/ralphy-loop.local.md

# View PRD progress
grep -E '^\- \[.\]' PRD.md
```

## Important Notes

- The loop runs indefinitely until all tasks complete
- Each task is committed separately
- Tests run after each task (unless --skip-tests)
- Do not output the completion promise until genuinely done
