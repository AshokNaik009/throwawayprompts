---
name: ibm-baw-playwright-extractor
description: Extract IBM BAW/BPM Coach Views via Playwright MCP for React migration. Handles shadow DOM, nested components, properties panels, and runtime debug preview. Use when extracting UI from live IBM BAW Process Designer for modernization to React.js.
allowed-tools: Read, Write, Edit, Bash
---

# IBM BAW Playwright Coach View Extractor

Extract Coach Views from IBM BAW (Business Automation Workflow) Process Designer using Playwright MCP with full shadow DOM support. Designed for React migration projects.

## When to Use This Skill

Use this skill when you need to:
- Extract Coach Views from a **live** IBM BAW Process Designer instance
- Migrate IBM BAW/BPM UI to React.js
- Capture both design-time AND runtime UI structure
- Handle shadow DOM elements in IBM BAW
- Extract element properties, variables, and behavior code

## Prerequisites

1. **Playwright MCP** must be configured and running
2. Access to IBM BAW Process Designer (URL + credentials)
3. Target Coach View path known (Process App → Human Service → Coach)

## Execution Flow (6 Phases)

Execute each phase in order. Each phase produces output files that subsequent phases depend on.

```
Phase 1 (Auth)     → navigation-status.json
Phase 2 (Discover) → discovered-elements.json, shadow-dom-map.json
Phase 3 (Props)    → systematic-element-properties.json
Phase 4 (Tabs)     → variables-behavior-data.json
Phase 5 (Debug)    → debug-preview-data.json, runtime screenshots
Phase 6 (React)    → React components, TypeScript types, summary report
```

## Phase Prompts

Read and execute each phase prompt in the `prompts/` directory:

1. **[prompts/phase-1-auth.md](prompts/phase-1-auth.md)** - Authentication & Navigation
2. **[prompts/phase-2-discovery.md](prompts/phase-2-discovery.md)** - Shadow DOM Element Discovery
3. **[prompts/phase-3-properties.md](prompts/phase-3-properties.md)** - Systematic Property Extraction
4. **[prompts/phase-4-tabs.md](prompts/phase-4-tabs.md)** - Variables & Behavior Tab Extraction
5. **[prompts/phase-5-debug-preview.md](prompts/phase-5-debug-preview.md)** - Debug/Runtime Preview
6. **[prompts/phase-6-react.md](prompts/phase-6-react.md)** - React Migration Mapping

## Playwright MCP Tools Used

This skill uses the following Playwright MCP tools:

| Tool | Purpose |
|------|---------|
| `playwright_navigate` | Navigate to URLs |
| `playwright_click` | Click elements (supports shadow DOM with `>>>`) |
| `playwright_fill` | Fill input fields |
| `playwright_screenshot` | Capture screenshots |
| `playwright_evaluate` | Execute JavaScript in browser context |
| `playwright_wait_for_selector` | Wait for elements to appear |

## Shadow DOM Handling

IBM BAW Process Designer uses shadow DOM extensively. Key patterns:

```javascript
// Standard selector (WON'T WORK for shadow DOM)
page.locator('.coach-element')

// Shadow DOM piercing selector (CORRECT)
page.locator('>>> .coach-element')

// Evaluate to access shadow roots directly
page.evaluate(() => {
  const host = document.querySelector('.shadow-host');
  return host.shadowRoot.querySelector('.inner-element');
});
```

See [selectors/ibm-baw-selectors.md](selectors/ibm-baw-selectors.md) for comprehensive selector reference.

## Output Structure

After all phases complete, you'll have:

```
extraction-output/
├── navigation-status.json           # Phase 1
├── shadow-dom-map.json              # Phase 2
├── discovered-elements.json         # Phase 2
├── systematic-element-properties.json # Phase 3
├── variables-behavior-data.json     # Phase 4
├── debug-preview-data.json          # Phase 5
├── screenshots/
│   ├── 01-login.png
│   ├── 02-navigation.png
│   ├── 03-canvas-full.png
│   ├── 04-element-*.png
│   ├── 05-debug-empty.png
│   ├── 06-debug-filled.png
│   └── 07-debug-validation.png
├── react-migration/
│   ├── components/
│   │   └── *.tsx
│   ├── types/
│   │   └── coach-types.ts
│   └── hooks/
│       └── useCoachData.ts
└── extraction-summary-report.md
```

## Anti-Hallucination Rules

Each phase prompt enforces:

1. **PREREQUISITE CHECK** - Verify previous phase output exists before starting
2. **SINGLE RESPONSIBILITY** - Each phase does ONE thing only
3. **REQUIRED OUTPUT** - Must write specific JSON/files as proof of work
4. **NO ASSUMPTIONS** - Extract only what's actually visible in the DOM
5. **SCREENSHOT VERIFICATION** - Take screenshots to prove actions completed

## Configuration

Before running, update the target configuration in Phase 1:

```
Target URL: https://your-baw-server:port/ProcessCenter
Username: your-username
Password: your-password
Process App: Your Process App Name
Human Service: Your Human Service Name
Coach View: Your Coach View Name
```

## Troubleshooting

### Elements not found
- Check if element is inside shadow DOM
- Use `>>> selector` for shadow DOM piercing
- Try `playwright_evaluate` to query shadow roots directly

### Properties panel not loading
- Increase wait time after clicking element
- Check if panel is in a different shadow root
- Try clicking element multiple times

### Debug mode not launching
- Look for "Debug" or "Run" button in toolbar
- May open in new tab - check all browser tabs
- Some versions use "Preview" instead of "Debug"

### CodeMirror content not extracting
- Use `playwright_evaluate` to access CodeMirror API
- Try `editor.getValue()` on CodeMirror instance
- Check for `.CodeMirror` class in DOM

## Related Resources

- [IBM BAW Selectors Reference](selectors/ibm-baw-selectors.md)
- [React Component Templates](templates/react-component.md)
- [TWX Pattern Reference](../bpmn-to-react-converter/docs/twx-patterns.md)
- [Data Binding Conversion Guide](../bpmn-to-react-converter/docs/data-bindings.md)
