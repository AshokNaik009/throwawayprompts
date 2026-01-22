#!/bin/bash

# Ralphy Loop Setup Script
# Creates state file for iterative task execution from PRD files

set -euo pipefail

# Parse arguments
PRD_FILE=""
SKIP_TESTS="false"
SKIP_LINT="false"
BROWSER_ENABLED="false"
MAX_RETRIES=3

# Parse options and positional arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      cat << 'HELP_EOF'
Ralphy Loop - Iterative PRD task execution

USAGE:
  /ralphy-loop <prd-file> [OPTIONS]

ARGUMENTS:
  <prd-file>          Path to PRD file (markdown or YAML)

OPTIONS:
  --skip-tests        Skip running tests after each task
  --skip-lint         Skip running linter after each task
  --browser           Enable Playwright MCP for browser testing
  --max-retries <n>   Max retries per task on failure (default: 3)
  -h, --help          Show this help message

DESCRIPTION:
  Starts a Ralphy loop that processes tasks from a PRD file.
  The stop hook prevents exit and continues to the next task
  until all tasks are marked complete.

  For each task, Ralphy will:
  1. Read the task from PRD
  2. Implement the task
  3. Run tests (unless --skip-tests)
  4. Run linter (unless --skip-lint)
  5. Commit changes
  6. Mark task complete in PRD
  7. Move to next task

EXAMPLES:
  /ralphy-loop PRD.md
  /ralphy-loop tasks.yaml --skip-tests
  /ralphy-loop features.md --browser
  /ralphy-loop PRD.md --skip-tests --skip-lint

STOPPING:
  Loop stops when all tasks in the PRD are marked complete.
  Or run /cancel-ralphy to stop manually.

MONITORING:
  # View current state:
  cat .claude/ralphy-loop.local.md

  # View PRD progress:
  grep -E '^\- \[.\]' <prd-file>
HELP_EOF
      exit 0
      ;;
    --skip-tests)
      SKIP_TESTS="true"
      shift
      ;;
    --skip-lint)
      SKIP_LINT="true"
      shift
      ;;
    --browser)
      BROWSER_ENABLED="true"
      shift
      ;;
    --max-retries)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --max-retries requires a number" >&2
        exit 1
      fi
      if ! [[ "$2" =~ ^[0-9]+$ ]]; then
        echo "Error: --max-retries must be a positive integer, got: $2" >&2
        exit 1
      fi
      MAX_RETRIES="$2"
      shift 2
      ;;
    -*)
      echo "Error: Unknown option: $1" >&2
      echo "Run /ralphy-loop --help for usage" >&2
      exit 1
      ;;
    *)
      if [[ -z "$PRD_FILE" ]]; then
        PRD_FILE="$1"
      else
        echo "Error: Multiple PRD files specified. Only one allowed." >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# Validate PRD file
if [[ -z "$PRD_FILE" ]]; then
  PRD_FILE="PRD.md"
fi

if [[ ! -f "$PRD_FILE" ]]; then
  echo "Error: PRD file not found: $PRD_FILE" >&2
  echo "" >&2
  echo "Create a PRD file with tasks in this format:" >&2
  echo "" >&2
  echo "  # PRD" >&2
  echo "  - [ ] First task" >&2
  echo "  - [ ] Second task" >&2
  echo "" >&2
  exit 1
fi

# Detect PRD format
PRD_FORMAT="markdown"
if [[ "$PRD_FILE" == *.yaml ]] || [[ "$PRD_FILE" == *.yml ]]; then
  PRD_FORMAT="yaml"
fi

# Count incomplete tasks
if [[ "$PRD_FORMAT" == "markdown" ]]; then
  INCOMPLETE_COUNT=$(grep -c '^\- \[ \] ' "$PRD_FILE" 2>/dev/null || echo "0")
else
  # YAML: count tasks with completed: false or no completed field
  INCOMPLETE_COUNT=$(grep -c 'completed: false' "$PRD_FILE" 2>/dev/null || echo "0")
fi

