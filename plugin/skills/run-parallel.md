# /run-parallel

Execute tasks in parallel using git worktrees.

---
description: Execute tasks in isolated git worktrees for parallel development, then merge results
user-invocable: true
argument-hint: <prd-path> [--max-parallel N] [--skip-tests] [--skip-merge]
---

## Overview

This skill executes tasks in parallel using git worktrees for isolation. Each task gets its own worktree and branch, allowing independent work. After all tasks complete, branches are merged back with AI-assisted conflict resolution.

**Note**: While this skill sets up isolation for parallel work, Claude Code executes tasks sequentially within each worktree. The "parallel" aspect is the isolation - each task works on its own branch without interfering with others.

## Arguments

- `prd-path`: Path to the PRD file (required, default: `PRD.md`)
- `--max-parallel N`: Maximum concurrent worktrees (default: 3)
- `--skip-tests`: Skip running tests in each worktree
- `--skip-merge`: Leave branches unmerged for manual review

## Git Worktree Workflow

```
main branch (original)
    │
    ├── worktree-1/  →  ralphy/agent-1-<task-slug>
    │       └── Task 1 implementation
    │
    ├── worktree-2/  →  ralphy/agent-2-<task-slug>
    │       └── Task 2 implementation
    │
    └── worktree-3/  →  ralphy/agent-3-<task-slug>
            └── Task 3 implementation

After completion:
    │
    └── All branches merged back to main
        (with AI-assisted conflict resolution)
```

## Execution Process

### Phase 1: Setup and Parse

1. **Load Configuration**
   - Read `.ralphy/config.yaml` for project settings
   - Get test/lint commands, rules, boundaries

2. **Parse PRD File**
   - Read all incomplete tasks from PRD (Markdown or YAML)
   - For YAML with `parallel_group`, organize tasks by group
   - Create task queue

3. **Prepare Worktree Base**
   - Create `.ralphy-worktrees/` directory if needed
   - Record current branch as base branch for merging

### Phase 2: Create Worktrees

For each task (up to `--max-parallel`):

```bash
# Create worktree with new branch
git worktree add -B ralphy/agent-1-<timestamp>-<task-slug> \
    .ralphy-worktrees/agent-1-<timestamp> \
    <base-branch>
```

Each worktree:
- Gets a unique branch name with timestamp
- Is based on the current branch
- Is isolated from other worktrees

### Phase 3: Execute Tasks

Process each worktree sequentially:

1. **Change to worktree directory**
   ```bash
   cd .ralphy-worktrees/agent-1-<id>
   ```

2. **Build task prompt**
   ```
   You are working on a specific task. Focus ONLY on this task:

   TASK: <task title>

   Instructions:
   1. Implement this specific task completely
   2. Write tests for the feature
   3. Run tests and ensure they pass
   4. Update .ralphy/progress.txt with what you did
   5. Commit your changes with a descriptive message

   Do NOT modify PRD.md or mark tasks complete - that will be handled separately.
   Focus only on implementing: <task title>
   ```

3. **Implement the task**
   - Make code changes
   - Follow project rules and boundaries
   - Write tests (unless `--skip-tests`)

4. **Run tests** (unless `--skip-tests`)
   - Execute test command
   - Fix any failures
   - Retry up to 3 times

5. **Commit changes**
   ```bash
   git add -A
   git commit -m "feat: <task description>"
   ```

6. **Record progress**
   - Write completion status to `.ralphy/progress.txt`
   - Track what was done in this worktree

7. **Return to main directory**
   ```bash
   cd <original-directory>
   ```

8. **Move to next worktree**
   - Repeat for remaining tasks

### Phase 4: Merge Branches

After all tasks complete (unless `--skip-merge`):

1. **Return to original directory and branch**
   ```bash
   cd <original-directory>
   git checkout <base-branch>
   ```

2. **Merge each branch**
   ```bash
   git merge --no-ff ralphy/agent-1-<id> -m "Merge: <task title>"
   ```

3. **Handle conflicts with AI**
   If merge conflicts occur:

   ```
   You are resolving a git merge conflict. The following files have conflicts:

   - <file1>
   - <file2>

   For each conflicted file:
   1. Read the file to see the conflict markers (<<<<<<, =======, >>>>>>>)
   2. Understand what both versions are trying to do
   3. Edit the file to resolve the conflict by combining both changes
   4. Remove ALL conflict markers
   5. Make sure the resulting code is valid

   After resolving all conflicts:
   1. Run 'git add' on each resolved file
   2. Run 'git commit --no-edit' to complete the merge
   ```

4. **Continue merging remaining branches**
   - Process each branch in order
   - Resolve conflicts as they arise

### Phase 5: Cleanup

