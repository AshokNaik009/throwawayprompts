# /cancel-ralphy

Cancel an active Ralphy loop.

---
description: Cancel the active Ralphy task loop
allowed-tools: ["Bash"]
user-invocable: true
---

## Overview

This command cancels an active Ralphy loop by removing the loop state file. Use this when you want to stop task execution before all tasks are complete.

## Instructions

Check if a Ralphy loop is active and cancel it:

```bash
RALPHY_STATE=".claude/ralphy-loop.local.md"

if [[ ! -f "$RALPHY_STATE" ]]; then
  echo "No active Ralphy loop found."
  exit 0
fi

# Get current progress
CURRENT_TASK=$(grep '^current_task:' "$RALPHY_STATE" | sed 's/current_task: *//')
TASKS_COMPLETED=$(grep '^tasks_completed:' "$RALPHY_STATE" | sed 's/tasks_completed: *//')
PRD_FILE=$(grep '^prd_file:' "$RALPHY_STATE" | sed 's/prd_file: *//' | sed 's/^"//;s/"$//')

# Remove the state file
rm "$RALPHY_STATE"

echo "Ralphy loop cancelled."
echo ""
echo "Progress before cancellation:"
echo "  Tasks completed: $TASKS_COMPLETED"
echo "  PRD file: $PRD_FILE"
echo ""
echo "To resume, run: /ralphy-loop $PRD_FILE"
```

## When to Use

- You want to stop and review progress
- You need to modify the PRD file
- An error occurred that needs manual intervention
- You want to switch to a different PRD file

## After Cancellation

Your completed work is preserved:
- All commits made during the loop remain
- Tasks marked complete in the PRD stay complete
- You can resume with `/ralphy-loop` anytime
