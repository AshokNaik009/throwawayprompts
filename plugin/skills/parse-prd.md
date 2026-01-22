# /parse-prd

Parse and display tasks from a PRD file.

---
description: Parse a PRD file (Markdown or YAML) and display the task list with status
user-invocable: true
argument-hint: <prd-path>
---

## Overview

This skill parses a Product Requirements Document (PRD) file and displays all tasks with their completion status. Supports both Markdown checkbox format and YAML task lists.

## Arguments

- `prd-path`: Path to the PRD file (required)
  - Default: `PRD.md` if not specified
  - Supports `.md`, `.yaml`, `.yml` extensions

## Instructions

1. **Determine File Path**
   - Use the provided `prd-path` argument
   - If no argument provided, default to `PRD.md`
   - Check if file exists; if not, show error message

2. **Detect Format**

   Based on file extension:
   - `.md` or `.markdown` → Markdown format
   - `.yaml` or `.yml` → YAML format

3. **Parse Markdown Format**

   Look for checkbox task lines:
   ```
   - [ ] Task description (incomplete)
   - [x] Task description (complete)
   ```

   For each task, extract:
   - Status: incomplete (`[ ]`) or complete (`[x]`)
   - Title: text after the checkbox
   - Line number: for task identification

4. **Parse YAML Format**

   Expect structure:
   ```yaml
   tasks:
     - title: "Task description"
       completed: false  # or true
       parallel_group: 1  # optional
       description: "Optional longer description"
   ```

   For each task, extract:
   - Status: `completed` field
   - Title: `title` field
   - Parallel group: `parallel_group` field (optional)
   - Description: `description` field (optional)

5. **Display Results**

   Format output as a clear list:

   ```
   PRD: <filename>
   Format: <Markdown|YAML>

   Tasks:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   [x] 1. Completed task example
   [ ] 2. Incomplete task example
   [ ] 3. Another pending task
       └─ Group: 1 (parallel)
   [ ] 4. Task with description
       └─ Description: More details here...

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Summary:
   - Total: 4 tasks
   - Completed: 1
   - Remaining: 3
   ```

6. **Show Next Steps**

   After displaying tasks:
   ```
   Next steps:
   - Run /run-tasks <prd-path> to execute tasks sequentially
   - Run /run-parallel <prd-path> to execute with git worktrees
   ```

## Markdown PRD Example

```markdown
# Feature: User Authentication

## Tasks

- [x] Set up authentication middleware
- [ ] Implement login endpoint
- [ ] Implement registration endpoint
- [ ] Add password reset flow
- [ ] Create email verification
- [ ] Write integration tests
```

## YAML PRD Example

```yaml
# tasks.yaml
tasks:
  - title: "Set up database models"
    completed: true
    parallel_group: 1

  - title: "Create user API endpoints"
    completed: false
    parallel_group: 1
    description: "POST /users, GET /users/:id, PUT /users/:id, DELETE /users/:id"

  - title: "Build React components"
    completed: false
    parallel_group: 2

  - title: "Add integration tests"
    completed: false
    parallel_group: 3
    description: "Test all API endpoints with various scenarios"
```

## Parallel Groups

YAML format supports `parallel_group` for organizing tasks:
- Tasks in the same group can run in parallel
- Groups are processed sequentially (group 1, then group 2, etc.)
- Tasks without a group are processed individually

## Error Handling

- File not found: Display helpful error with file path
- Invalid format: Show parsing error with line number if possible
- Empty file: Indicate no tasks found
