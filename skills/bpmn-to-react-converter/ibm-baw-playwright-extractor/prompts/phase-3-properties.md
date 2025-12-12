# Phase 3: Systematic Property Extraction

## OBJECTIVE
Click each discovered element and extract ALL properties from the Properties Panel, including all tabs (General, Positioning, Configuration, Events, Visibility).

## PREREQUISITE CHECK

Before starting, verify Phase 2 completed successfully:

```
ACTION: Read discovered-elements.json
VERIFY: totalElements > 0 AND elements array is populated
```

**IF PREREQUISITE FAILS**: Stop and report. Do not proceed.

---

## ANTI-HALLUCINATION RULES

1. **DO NOT** invent property values - extract only what appears in Properties Panel
2. **DO NOT** skip elements - process EVERY element from discovered-elements.json
3. **DO NOT** assume property tabs exist - check before clicking
4. **ALWAYS** wait for Properties Panel to update after clicking element
5. **ALWAYS** take screenshot of each element's properties
6. **HANDLE** extraction failures gracefully - log and continue

---

## STEP-BY-STEP EXECUTION

### Step 1: Load Element Inventory

Read the discovered elements from Phase 2:

```
ACTION: Read discovered-elements.json
STORE: elementsToProcess = result.elements
```

---

### Step 2: Define Property Tab List

The tabs to extract from (verify each exists before clicking):

```javascript
const PROPERTY_TABS = [
  'General',
  'Positioning',
  'Configuration',
  'Events',
  'Visibility',
  'HTML Attributes',
  'Behavior'
];
```

---

### Step 3: Process Each Element

For each element in the inventory:

#### 3.1 Click Element to Select

```
ACTION: playwright_click
SELECTOR: >>> [data-coach-id="${element.coachId}"]
// OR if no coachId:
SELECTOR: >>> [data-control-id="${element.controlId}"]
// OR fallback:
SELECTOR: >>> .coach-view-element:nth-of-type(${element.index + 1})
```

#### 3.2 Wait for Properties Panel

```
ACTION: playwright_wait_for_selector
SELECTOR: .properties-panel, .property-editor-panel, >>> .bpm-properties-panel
TIMEOUT: 5000
```

If Properties Panel doesn't appear, try alternative selectors or skip element with error logged.

#### 3.3 Take Element Screenshot

```
ACTION: playwright_screenshot
FILENAME: screenshots/element-${element.index}-${element.coachId || 'unknown'}.png
```

#### 3.4 Extract Properties from Each Tab

For each tab in PROPERTY_TABS:

