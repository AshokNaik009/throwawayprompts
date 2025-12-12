# Phase 5: Debug/Runtime Preview

## OBJECTIVE
Launch the Coach View in debug/runtime mode to capture the ACTUAL rendered UI that end users will see. This provides visual reference for accurate React component generation.

## PREREQUISITE CHECK

Before starting, verify Phase 4 completed successfully:

```
ACTION: Read variables-behavior-data.json
VERIFY: File exists and contains variables/behavior data
```

**IF PREREQUISITE FAILS**: Stop and report. Do not proceed.

---

## ANTI-HALLUCINATION RULES

1. **DO NOT** assume runtime UI matches design-time view
2. **DO NOT** invent form values - use test data or leave empty
3. **DO NOT** skip validation error capture - it shows error UI patterns
4. **ALWAYS** wait for debug window to fully load
5. **ALWAYS** handle new tab/popup scenarios
6. **CAPTURE** multiple states: empty, filled, validation errors

---

## STEP-BY-STEP EXECUTION

### Step 1: Find and Click Debug Button

Locate the Debug/Run/Preview button in the toolbar:

```
ACTION: playwright_evaluate
CODE:
(() => {
  // Common selectors for debug/run button
  const selectors = [
    'button:has-text("Debug")',
    'button:has-text("Run")',
    'button:has-text("Preview")',
    '.toolbar-button.debug',
    '.toolbar-button.run',
    '[data-action="debug"]',
    '[data-action="run"]',
    '[title="Debug"]',
    '[title="Run"]',
    '.debug-button',
    '.run-button'
  ];

  for (const selector of selectors) {
    let button = document.querySelector(selector);
    if (button) {
      return { found: true, selector: selector, text: button.textContent };
    }

    // Check shadow DOM
    for (const el of document.querySelectorAll('*')) {
      if (el.shadowRoot) {
        button = el.shadowRoot.querySelector(selector);
        if (button) {
          return { found: true, selector: `>>> ${selector}`, text: button.textContent, inShadow: true };
        }
      }
    }
  }

  return { found: false, availableButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean) };
})()
```

Click the debug button:

```
ACTION: playwright_click
SELECTOR: ${debugButtonSelector}
```

---

### Step 2: Handle New Window/Tab

Debug mode often opens in a new tab or popup:

```
ACTION: playwright_evaluate
CODE:
(async () => {
  // Wait for potential new window
  await new Promise(r => setTimeout(r, 2000));

  // Check for new windows/tabs
  const result = {
    sameWindow: false,
    newWindow: false,
    iframe: false,
    debugUrl: null
  };

  // Check for runtime container in same window
  const runtimeContainer = document.querySelector(
    '.runtime-view, .debug-container, .coach-runtime, .preview-container'
  );
  if (runtimeContainer) {
    result.sameWindow = true;
    return result;
  }

  // Check for iframe
  const iframe = document.querySelector('iframe.debug-frame, iframe.preview-frame, iframe[src*="debug"], iframe[src*="preview"]');
  if (iframe) {
    result.iframe = true;
    result.debugUrl = iframe.src;
    return result;
  }

  return result;
})()
```

If new tab opened, switch to it:

```
ACTION: playwright_evaluate
CODE:
// Get all window handles and switch to the debug window
// This depends on Playwright MCP's multi-tab support
// The new tab URL typically contains "debug", "preview", or "runtime"
```

---

### Step 3: Wait for Runtime UI to Load

```
ACTION: playwright_wait_for_selector
SELECTOR: .runtime-form, .coach-form, .rendered-coach, >>> .runtime-container, form
TIMEOUT: 15000
```

Take initial screenshot (empty state):

```
ACTION: playwright_screenshot
FILENAME: screenshots/14-debug-empty-state.png
FULL_PAGE: true
```

---

### Step 4: Extract Runtime HTML Structure

