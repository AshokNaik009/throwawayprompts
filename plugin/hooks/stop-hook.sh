#!/bin/bash

# Ralphy Stop Hook
# Prevents session exit when a ralphy-loop is active
# Continues to next task until all PRD tasks are complete

set -euo pipefail

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Check if ralphy-loop is active
RALPHY_STATE_FILE=".claude/ralphy-loop.local.md"

if [[ ! -f "$RALPHY_STATE_FILE" ]]; then
  # No active loop - allow exit
  exit 0
fi

# Parse markdown frontmatter (YAML between ---) and extract values
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$RALPHY_STATE_FILE")

# Extract values from frontmatter
PRD_FILE=$(echo "$FRONTMATTER" | grep '^prd_file:' | sed 's/prd_file: *//' | sed 's/^"//;s/"$//')
PRD_FORMAT=$(echo "$FRONTMATTER" | grep '^prd_format:' | sed 's/prd_format: *//' | sed 's/^"//;s/"$//')
CURRENT_TASK=$(echo "$FRONTMATTER" | grep '^current_task:' | sed 's/current_task: *//')
TASKS_COMPLETED=$(echo "$FRONTMATTER" | grep '^tasks_completed:' | sed 's/tasks_completed: *//')
SKIP_TESTS=$(echo "$FRONTMATTER" | grep '^skip_tests:' | sed 's/skip_tests: *//')
SKIP_LINT=$(echo "$FRONTMATTER" | grep '^skip_lint:' | sed 's/skip_lint: *//')
BROWSER_ENABLED=$(echo "$FRONTMATTER" | grep '^browser_enabled:' | sed 's/browser_enabled: *//')
MAX_RETRIES=$(echo "$FRONTMATTER" | grep '^max_retries:' | sed 's/max_retries: *//')
RETRY_COUNT=$(echo "$FRONTMATTER" | grep '^retry_count:' | sed 's/retry_count: *//')

# Validate required fields
if [[ -z "$PRD_FILE" ]]; then
  echo "Ralphy loop: State file corrupted (no prd_file)" >&2
  rm "$RALPHY_STATE_FILE"
  exit 0
fi

if [[ ! -f "$PRD_FILE" ]]; then
  echo "Ralphy loop: PRD file not found: $PRD_FILE" >&2
  rm "$RALPHY_STATE_FILE"
  exit 0
fi

# Get transcript path from hook input
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path' 2>/dev/null || echo "")

if [[ -n "$TRANSCRIPT_PATH" ]] && [[ -f "$TRANSCRIPT_PATH" ]]; then
  # Check for completion promise in last assistant message
  if grep -q '"role":"assistant"' "$TRANSCRIPT_PATH"; then
    LAST_OUTPUT=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -1 | jq -r '
      .message.content |
      map(select(.type == "text")) |
      map(.text) |
      join("\n")
    ' 2>/dev/null || echo "")

    # Check for ALL_TASKS_COMPLETE promise
    if echo "$LAST_OUTPUT" | grep -q '<promise>ALL_TASKS_COMPLETE</promise>'; then
      echo "Ralphy loop complete: All tasks finished!"
      rm "$RALPHY_STATE_FILE"
      exit 0
    fi
  fi
fi

# Check PRD for remaining incomplete tasks
if [[ "$PRD_FORMAT" == "markdown" ]]; then
  INCOMPLETE_COUNT=$(grep -c '^\- \[ \] ' "$PRD_FILE" 2>/dev/null || echo "0")
else
  INCOMPLETE_COUNT=$(grep -c 'completed: false' "$PRD_FILE" 2>/dev/null || echo "0")
fi

# If no incomplete tasks, we're done
if [[ "$INCOMPLETE_COUNT" -eq 0 ]]; then
  echo "Ralphy loop complete: All tasks in PRD are marked done!"
  rm "$RALPHY_STATE_FILE"
  exit 0
fi

# Update state: increment task counter
NEXT_TASK=$((CURRENT_TASK + 1))
NEW_COMPLETED=$((TASKS_COMPLETED + 1))

# Update state file
TEMP_FILE="${RALPHY_STATE_FILE}.tmp.$$"
sed -e "s/^current_task: .*/current_task: $NEXT_TASK/" \
    -e "s/^tasks_completed: .*/tasks_completed: $NEW_COMPLETED/" \
    -e "s/^retry_count: .*/retry_count: 0/" \
    "$RALPHY_STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$RALPHY_STATE_FILE"

# Build prompt for next task
if [[ "$PRD_FORMAT" == "markdown" ]]; then
  NEXT_TASK_TEXT=$(grep -m1 '^\- \[ \] ' "$PRD_FILE" | sed 's/^- \[ \] //' || echo "")
else
  NEXT_TASK_TEXT="Next incomplete task from $PRD_FILE"
fi

# Build the continuation prompt
PROMPT="Continue executing tasks from PRD: $PRD_FILE

Tasks completed so far: $NEW_COMPLETED
Remaining incomplete tasks: $INCOMPLETE_COUNT

Next task: $NEXT_TASK_TEXT

Instructions:
1. Read and understand the task from the PRD file
2. Implement the changes required
3. Write tests for the feature"

if [[ "$SKIP_TESTS" != "true" ]]; then
  PROMPT="$PROMPT
4. Run tests and fix any failures"
fi

if [[ "$SKIP_LINT" != "true" ]]; then
  PROMPT="$PROMPT
5. Run linter and fix any issues"
fi

PROMPT="$PROMPT
6. Commit changes with a descriptive message
7. Mark the task complete in the PRD file (change [ ] to [x])

When ALL tasks are complete, output:
<promise>ALL_TASKS_COMPLETE</promise>

IMPORTANT: Only output the promise when genuinely complete!"

# Browser instructions if enabled
if [[ "$BROWSER_ENABLED" == "true" ]]; then
  PROMPT="$PROMPT

Browser testing is enabled. Use Playwright MCP tools:
- mcp__playwright__browser_navigate
- mcp__playwright__browser_snapshot
- mcp__playwright__browser_click
- mcp__playwright__browser_type
- mcp__playwright__browser_screenshot"
fi

# Build system message
SYSTEM_MSG="Ralphy iteration $NEXT_TASK | $INCOMPLETE_COUNT tasks remaining | Stop: output <promise>ALL_TASKS_COMPLETE</promise> when done"

# Output JSON to block the stop and continue with next task
jq -n \
  --arg prompt "$PROMPT" \
  --arg msg "$SYSTEM_MSG" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'

exit 0
