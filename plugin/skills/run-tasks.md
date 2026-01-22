# /run-tasks

Execute tasks from a PRD file sequentially.

---
description: Execute tasks from a PRD file one at a time, running tests and committing changes
user-invocable: true
argument-hint: <prd-path> [--skip-tests] [--skip-lint] [--browser]
---

## Overview

This skill reads tasks from a PRD file and executes them one by one. For each task:
1. Implement the task
2. Write tests (unless `--skip-tests`)
3. Run tests and fix any failures
4. Run linter (unless `--skip-lint`)
5. Commit changes
6. Mark the task as complete in the PRD
7. Move to the next task

The skill continues until all tasks are complete.

## Arguments

- `prd-path`: Path to the PRD file (required, default: `PRD.md`)
- `--skip-tests`: Skip running tests
- `--skip-lint`: Skip running linter
- `--browser`: Enable Playwright MCP for browser-based testing

## Execution Loop

**IMPORTANT**: This skill runs a continuous loop until all tasks are complete. Follow this exact process:

```
WHILE there are incomplete tasks:
    1. Read the PRD file to get the next incomplete task
    2. Load project context from .ralphy/config.yaml
    3. Implement the task
    4. Run tests (if not skipped)
    5. Run linter (if not skipped)
    6. Commit changes
    7. Mark task complete in PRD file
    8. REPEAT from step 1
```

## Detailed Instructions

### Step 1: Load Configuration

Read `.ralphy/config.yaml` to get:
- Project context (name, language, framework)
- Test command (e.g., `npm test`)
- Lint command (e.g., `npm run lint`)
- Rules to follow
- Boundaries (files/directories to never touch)

If config doesn't exist, use sensible defaults based on detected project type.

### Step 2: Parse PRD and Get Next Task

1. Read the PRD file (Markdown or YAML format)
2. Find the first incomplete task:
   - Markdown: First line matching `- [ ] <task>`
   - YAML: First task where `completed: false`
3. If no incomplete tasks remain, report completion and exit

### Step 3: Build Task Context

Construct the implementation context:

```
## Project Context
Project: <name>
Language: <language>
Framework: <framework>

## Rules (you MUST follow these)
- <rule 1>
- <rule 2>
...

## Boundaries
Do NOT modify these files/directories:
- node_modules
- .git
- .env
...

## Current Task
<task title>

## Instructions
1. Implement the task described above
2. Write tests for the feature
3. Run tests and ensure they pass
4. Run linting and ensure it passes
5. Ensure the code works correctly
6. Commit your changes with a descriptive message

Keep changes focused and minimal. Do not refactor unrelated code.
```

### Step 4: Implement the Task

Execute the task:
- Read relevant files to understand the codebase
- Make the necessary code changes
- Follow the project's existing patterns and conventions
- Respect boundaries - never modify protected files

### Step 5: Run Tests (unless --skip-tests)

1. Get test command from config (or detect: `npm test`, `pytest`, etc.)
2. Run the test command
3. If tests fail:
   - Analyze the failure
   - Fix the issue
   - Re-run tests
   - Repeat until tests pass (max 3 attempts)

### Step 6: Run Linter (unless --skip-lint)

1. Get lint command from config (or detect: `npm run lint`, `ruff`, etc.)
2. Run the linter
3. If linting fails:
   - Fix the linting errors
   - Re-run linter
   - Repeat until it passes (max 3 attempts)

### Step 7: Commit Changes

1. Stage all modified files: `git add -A`
2. Create a descriptive commit message based on the task
3. Commit: `git commit -m "<message>"`

### Step 8: Mark Task Complete

Update the PRD file:
- Markdown: Change `- [ ] Task` to `- [x] Task`
- YAML: Set `completed: true` for the task

### Step 9: Continue Loop

1. Re-read the PRD file
2. Check for next incomplete task
3. If found, repeat from Step 3
4. If no more tasks, report completion

## Browser Testing (--browser flag)

When `--browser` is passed, Playwright MCP tools become available for UI testing:

```
Available Playwright MCP tools:
- mcp__playwright__browser_navigate: Navigate to URL
- mcp__playwright__browser_snapshot: Get accessibility tree
- mcp__playwright__browser_click: Click elements
- mcp__playwright__browser_type: Type into inputs
- mcp__playwright__browser_screenshot: Capture screenshots
```

Use browser automation when:
- Testing web UI after implementing features
- Verifying that changes work in the browser
- Filling forms or checking workflows
- Visual verification of changes

## Progress Tracking

After each task, display progress:

```
Task Completed: <task title>
Progress: <completed>/<total> tasks
Remaining: <remaining> tasks

Starting next task: <next task title>
---
```

## Error Handling

- **Test failures**: Attempt to fix 3 times, then ask user for guidance
- **Lint failures**: Attempt to fix 3 times, then ask user for guidance
- **Git errors**: Report error and ask user how to proceed
- **Unrecoverable errors**: Stop execution, report status, ask for help

## Completion Report

When all tasks are complete:

```
All tasks completed!

Summary:
- Tasks completed: <count>
- Commits made: <count>
- Total time: <duration> (if trackable)

All changes have been committed to the current branch.
```

## Example Usage

```bash
# Run with default PRD.md
/run-tasks

# Run with specific PRD file
/run-tasks features.md

# Run without tests
/run-tasks PRD.md --skip-tests

# Run with browser testing
/run-tasks PRD.md --browser

# Run with all options
/run-tasks tasks.yaml --skip-tests --skip-lint --browser
```

## Task Execution Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                  /run-tasks                      │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         Load .ralphy/config.yaml                 │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         Parse PRD file for tasks                 │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  Any incomplete tasks? │
          └───────────┬───────────┘
                      │
         ┌────────────┴────────────┐
         │ Yes                     │ No
         ▼                         ▼
┌─────────────────┐    ┌─────────────────────┐
│ Get next task   │    │ Report completion   │
└────────┬────────┘    │ and exit            │
         │             └─────────────────────┘
         ▼
┌─────────────────────────────────────────────────┐
│              Implement task                      │
└─────────────────────┬───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│          Run tests (if enabled)                  │
│          Fix failures if needed                  │
└─────────────────────┬───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│          Run linter (if enabled)                 │
│          Fix errors if needed                    │
└─────────────────────┬───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│          Commit changes                          │
└─────────────────────┬───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│     Mark task complete in PRD file               │
└─────────────────────┬───────────────────────────┘
         │
         │
         └────────────────────────┐
                                  │
                                  ▼
                     (Loop back to check for
                      next incomplete task)
```