```
ACTION: playwright_evaluate
CODE:
(() => {
  const runtimeData = {
    timestamp: new Date().toISOString(),
    htmlStructure: null,
    formElements: [],
    cssClasses: [],
    computedStyles: {}
  };

  // Find the runtime form container
  const container = document.querySelector(
    '.runtime-form, .coach-form, .rendered-coach, .preview-container, form'
  ) || document.body;

  // Get clean HTML structure (without scripts and excessive attributes)
  const getCleanHTML = (element, depth = 0) => {
    if (depth > 10) return '<!-- max depth -->';
    if (!element || element.nodeType !== 1) return '';

    const tag = element.tagName.toLowerCase();
    const importantAttrs = ['id', 'class', 'type', 'name', 'placeholder', 'value', 'data-coach-id', 'data-binding'];

    let attrs = importantAttrs
      .filter(attr => element.getAttribute(attr))
      .map(attr => `${attr}="${element.getAttribute(attr)}"`)
      .join(' ');

    if (attrs) attrs = ' ' + attrs;

    const children = Array.from(element.children)
      .map(child => getCleanHTML(child, depth + 1))
      .filter(Boolean)
      .join('\n' + '  '.repeat(depth + 1));

    if (children) {
      return `<${tag}${attrs}>\n${'  '.repeat(depth + 1)}${children}\n${'  '.repeat(depth)}</${tag}>`;
    } else if (element.textContent?.trim()) {
      return `<${tag}${attrs}>${element.textContent.trim().substring(0, 50)}</${tag}>`;
    } else {
      return `<${tag}${attrs}/>`;
    }
  };

  runtimeData.htmlStructure = getCleanHTML(container);

  // Extract all form elements
  const formElements = container.querySelectorAll('input, select, textarea, button');
  formElements.forEach(el => {
    runtimeData.formElements.push({
      tagName: el.tagName,
      type: el.type || null,
      name: el.name || null,
      id: el.id || null,
      className: el.className || null,
      placeholder: el.placeholder || null,
      value: el.value || null,
      required: el.required,
      disabled: el.disabled,
      readonly: el.readOnly,
      label: el.labels?.[0]?.textContent?.trim() || null
    });
  });

  // Collect unique CSS classes
  const allClasses = new Set();
  container.querySelectorAll('*').forEach(el => {
    el.classList.forEach(c => allClasses.add(c));
  });
  runtimeData.cssClasses = Array.from(allClasses);

  // Get computed styles for key elements
  const keyElements = container.querySelectorAll('.form-group, .field-container, .input-wrapper, .form-control');
  keyElements.forEach((el, index) => {
    if (index < 5) { // Limit to first 5
      const styles = window.getComputedStyle(el);
      runtimeData.computedStyles[`element-${index}`] = {
        className: el.className,
        display: styles.display,
        flexDirection: styles.flexDirection,
        gap: styles.gap,
        padding: styles.padding,
        margin: styles.margin,
        border: styles.border,
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize,
        fontFamily: styles.fontFamily
      };
    }
  });

  return runtimeData;
})()
```

---

### Step 5: Fill Form with Test Data

Read variables from Phase 4 and fill form:

