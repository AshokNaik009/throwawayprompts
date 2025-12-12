# Phase 4: Variables & Behavior Tab Extraction

## OBJECTIVE
Extract data from the main editor tabs: Variables (data definitions) and Behavior (JavaScript event handlers).

## PREREQUISITE CHECK

Before starting, verify Phase 3 completed successfully:

```
ACTION: Read systematic-element-properties.json
VERIFY: successfulExtractions > 0
```

**IF PREREQUISITE FAILS**: Stop and report. Do not proceed.

---

## ANTI-HALLUCINATION RULES

1. **DO NOT** invent variable names or types - extract only what's in the table
2. **DO NOT** generate fake JavaScript code - extract actual code from editors
3. **DO NOT** assume behavior handlers exist - verify visually
4. **ALWAYS** use CodeMirror API when available for code extraction
5. **ALWAYS** take screenshots of each tab as proof
6. **HANDLE** CodeMirror instances properly (they don't use standard input values)

---

## STEP-BY-STEP EXECUTION

### Step 1: Navigate to Variables Tab

Click the main editor Variables tab:

```
ACTION: playwright_click
SELECTOR: .editor-tabs .tab:has-text("Variables"), >>> .editor-tab[data-tab="variables"], .tab:has-text("Variables")
```

Wait for tab content to load:

```
ACTION: playwright_wait_for_selector
SELECTOR: .variables-panel, .variables-table, >>> .bpm-variables-panel
TIMEOUT: 5000
```

Take screenshot:

```
ACTION: playwright_screenshot
FILENAME: screenshots/10-variables-tab.png
FULL_PAGE: true
```

---

### Step 2: Extract Variables Table

```
ACTION: playwright_evaluate
CODE:
(() => {
  const variables = [];

  const extractFromTable = (table) => {
    const rows = table.querySelectorAll('tr');

    rows.forEach((row, index) => {
      // Skip header row
      if (index === 0 || row.querySelector('th')) return;

      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const variable = {
          index: variables.length,
          name: cells[0]?.textContent?.trim() || '',
          type: cells[1]?.textContent?.trim() || '',
          binding: cells[2]?.textContent?.trim() || cells[2]?.querySelector('input')?.value || '',
          defaultValue: cells[3]?.textContent?.trim() || cells[3]?.querySelector('input')?.value || '',
          scope: cells[4]?.textContent?.trim() || 'private',
          description: cells[5]?.textContent?.trim() || '',
          isInput: row.classList.contains('input-variable') || cells[4]?.textContent?.includes('Input'),
          isOutput: row.classList.contains('output-variable') || cells[4]?.textContent?.includes('Output'),
          isPrivate: row.classList.contains('private-variable') || cells[4]?.textContent?.includes('Private')
        };

        // Parse complex types
        if (variable.type.includes('[]') || variable.type.includes('List')) {
          variable.isArray = true;
          variable.baseType = variable.type.replace('[]', '').replace('List<', '').replace('>', '').trim();
        }

        // Parse business object types
        if (variable.type.includes('.')) {
          variable.isBusinessObject = true;
          variable.namespace = variable.type.split('.').slice(0, -1).join('.');
          variable.typeName = variable.type.split('.').pop();
        }

        if (variable.name) {
          variables.push(variable);
        }
      }
    });
  };

  // Find variables table in light DOM
  const tables = document.querySelectorAll('.variables-table, table.variables, .variable-list-table');
  tables.forEach(extractFromTable);

  // Check shadow DOM
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      const shadowTables = el.shadowRoot.querySelectorAll('.variables-table, table.variables');
      shadowTables.forEach(extractFromTable);
    }
  });

  // Also look for tree/list structure (alternative to table)
  const treeItems = document.querySelectorAll('.variable-tree-item, .variable-list-item');
  treeItems.forEach((item, index) => {
    const nameEl = item.querySelector('.variable-name');
    const typeEl = item.querySelector('.variable-type');

    if (nameEl) {
      variables.push({
        index: variables.length,
        name: nameEl.textContent?.trim(),
        type: typeEl?.textContent?.trim() || 'ANY',
        source: 'tree'
      });
    }
  });

  return {
    timestamp: new Date().toISOString(),
    totalVariables: variables.length,
    byScope: variables.reduce((acc, v) => {
      const scope = v.isInput ? 'input' : v.isOutput ? 'output' : 'private';
      acc[scope] = (acc[scope] || 0) + 1;
      return acc;
    }, {}),
    byType: variables.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {}),
    variables: variables
  };
})()
```

---

### Step 3: Navigate to Behavior Tab

Click the Behavior tab:

```
ACTION: playwright_click
SELECTOR: .editor-tabs .tab:has-text("Behavior"), >>> .editor-tab[data-tab="behavior"], .tab:has-text("Behavior")
```

Wait for behavior editor to load:

```
ACTION: playwright_wait_for_selector
SELECTOR: .behavior-panel, .behavior-editor, >>> .bpm-behavior-panel, .CodeMirror
TIMEOUT: 5000
```

Take screenshot:

```
ACTION: playwright_screenshot
FILENAME: screenshots/11-behavior-tab.png
FULL_PAGE: true
```

---

### Step 4: Extract Behavior Code (All Event Handlers)

```
ACTION: playwright_evaluate
CODE:
(() => {
  const behaviors = {
    timestamp: new Date().toISOString(),
    eventHandlers: [],
    globalCode: null
  };

  // Extract from CodeMirror instances
  const extractCodeMirror = (cmElement) => {
    // CodeMirror stores instance on the element
    if (cmElement.CodeMirror) {
      return cmElement.CodeMirror.getValue();
    }
    // Alternative: get from textarea
    const textarea = cmElement.querySelector('textarea');
    if (textarea) {
      return textarea.value;
    }
    // Fallback: get text content
    return cmElement.textContent;
  };

  // Find event handler sections
  const eventSections = document.querySelectorAll(
    '.event-section, .behavior-event, .event-handler-section, .handler-block'
  );

  eventSections.forEach(section => {
    const labelEl = section.querySelector('.event-label, .event-type, .handler-label, h3, h4, .section-title');
    const codeEl = section.querySelector('.CodeMirror, .code-editor, textarea, .handler-code');

    if (labelEl || codeEl) {
      const handler = {
        eventType: labelEl?.textContent?.trim()?.replace(':', '') || 'unknown',
        code: '',
        hasCode: false,
        lineCount: 0
      };

      if (codeEl) {
        handler.code = extractCodeMirror(codeEl);
        handler.hasCode = handler.code?.trim()?.length > 0;
        handler.lineCount = handler.code?.split('\n')?.length || 0;
      }

      behaviors.eventHandlers.push(handler);
    }
  });

  // Check shadow DOM for behavior editors
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      const shadowSections = el.shadowRoot.querySelectorAll('.event-section, .behavior-event');
      shadowSections.forEach(section => {
        const labelEl = section.querySelector('.event-label, .event-type');
        const codeEl = section.querySelector('.CodeMirror, textarea');

        if (labelEl && codeEl) {
          const handler = {
            eventType: labelEl.textContent?.trim(),
            code: extractCodeMirror(codeEl),
            hasCode: false
          };
          handler.hasCode = handler.code?.trim()?.length > 0;
          behaviors.eventHandlers.push(handler);
        }
      });
    }
  });

  // Look for specific event types commonly used
  const commonEventTypes = [
    'load', 'unload', 'view', 'change', 'validate',
    'collaboration', 'boundary', 'error', 'before', 'after'
  ];

  commonEventTypes.forEach(eventType => {
    const existingHandler = behaviors.eventHandlers.find(h =>
      h.eventType.toLowerCase().includes(eventType)
    );

    if (!existingHandler) {
      // Check if there's an element specifically for this event
      const eventEl = document.querySelector(
        `[data-event="${eventType}"], .${eventType}-handler, #${eventType}Handler`
      );
      if (eventEl) {
        const codeEl = eventEl.querySelector('.CodeMirror, textarea');
        if (codeEl) {
          behaviors.eventHandlers.push({
            eventType: eventType,
            code: extractCodeMirror(codeEl),
            hasCode: true
          });
        }
      }
    }
  });

  // Summary
  behaviors.summary = {
    totalHandlers: behaviors.eventHandlers.length,
    handlersWithCode: behaviors.eventHandlers.filter(h => h.hasCode).length,
    eventTypes: behaviors.eventHandlers.map(h => h.eventType)
  };

  return behaviors;
})()
```

---

### Step 5: Extract Individual Event Handler Details

For each event handler with code, extract detailed information:

```
ACTION: playwright_evaluate
CODE:
(() => {
  const detailedHandlers = [];

  // Find all CodeMirror instances
  const cmInstances = document.querySelectorAll('.CodeMirror');

  cmInstances.forEach((cm, index) => {
    const editor = cm.CodeMirror;
    if (!editor) return;

    const code = editor.getValue();
    if (!code?.trim()) return;

    // Find parent section to determine event type
    let eventType = 'unknown';
    let parent = cm.closest('.event-section, .behavior-event, .handler-block');
    if (parent) {
      const label = parent.querySelector('.event-label, .event-type, h3, h4');
      eventType = label?.textContent?.trim() || `handler-${index}`;
    }

    // Analyze code
    const analysis = {
      index: index,
      eventType: eventType,
      code: code,
      lineCount: code.split('\n').length,
      analysis: {
        usesCoachView: code.includes('this.context') || code.includes('this.ui'),
        usesBinding: code.includes('tw.local') || code.includes('getBinding') || code.includes('setBinding'),
        usesAjax: code.includes('this.context.trigger') || code.includes('Ajax') || code.includes('fetch'),
        usesValidation: code.includes('setValid') || code.includes('setInvalid') || code.includes('validate'),
        usesVisibility: code.includes('setVisible') || code.includes('setHidden'),
        usesRefresh: code.includes('refresh') || code.includes('refreshData'),
        variablesAccessed: [],
        functionsUsed: []
      }
    };

    // Extract tw.local variable references
    const twLocalMatches = code.match(/tw\.local\.[\w.]+/g) || [];
    analysis.analysis.variablesAccessed = [...new Set(twLocalMatches)];

    // Extract this.context method calls
    const contextCalls = code.match(/this\.context\.\w+/g) || [];
    analysis.analysis.functionsUsed = [...new Set(contextCalls)];

    detailedHandlers.push(analysis);
  });

  return detailedHandlers;
})()
```

---

### Step 6: Take Additional Tab Screenshots

If there are other relevant tabs, capture them:

```
ACTION: playwright_click
SELECTOR: .tab:has-text("Layout"), >>> .editor-tab[data-tab="layout"]
```

```
ACTION: playwright_screenshot
FILENAME: screenshots/12-layout-tab.png
```

```
ACTION: playwright_click
SELECTOR: .tab:has-text("Overview"), >>> .editor-tab[data-tab="overview"]
```

```
ACTION: playwright_screenshot
FILENAME: screenshots/13-overview-tab.png
```

---

## REQUIRED OUTPUT

### File: `variables-behavior-data.json`

```json
{
  "phase": 4,
  "timestamp": "ISO timestamp",
  "variables": {
    "totalVariables": 15,
    "byScope": {
      "input": 5,
      "output": 3,
      "private": 7
    },
    "byType": {
      "String": 8,
      "Integer": 3,
      "Boolean": 2,
      "CustomerData": 2
    },
    "variables": [
      {
        "index": 0,
        "name": "firstName",
        "type": "String",
        "binding": "tw.local.firstName",
        "defaultValue": "",
        "scope": "input",
        "isInput": true,
        "isOutput": false,
        "isPrivate": false
      },
      {
        "index": 1,
        "name": "customerData",
        "type": "com.example.CustomerData",
        "binding": "tw.local.customerData",
        "defaultValue": "new tw.object.CustomerData()",
        "scope": "private",
        "isBusinessObject": true,
        "namespace": "com.example",
        "typeName": "CustomerData"
      }
      // ... all variables
    ]
  },
  "behavior": {
    "summary": {
      "totalHandlers": 5,
      "handlersWithCode": 3,
      "eventTypes": ["load", "change", "validate", "boundary", "view"]
    },
    "eventHandlers": [
      {
        "eventType": "load",
        "code": "// Initialize form\nthis.context.binding.set('tw.local.initialized', true);",
        "hasCode": true,
        "lineCount": 2,
        "analysis": {
          "usesCoachView": true,
          "usesBinding": true,
          "usesAjax": false,
          "usesValidation": false,
          "variablesAccessed": ["tw.local.initialized"],
          "functionsUsed": ["this.context.binding"]
        }
      },
      {
        "eventType": "change",
        "code": "// Handle field change\nvar value = this.context.binding.get('value');\nif (value.length < 3) {\n  this.context.setValid(false, 'Minimum 3 characters');\n}",
        "hasCode": true,
        "lineCount": 5,
        "analysis": {
          "usesCoachView": true,
          "usesBinding": true,
          "usesValidation": true,
          "variablesAccessed": [],
          "functionsUsed": ["this.context.binding", "this.context.setValid"]
        }
      }
      // ... all handlers
    ]
  },
  "screenshots": [
    "screenshots/10-variables-tab.png",
    "screenshots/11-behavior-tab.png",
    "screenshots/12-layout-tab.png",
    "screenshots/13-overview-tab.png"
  ]
}
```

---

## VERIFICATION CHECKLIST

Before marking Phase 4 complete, verify:

- [ ] Variables tab navigated and screenshot taken
- [ ] All variables extracted with name, type, scope
- [ ] Behavior tab navigated and screenshot taken
- [ ] Event handlers extracted with actual code (not placeholders)
- [ ] CodeMirror instances properly accessed
- [ ] Variable bindings match elements from Phase 3
- [ ] `variables-behavior-data.json` contains complete data
- [ ] Code analysis identifies patterns (tw.local usage, etc.)

---

## ERROR HANDLING

If Variables tab is empty or missing:
1. Try alternative selectors
2. Check if variables are in a different location
3. Log warning but continue to Behavior

If Behavior code extraction fails:
1. Try accessing CodeMirror differently
2. Fall back to textarea.value
3. Fall back to textContent
4. Log which method worked

---

## NEXT PHASE

Once Phase 4 completes:
- Proceed to Phase 5: Debug/Runtime Preview
- Phase 5 will capture the actual rendered UI in debug mode
