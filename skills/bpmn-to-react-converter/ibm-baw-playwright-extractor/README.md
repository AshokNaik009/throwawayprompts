# IBM BAW Playwright Extractor

Extract Coach Views from IBM BAW Process Designer using Playwright MCP for React migration.

## Quick Start

### Prerequisites
- Playwright MCP configured and running
- IBM BAW Process Designer access (URL + credentials)
- Target Coach View path known

### Execution

Run each phase prompt in order:

```
Phase 1: prompts/phase-1-auth.md      → Login & navigate to Coach View
Phase 2: prompts/phase-2-discovery.md → Discover all elements (shadow DOM)
Phase 3: prompts/phase-3-properties.md → Extract element properties
Phase 4: prompts/phase-4-tabs.md      → Extract Variables & Behavior
Phase 5: prompts/phase-5-debug-preview.md → Capture runtime UI
Phase 6: prompts/phase-6-react.md     → Generate React components
```

### Output Files

```
extraction-output/
├── navigation-status.json           # Phase 1
├── shadow-dom-map.json              # Phase 2
├── discovered-elements.json         # Phase 2
├── systematic-element-properties.json # Phase 3
├── variables-behavior-data.json     # Phase 4
├── debug-preview-data.json          # Phase 5
├── screenshots/                     # All phases
├── react-migration/                 # Phase 6
│   ├── components/*.tsx
│   ├── types/coach-types.ts
│   └── hooks/useCoachBehavior.ts
└── extraction-summary-report.md     # Phase 6
```

## Key Features

### Shadow DOM Support
IBM BAW uses shadow DOM. This skill uses:
- `>>>` deep selectors for Playwright
- `playwright_evaluate` to access shadow roots
- Recursive shadow DOM traversal

### 6-Phase Extraction
1. **Auth** - Login and navigate
2. **Discovery** - Find all elements with shadow DOM support
3. **Properties** - Click each element, extract all property tabs
4. **Tabs** - Extract Variables table and Behavior JavaScript
5. **Debug** - Capture runtime UI (what users actually see)
6. **React** - Generate components from extracted data

### Anti-Hallucination
Each phase:
- Checks prerequisites before starting
- Writes specific output files as proof
- Takes screenshots for verification
- Only extracts what's visible in DOM

## Troubleshooting

### Elements not found
```javascript
// Use shadow DOM piercing selector
page.locator('>>> [data-coach-id]')

// Or use evaluate to query shadow roots directly
page.evaluate(() => {
  return document.querySelector('.host').shadowRoot.querySelector('.element');
})
```

### Properties panel not loading
- Increase wait time after click
- Try clicking element multiple times
- Check if panel is in different shadow root

### CodeMirror code not extracting
```javascript
// Access CodeMirror instance
const code = document.querySelector('.CodeMirror').CodeMirror.getValue();
```

## File Reference

| File | Purpose |
|------|---------|
| SKILL.md | Main skill definition |
| selectors/ibm-baw-selectors.md | Shadow DOM selector reference |
| prompts/phase-*.md | Individual phase execution prompts |
| templates/react-component.md | React component templates |

## Configuration

Update in `prompts/phase-1-auth.md`:
```
TARGET_URL: https://your-baw-server:port/ProcessCenter
USERNAME: your-username
PASSWORD: your-password
PROCESS_APP: Your Process App
SERVICE_NAME: Your Coach View Name
```