```
ACTION: playwright_evaluate
CODE:
(async (tabName, elementIndex) => {
  const result = {
    tab: tabName,
    found: false,
    properties: []
  };

  // Find tab button
  const tabSelectors = [
    `.properties-tabs .tab:has-text("${tabName}")`,
    `.tab-bar .tab:has-text("${tabName}")`,
    `>>> .property-tab:has-text("${tabName}")`,
    `[data-tab="${tabName.toLowerCase()}"]`,
    `.tab[title="${tabName}"]`
  ];

  let tabButton = null;
  for (const selector of tabSelectors) {
    tabButton = document.querySelector(selector);
    if (tabButton) break;

    // Check shadow roots
    for (const el of document.querySelectorAll('*')) {
      if (el.shadowRoot) {
        tabButton = el.shadowRoot.querySelector(selector.replace('>>> ', ''));
        if (tabButton) break;
      }
    }
    if (tabButton) break;
  }

  if (!tabButton) {
    return { ...result, error: `Tab "${tabName}" not found` };
  }

  // Click tab
  tabButton.click();
  await new Promise(r => setTimeout(r, 500));
  result.found = true;

  // Extract properties from panel
  const extractProperties = (root) => {
    const props = [];
    const rows = root.querySelectorAll(
      '.property-row, .property-item, .prop-row, .property-editor-row'
    );

    rows.forEach(row => {
      const nameEl = row.querySelector('.property-name, .property-label, .prop-label, label');
      const valueEl = row.querySelector(
        'input, select, textarea, .property-value, .prop-value, .value-display'
      );

      if (nameEl) {
        const prop = {
          name: nameEl.textContent?.trim(),
          value: null,
          type: 'text'
        };

        if (valueEl) {
          if (valueEl.tagName === 'INPUT') {
            prop.value = valueEl.value;
            prop.type = valueEl.type || 'text';
            prop.checked = valueEl.checked;
          } else if (valueEl.tagName === 'SELECT') {
            prop.value = valueEl.value;
            prop.type = 'select';
            prop.options = Array.from(valueEl.options).map(o => o.value);
          } else if (valueEl.tagName === 'TEXTAREA') {
            prop.value = valueEl.value;
            prop.type = 'textarea';
          } else {
            prop.value = valueEl.textContent?.trim();
          }
        }

        props.push(prop);
      }
    });

    return props;
  };

  // Extract from light DOM
  const panel = document.querySelector('.properties-panel, .property-editor-panel');
  if (panel) {
    result.properties = extractProperties(panel);

    // Also check shadow root
    if (panel.shadowRoot) {
      result.properties.push(...extractProperties(panel.shadowRoot));
    }
  }

  // Check all shadow roots for properties panel
  for (const el of document.querySelectorAll('*')) {
    if (el.shadowRoot) {
      const shadowPanel = el.shadowRoot.querySelector('.properties-panel, .property-editor');
      if (shadowPanel) {
        result.properties.push(...extractProperties(shadowPanel));
      }
    }
  }

  return result;
})(tabName, elementIndex)
```

Store results for each tab.

---

### Step 4: Extract Binding Information

For each element, specifically extract data binding details:

```
ACTION: playwright_evaluate
CODE:
(() => {
  const bindings = {
    mainBinding: null,
    childBindings: [],
    expressions: []
  };

  // Look for binding fields
  const bindingInputs = document.querySelectorAll(
    '[data-property="binding"] input, ' +
    '.binding-input, ' +
    '.data-binding-field input, ' +
    'input[name*="binding"]'
  );

  bindingInputs.forEach(input => {
    const value = input.value?.trim();
    if (value) {
      if (value.startsWith('tw.')) {
        bindings.mainBinding = value;
      } else if (value.includes('#{')) {
        bindings.expressions.push(value);
      } else {
        bindings.childBindings.push(value);
      }
    }
  });

  // Check shadow DOM
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      el.shadowRoot.querySelectorAll('[data-property="binding"] input, .binding-input').forEach(input => {
        const value = input.value?.trim();
        if (value) {
          if (value.startsWith('tw.')) {
            bindings.mainBinding = value;
          } else {
            bindings.childBindings.push(value);
          }
        }
      });
    }
  });

  return bindings;
})()
```

---

### Step 5: Extract Event Handlers

For each element, extract configured events:

```
ACTION: playwright_evaluate
CODE:
(() => {
  const events = [];

  // Look for event configuration in Events tab
  const eventRows = document.querySelectorAll(
    '.event-row, .event-handler, .event-config'
  );

  eventRows.forEach(row => {
    const eventType = row.querySelector('.event-type, .event-name')?.textContent?.trim();
    const handler = row.querySelector('.event-handler-input, .handler-code')?.value ||
                   row.querySelector('.event-handler-input, .handler-code')?.textContent;

    if (eventType) {
      events.push({
        type: eventType,
        handler: handler?.trim() || null,
        hasHandler: !!handler
      });
    }
  });

  // Common event types to check
  const commonEvents = ['change', 'click', 'blur', 'focus', 'load', 'validate', 'boundary'];
  commonEvents.forEach(eventType => {
    const checkbox = document.querySelector(`input[name*="${eventType}"], [data-event="${eventType}"] input`);
    if (checkbox?.checked) {
      events.push({
        type: eventType,
        enabled: true,
        hasHandler: events.some(e => e.type === eventType && e.hasHandler)
      });
    }
  });

  return events;
})()
```