if [[ "$INCOMPLETE_COUNT" -eq 0 ]]; then
  echo "No incomplete tasks found in $PRD_FILE" >&2
  echo "" >&2
  echo "All tasks may already be complete, or the file format is incorrect." >&2
  echo "" >&2
  echo "Expected format (Markdown):" >&2
  echo "  - [ ] Incomplete task" >&2
  echo "  - [x] Completed task" >&2
  exit 1
fi

# Create state directory
mkdir -p .claude

# Get absolute path to PRD file
PRD_FILE_ABS=$(cd "$(dirname "$PRD_FILE")" && pwd)/$(basename "$PRD_FILE")

# Create state file
cat > .claude/ralphy-loop.local.md <<EOF
---
active: true
prd_file: "$PRD_FILE_ABS"
prd_format: "$PRD_FORMAT"
current_task: 1
tasks_completed: 0
skip_tests: $SKIP_TESTS
skip_lint: $SKIP_LINT
browser_enabled: $BROWSER_ENABLED
max_retries: $MAX_RETRIES
retry_count: 0
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
---

Execute tasks from PRD file: $PRD_FILE

For each incomplete task:
1. Read and understand the task
2. Implement the changes
3. Write tests for the feature (unless skip_tests is true)
4. Run tests and fix any failures
5. Run linter and fix any issues (unless skip_lint is true)
6. Commit changes with descriptive message
7. Mark the task complete in the PRD file

When all tasks are complete, output:
<promise>ALL_TASKS_COMPLETE</promise>

IMPORTANT:
- Only output the promise when ALL tasks are genuinely complete
- Check the PRD file to verify no incomplete tasks remain
- Do NOT output the promise to escape - it must be TRUE
EOF

# Output setup message
cat <<EOF
Ralphy loop activated!

PRD File: $PRD_FILE
Format: $PRD_FORMAT
Incomplete tasks: $INCOMPLETE_COUNT

Options:
  Skip tests: $SKIP_TESTS
  Skip lint: $SKIP_LINT
  Browser: $BROWSER_ENABLED
  Max retries: $MAX_RETRIES

The stop hook is now active. When you complete a task, the loop will
automatically continue to the next one.

To cancel: /cancel-ralphy
To monitor: cat .claude/ralphy-loop.local.md

Starting task execution...
EOF

# Load ralphy config if exists
RALPHY_CONFIG=".ralphy/config.yaml"
if [[ -f "$RALPHY_CONFIG" ]]; then
  echo ""
  echo "Found .ralphy/config.yaml - loading project context..."
fi

echo ""
echo "================================================================"
echo "BEGIN TASK EXECUTION"
echo "================================================================"
echo ""

# Build the initial prompt based on PRD format
if [[ "$PRD_FORMAT" == "markdown" ]]; then
  # Extract first incomplete task from markdown
  FIRST_TASK=$(grep -m1 '^\- \[ \] ' "$PRD_FILE" | sed 's/^- \[ \] //')
  if [[ -n "$FIRST_TASK" ]]; then
    echo "First task: $FIRST_TASK"
    echo ""
    echo "Read the PRD file at: $PRD_FILE"
    echo "Find and implement this task: $FIRST_TASK"
  fi
else
  # YAML format
  echo "Read the PRD file at: $PRD_FILE"
  echo "Find the first incomplete task and implement it."
fi

echo ""
echo "After completing this task:"
echo "1. Mark it complete in the PRD file (change [ ] to [x])"
echo "2. The loop will automatically continue to the next task"
echo ""

# Browser instructions if enabled
if [[ "$BROWSER_ENABLED" == "true" ]]; then
  cat <<EOF

BROWSER TESTING ENABLED
Use Playwright MCP tools for browser automation:
- mcp__playwright__browser_navigate: Navigate to URL
- mcp__playwright__browser_snapshot: Get accessibility tree
- mcp__playwright__browser_click: Click elements
- mcp__playwright__browser_type: Type into inputs
- mcp__playwright__browser_screenshot: Capture screenshots

EOF
fi

echo "================================================================"