```
ACTION: playwright_evaluate
CODE:
(async (variables) => {
  const fillResults = [];

  // Test data mapping by type
  const testData = {
    'String': 'Test Value',
    'Integer': '123',
    'Decimal': '123.45',
    'Boolean': true,
    'Date': '2024-01-15',
    'Email': 'test@example.com',
    'Phone': '555-123-4567'
  };

  for (const variable of variables || []) {
    // Find input by various attributes
    const selectors = [
      `[data-binding*="${variable.name}"]`,
      `[name="${variable.name}"]`,
      `[name*="${variable.name}"]`,
      `#${variable.name}`,
      `[data-field="${variable.name}"]`
    ];

    let input = null;
    for (const selector of selectors) {
      input = document.querySelector(selector);
      if (input) break;
    }

    if (input && !input.disabled && !input.readOnly) {
      const testValue = testData[variable.type] || testData['String'];

      if (input.type === 'checkbox') {
        input.checked = testValue;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (input.tagName === 'SELECT') {
        if (input.options.length > 1) {
          input.selectedIndex = 1;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        input.value = testValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      fillResults.push({
        variable: variable.name,
        selector: selectors.find(s => document.querySelector(s)),
        filled: true,
        value: testValue
      });
    } else {
      fillResults.push({
        variable: variable.name,
        filled: false,
        reason: input ? (input.disabled ? 'disabled' : 'readonly') : 'not found'
      });
    }

    // Small delay between fills
    await new Promise(r => setTimeout(r, 100));
  }

  return fillResults;
})(variablesFromPhase4)
```

Take screenshot with filled data:

```
ACTION: playwright_screenshot
FILENAME: screenshots/15-debug-filled-state.png
FULL_PAGE: true
```

---

### Step 6: Trigger Validation Errors

Clear required fields to show validation messages:

```
ACTION: playwright_evaluate
CODE:
(async () => {
  const validationResults = [];

  // Find required fields
  const requiredFields = document.querySelectorAll(
    '[required], [data-required="true"], .required input, .required select'
  );

  requiredFields.forEach(field => {
    // Clear the field
    if (field.type === 'checkbox') {
      field.checked = false;
    } else {
      field.value = '';
    }

    // Trigger validation
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));

    validationResults.push({
      field: field.name || field.id,
      type: field.type,
      cleared: true
    });
  });

  // Wait for validation messages to appear
  await new Promise(r => setTimeout(r, 500));

  // Click submit to trigger form-level validation
  const submitBtn = document.querySelector(
    'button[type="submit"], input[type="submit"], .submit-button, button:has-text("Submit")'
  );
  if (submitBtn) {
    submitBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Capture validation messages
  const errorMessages = document.querySelectorAll(
    '.error-message, .validation-error, .field-error, .invalid-feedback, [role="alert"]'
  );

  validationResults.push({
    errorMessagesFound: errorMessages.length,
    messages: Array.from(errorMessages).map(el => ({
      text: el.textContent?.trim(),
      className: el.className,
      nearField: el.previousElementSibling?.name || el.closest('.form-group')?.querySelector('input')?.name
    }))
  });

  return validationResults;
})()
```

Take screenshot with validation errors:

```
ACTION: playwright_screenshot
FILENAME: screenshots/16-debug-validation-errors.png
FULL_PAGE: true
```

---

### Step 7: Capture Dynamic Behaviors

Check for conditionally shown elements:

```
ACTION: playwright_evaluate
CODE:
(() => {
  const dynamicBehaviors = {
    conditionalElements: [],
    calculatedFields: [],
    dependentFields: []
  };

  // Find elements with visibility conditions
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    // Check for ngIf-like attributes or data attributes
    const visibilityAttr = el.getAttribute('data-visible') ||
                          el.getAttribute('data-show-when') ||
                          el.getAttribute('ng-if') ||
                          el.getAttribute('v-if');

    if (visibilityAttr) {
      dynamicBehaviors.conditionalElements.push({
        element: el.tagName,
        id: el.id,
        condition: visibilityAttr,
        currentlyVisible: el.offsetParent !== null
      });
    }

    // Check for calculated/readonly fields that show computed values
    if (el.tagName === 'INPUT' && el.readOnly && el.value) {
      dynamicBehaviors.calculatedFields.push({
        id: el.id || el.name,
        value: el.value,
        binding: el.getAttribute('data-binding')
      });
    }
  });

  // Find dependent dropdowns (select elements that might filter based on others)
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    const dependsOn = select.getAttribute('data-depends-on') ||
                     select.getAttribute('data-parent');
    if (dependsOn) {
      dynamicBehaviors.dependentFields.push({
        field: select.name || select.id,
        dependsOn: dependsOn
      });
    }
  });

  return dynamicBehaviors;
})()
```

---

### Step 8: Extract Component Layout Information

```
ACTION: playwright_evaluate
CODE:
(() => {
  const layoutInfo = {
    containerStructure: [],
    gridLayouts: [],
    formGroups: []
  };

  // Find main layout containers
  const containers = document.querySelectorAll(
    '.container, .row, .col, .form-row, .section, .panel, .card'
  );

  containers.forEach((container, index) => {
    if (index < 20) { // Limit
      const rect = container.getBoundingClientRect();
      layoutInfo.containerStructure.push({
        tagName: container.tagName,
        className: container.className,
        childCount: container.children.length,
        dimensions: {
          width: rect.width,
          height: rect.height
        }
      });
    }
  });

  // Find grid/flex layouts
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    const styles = window.getComputedStyle(el);
    if (styles.display === 'grid' || styles.display === 'flex') {
      layoutInfo.gridLayouts.push({
        className: el.className,
        display: styles.display,
        flexDirection: styles.flexDirection,
        gridTemplateColumns: styles.gridTemplateColumns,
        gap: styles.gap
      });
    }
  });

  // Find form groups (label + input pairs)
  const formGroups = document.querySelectorAll('.form-group, .field-wrapper, .input-group');
  formGroups.forEach(group => {
    const label = group.querySelector('label');
    const input = group.querySelector('input, select, textarea');

    if (label && input) {
      layoutInfo.formGroups.push({
        label: label.textContent?.trim(),
        inputType: input.type || input.tagName,
        inputName: input.name || input.id,
        required: input.required
      });
    }
  });

  return layoutInfo;
})()
```

---

## REQUIRED OUTPUT

### File: `debug-preview-data.json`

```json
{
  "phase": 5,
  "timestamp": "ISO timestamp",
  "debugMode": {
    "launchMethod": "button click",
    "openedIn": "new tab|same window|iframe"
  },
  "runtimeUI": {
    "htmlStructure": "<div class=\"form-container\">...</div>",
    "formElements": [
      {
        "tagName": "INPUT",
        "type": "text",
        "name": "firstName",
        "id": "field_firstName",
        "placeholder": "Enter first name",
        "required": true,
        "label": "First Name"
      }
    ],
    "cssClasses": ["form-control", "form-group", "required-field", ...],
    "computedStyles": {
      "element-0": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px"
      }
    }
  },
  "formFill": {
    "filled": [
      { "variable": "firstName", "value": "Test Value", "filled": true }
    ],
    "notFilled": [
      { "variable": "readOnlyField", "reason": "readonly" }
    ]
  },
  "validation": {
    "errorsTriggered": true,
    "errorMessages": [
      {
        "text": "This field is required",
        "nearField": "email"
      }
    ]
  },
  "dynamicBehaviors": {
    "conditionalElements": [
      { "condition": "showAdvanced === true", "currentlyVisible": false }
    ],
    "calculatedFields": [],
    "dependentFields": []
  },
  "layout": {
    "containerStructure": [...],
    "gridLayouts": [...],
    "formGroups": [...]
  },
  "screenshots": [
    "screenshots/14-debug-empty-state.png",
    "screenshots/15-debug-filled-state.png",
    "screenshots/16-debug-validation-errors.png"
  ]
}
```

---

## VERIFICATION CHECKLIST

Before marking Phase 5 complete, verify:

- [ ] Debug mode successfully launched
- [ ] Empty state screenshot captured
- [ ] Form filled with test data
- [ ] Filled state screenshot captured
- [ ] Validation errors triggered and captured
- [ ] Validation screenshot captured
- [ ] Runtime HTML structure extracted
- [ ] Form elements cataloged
- [ ] CSS classes identified
- [ ] Dynamic behaviors documented
- [ ] `debug-preview-data.json` contains complete data

---

## ERROR HANDLING

If debug button not found:
1. Try all alternative selectors
2. Check toolbar in shadow DOM
3. Log available buttons for manual identification
4. **Allow user to manually start debug mode**

If debug window doesn't open:
1. Wait longer for new tab
2. Check for modal/overlay in same page
3. Check for iframe embed
4. Screenshot current state for diagnosis

---

## NEXT PHASE

Once Phase 5 completes:
- Proceed to Phase 6: React Migration Mapping
- Phase 6 will use all extracted data to generate React components