---

### Step 6: Aggregate Results

Combine all extracted data for each element:

```javascript
const elementProperties = {
  index: element.index,
  coachId: element.coachId,
  coachType: element.coachType,
  extractionTimestamp: new Date().toISOString(),
  extractionStatus: 'success|partial|failed',
  properties: {
    General: [...],
    Positioning: [...],
    Configuration: [...],
    Events: [...],
    Visibility: [...],
    HTMLAttributes: [...]
  },
  bindings: {
    mainBinding: 'tw.local.fieldName',
    childBindings: [],
    expressions: []
  },
  eventHandlers: [...],
  screenshot: 'screenshots/element-0-Text1.png',
  errors: []
};
```

---

## REQUIRED OUTPUT

### File: `systematic-element-properties.json`

```json
{
  "phase": 3,
  "timestamp": "ISO timestamp",
  "totalElements": 45,
  "successfulExtractions": 42,
  "partialExtractions": 2,
  "failedExtractions": 1,
  "elements": [
    {
      "index": 0,
      "coachId": "Text1",
      "coachType": "Text",
      "extractionStatus": "success",
      "properties": {
        "General": [
          { "name": "Control ID", "value": "Text1", "type": "text" },
          { "name": "Label", "value": "First Name", "type": "text" },
          { "name": "Label Visibility", "value": "Show", "type": "select" },
          { "name": "Help Text", "value": "", "type": "text" }
        ],
        "Positioning": [
          { "name": "X", "value": "100", "type": "number" },
          { "name": "Y", "value": "200", "type": "number" },
          { "name": "Width", "value": "300", "type": "number" },
          { "name": "Height", "value": "40", "type": "number" }
        ],
        "Configuration": [
          { "name": "Binding", "value": "tw.local.firstName", "type": "text" },
          { "name": "Required", "value": true, "type": "checkbox" },
          { "name": "Read Only", "value": false, "type": "checkbox" },
          { "name": "Placeholder", "value": "Enter first name", "type": "text" }
        ],
        "Events": [
          { "name": "On Change", "value": true, "type": "checkbox" },
          { "name": "On Blur", "value": false, "type": "checkbox" }
        ],
        "Visibility": [
          { "name": "Visible", "value": "true", "type": "expression" },
          { "name": "Condition", "value": "", "type": "text" }
        ]
      },
      "bindings": {
        "mainBinding": "tw.local.firstName",
        "childBindings": [],
        "expressions": []
      },
      "eventHandlers": [
        { "type": "change", "hasHandler": true }
      ],
      "screenshot": "screenshots/element-0-Text1.png"
    }
    // ... all elements
  ],
  "extractionSummary": {
    "propertiesExtracted": 890,
    "bindingsFound": 45,
    "eventsConfigured": 23,
    "screenshotsTaken": 45
  }
}
```

---

## VERIFICATION CHECKLIST

Before marking Phase 3 complete, verify:

- [ ] Every element from discovered-elements.json was processed
- [ ] Properties extracted from multiple tabs (not just General)
- [ ] Binding information captured for bound elements
- [ ] Event handlers identified
- [ ] Screenshots taken for each element
- [ ] `systematic-element-properties.json` contains complete data
- [ ] Failed extractions logged with reasons

---

## ERROR HANDLING

For each element extraction failure:
1. Log element ID and error reason
2. Mark element as `extractionStatus: "failed"`
3. Include error in element's `errors` array
4. Continue to next element
5. **DO NOT** stop entire phase for single element failure

---

## NEXT PHASE

Once Phase 3 completes:
- Proceed to Phase 4: Variables & Behavior Tab Extraction
- Phase 4 will extract editor-level Variables and Behavior code