1. **Remove worktrees**
   ```bash
   git worktree remove .ralphy-worktrees/agent-1-<id>
   git worktree remove .ralphy-worktrees/agent-2-<id>
   # ... etc
   git worktree prune
   ```

2. **Update PRD file**
   - Mark all completed tasks as done
   - Markdown: `- [ ]` → `- [x]`
   - YAML: `completed: true`

3. **Report results**
   ```
   Parallel execution complete!

   Tasks completed: <count>
   Branches merged: <count>
   Conflicts resolved: <count>

   All changes are now on branch: <base-branch>
   ```

## YAML Parallel Groups

For YAML PRD files with `parallel_group`:

```yaml
tasks:
  - title: "Set up database"
    parallel_group: 1
  - title: "Create API endpoints"
    parallel_group: 1
  - title: "Build frontend"
    parallel_group: 2
  - title: "Add tests"
    parallel_group: 3
```

Processing order:
1. All tasks in group 1 run first (in separate worktrees)
2. Merge group 1 branches
3. All tasks in group 2 run next
4. Merge group 2 branches
5. Continue for remaining groups

## Progress Tracking

Display status after each task:

```
[Worktree 1] Completed: Set up database
[Worktree 2] Completed: Create API endpoints
[Worktree 3] In progress: Build frontend...

Overall: 2/4 tasks complete
```

## Error Handling

- **Task failure**: Log error, continue with other worktrees, report at end
- **Merge conflict**: Use AI to resolve; if AI fails, leave branch unmerged
- **Worktree issues**: Clean up and report, don't leave stale worktrees
- **Uncommitted changes**: Warn user, leave worktree in place

## Skip Merge Option

When `--skip-merge` is used:

1. All worktrees complete their tasks
2. Branches are NOT merged automatically
3. Report which branches were created:
   ```
   Branches created (not merged):
   - ralphy/agent-1-abc123-setup-database
   - ralphy/agent-2-def456-create-api

   To merge manually:
     git merge ralphy/agent-1-abc123-setup-database
     git merge ralphy/agent-2-def456-create-api

   To create PRs:
     gh pr create --base main --head ralphy/agent-1-abc123-setup-database
   ```

## Directory Structure

```
project/
├── .ralphy/
│   ├── config.yaml
│   └── progress.txt       # Parallel progress tracking
├── .ralphy-worktrees/     # Worktree directory
│   ├── agent-1-abc123/    # Worktree for task 1
│   ├── agent-2-def456/    # Worktree for task 2
│   └── agent-3-ghi789/    # Worktree for task 3
├── PRD.md
└── ... (rest of project)
```

## Example Usage

```bash
# Run with default settings (3 parallel worktrees)
/run-parallel PRD.md

# Limit to 2 parallel worktrees
/run-parallel PRD.md --max-parallel 2

# Skip tests for faster iteration
/run-parallel PRD.md --skip-tests

# Don't auto-merge (for manual review)
/run-parallel PRD.md --skip-merge

# Combined options
/run-parallel tasks.yaml --max-parallel 4 --skip-tests --skip-merge
```

## Execution Flow Diagram

```
┌─────────────────────────────────────────────────┐
│               /run-parallel                      │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Load config & parse PRD for tasks               │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Create worktrees (up to --max-parallel)         │
│  git worktree add -B <branch> <dir> <base>       │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  For each worktree:                              │
│    1. cd to worktree                             │
│    2. Implement task                             │
│    3. Run tests                                  │
│    4. Commit changes                             │
│    5. cd back to main                            │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │   --skip-merge set?   │
          └───────────┬───────────┘
                      │
         ┌────────────┴────────────┐
         │ No                      │ Yes
         ▼                         ▼
┌─────────────────────┐    ┌─────────────────────┐
│ Merge each branch   │    │ Report branches     │
│ Resolve conflicts   │    │ for manual review   │
│ with AI assistance  │    └─────────────────────┘
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Cleanup worktrees                               │
│  git worktree remove <dir>                       │
│  git worktree prune                              │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Update PRD: mark tasks complete                 │
│  Report final results                            │
└─────────────────────────────────────────────────┘
```

## Conflict Resolution Prompt

When merge conflicts occur, use this approach:

```
For each conflicted file:
1. Read the file to see conflict markers (<<<<<<, =======, >>>>>>>)
2. The part between <<<<<<< and ======= is from the current branch
3. The part between ======= and >>>>>>> is from the incoming branch
4. Understand what BOTH versions are trying to do
5. Combine the changes appropriately - usually both changes should be kept
6. Remove ALL conflict markers completely
7. Ensure the resulting code is syntactically valid
8. Stage the file: git add <filename>

After all files resolved:
git commit --no-edit
```
