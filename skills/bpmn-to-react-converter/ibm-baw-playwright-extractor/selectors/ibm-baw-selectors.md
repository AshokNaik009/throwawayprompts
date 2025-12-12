# IBM BAW Shadow DOM Selectors Reference

Comprehensive selector patterns for IBM BAW Process Designer elements with shadow DOM support.

## Shadow DOM Fundamentals

### Why Shadow DOM Matters

IBM BAW Process Designer uses shadow DOM to encapsulate UI components. Standard CSS selectors cannot pierce shadow boundaries:

```javascript
// FAILS - cannot see inside shadow DOM
document.querySelector('.coach-canvas .element-inside-shadow');

// WORKS - pierces shadow DOM
document.querySelector('.shadow-host').shadowRoot.querySelector('.element-inside-shadow');
```

### Playwright Shadow DOM Syntax

```javascript
// Deep combinator (>>>) - pierces all shadow roots
page.locator('>>> .target-element')

// Chained shadow piercing
page.locator('.host >>> .nested-host >>> .deep-element')

// Light DOM followed by shadow DOM
page.locator('.light-element >> .shadow-host >>> .shadow-element')
```

---

## Login Page Selectors

```javascript
// Username field
'input[name="j_username"]'
'#j_username'
'>>> input[type="text"][name*="user"]'

// Password field
'input[name="j_password"]'
'#j_password'
'>>> input[type="password"]'

// Login button
'input[type="submit"]'
'button:has-text("Log in")'
'>>> .login-button'
```

---

## Process Center Navigation

```javascript
// Process Apps list
'.process-app-list'
'>>> .process-app-item'
'[data-app-name]'

// Process App tile/card
'.app-tile:has-text("${appName}")'
'>>> .process-app-card[title="${appName}"]'

// User Interface section
'.artifact-category:has-text("User Interface")'
'>>> .category-item:has-text("User Interface")'

// Human Service list
'.human-service-list'
'>>> .service-item'

// Client-Side Human Service
'.cshs-item:has-text("${serviceName}")'
'>>> [data-artifact-type="ClientSideHumanService"]'
```

---

## Coach View Designer Canvas

### Main Canvas Container

```javascript
// Coach designer main container
'.coach-designer'
'.coach-canvas-container'
'>>> .bpm-coach-designer'

// Canvas viewport
'.coach-canvas'
'.coach-viewport'
'>>> .design-surface'

// Canvas scroll container
'.canvas-scroll-container'
'>>> .scroll-wrapper'
```

### Coach View Elements on Canvas

```javascript
// All coach elements (generic)
'>>> [data-coach-id]'
'>>> .coach-view-element'
'>>> .cv-element'

// By element type
'>>> [data-coach-type="Text"]'
'>>> [data-coach-type="Button"]'
'>>> [data-coach-type="Table"]'
'>>> [data-coach-type="Section"]'
'>>> [data-coach-type="OutputText"]'
'>>> [data-coach-type="Select"]'
'>>> [data-coach-type="CheckBox"]'
'>>> [data-coach-type="RadioButtonGroup"]'
'>>> [data-coach-type="DateTimePicker"]'

// By control ID
'>>> [data-control-id="${controlId}"]'

// Selected element
'>>> .coach-view-element.selected'
'>>> .cv-element.active'

// Nested elements
'>>> .section-container >>> .coach-view-element'
```

---

## Properties Panel

### Panel Container

```javascript
// Properties panel main container
'.properties-panel'
'.property-editor-panel'
'>>> .bpm-properties-panel'

// Panel header
'.properties-panel-header'
'>>> .panel-title'
```

### Property Tabs

```javascript
// Tab bar
'.properties-tabs'
'.tab-bar'
'>>> .property-tabs-container'

// Individual tabs
'.tab:has-text("General")'
'.tab:has-text("Positioning")'
'.tab:has-text("Configuration")'
'.tab:has-text("Events")'
'.tab:has-text("Visibility")'
'.tab:has-text("HTML Attributes")'

// Active tab
'.tab.active'
'.tab.selected'
'>>> .tab[aria-selected="true"]'
```

### Property Rows

```javascript
// All property rows
'.property-row'
'.property-item'
'>>> .property-editor-row'

// Property name/label
'.property-name'
'.property-label'
'>>> .prop-label'

// Property value (varies by type)
'.property-value'
'.property-input'
'>>> .prop-value'

// Text input properties
'.property-row input[type="text"]'
'>>> .property-input input'

// Checkbox properties
'.property-row input[type="checkbox"]'
'>>> .property-checkbox'

// Select/dropdown properties
'.property-row select'
'>>> .property-select'

// Binding field
'.binding-input'
'.data-binding-field'
'>>> [data-property="binding"]'
```

---

## Editor Tabs (Main)

### Tab Navigation

```javascript
// Main editor tabs
'.editor-tabs'
'.main-tab-bar'
'>>> .bpm-editor-tabs'

// Diagram tab
'.tab:has-text("Diagram")'
'>>> .editor-tab[data-tab="diagram"]'

// Variables tab
'.tab:has-text("Variables")'
'>>> .editor-tab[data-tab="variables"]'

// Behavior tab
'.tab:has-text("Behavior")'
'>>> .editor-tab[data-tab="behavior"]'

// Layout tab
'.tab:has-text("Layout")'
'>>> .editor-tab[data-tab="layout"]'
```

### Variables Tab Content

```javascript
// Variables table container
'.variables-panel'
'.variables-table-container'
'>>> .bpm-variables-panel'

// Variables table
'.variables-table'
'table.variables'
'>>> .variable-list-table'

// Variable rows
'.variables-table tr'
'.variable-row'
'>>> .variable-item'

// Variable columns
'.variable-name'     // Column 1
'.variable-type'     // Column 2
'.variable-binding'  // Column 3
'.variable-default'  // Column 4
'.variable-scope'    // Column 5
```

### Behavior Tab Content

```javascript
// Behavior editor container
'.behavior-panel'
'.behavior-editor-container'
'>>> .bpm-behavior-panel'

// Event sections
'.event-section'
'.behavior-event'
'>>> .event-handler-section'

// Event type labels
'.event-label'
'.event-type'
'>>> .handler-label'

// Common event types
'.event-section:has-text("load")'
'.event-section:has-text("change")'
'.event-section:has-text("click")'
'.event-section:has-text("validate")'
'.event-section:has-text("view")'
'.event-section:has-text("boundary")'

// Code editor (CodeMirror)
'.CodeMirror'
'.code-editor'
'>>> .behavior-code-editor'
```

---

## Collapsible Sections

```javascript
// Accordion toggles
'.accordion-toggle'
'.accordion-header'
'>>> .collapsible-trigger'

// Collapsed state
'.accordion-toggle.collapsed'
'[aria-expanded="false"]'
'>>> .collapsed-section'

// Expanded state
'.accordion-toggle.expanded'
'[aria-expanded="true"]'
'>>> .expanded-section'

// Accordion content
'.accordion-content'
'.accordion-body'
'>>> .collapsible-content'

// Memo/note expansion
'.memo-expand'
'.memo-toggle'
'>>> .expandable-memo'
```

---

## Toolbar & Debug

```javascript
// Main toolbar
'.designer-toolbar'
'.editor-toolbar'
'>>> .bpm-toolbar'

// Debug/Run button
'button:has-text("Debug")'
'button:has-text("Run")'
'.toolbar-button.debug'
'>>> .debug-button'
'>>> [data-action="debug"]'

// Save button
'button:has-text("Save")'
'.toolbar-button.save'
'>>> .save-button'

// Preview button (alternative to Debug)
'button:has-text("Preview")'
'.toolbar-button.preview'
'>>> .preview-button'
```

---

## Debug/Runtime View

```javascript
// Debug window container
'.debug-container'
'.runtime-view'
'>>> .coach-runtime'

// Runtime form
'.runtime-form'
'.coach-form'
'>>> .rendered-coach'

// Runtime input fields
'.runtime-form input'
'.coach-form input'
'>>> .runtime-input'

// Runtime buttons
'.runtime-form button'
'.coach-form button'
'>>> .runtime-button'

// Validation messages
'.validation-error'
'.error-message'
'>>> .field-error'
'>>> .validation-feedback'

// Form sections at runtime
'.runtime-section'
'.form-section'
'>>> .runtime-container'
```

---

## Popup/Modal Dialogs

```javascript
// Dialog overlay
'.dialog-overlay'
'.modal-backdrop'
'>>> .popup-overlay'

// Dialog container
'.dialog-container'
'.modal-dialog'
'>>> .popup-dialog'

// Dialog close button
'.dialog-close'
'.modal-close'
'>>> button.close-dialog'
'button:has-text("Close")'
'button:has-text("Cancel")'
'button:has-text("OK")'

// Dialog dismiss (click outside)
'.dialog-overlay' // Click this to dismiss
```

---

## Evaluate Patterns

### Get All Elements with Shadow DOM

```javascript
await page.evaluate(() => {
  const getAllElements = (root, elements = []) => {
    // Get elements in current root
    const coachElements = root.querySelectorAll('[data-coach-id]');
    elements.push(...Array.from(coachElements));

    // Recurse into shadow roots
    root.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        getAllElements(el.shadowRoot, elements);
      }
    });

    return elements;
  };

  return getAllElements(document).map(el => ({
    id: el.getAttribute('data-coach-id'),
    type: el.getAttribute('data-coach-type'),
    rect: el.getBoundingClientRect()
  }));
});
```

### Expand All Collapsibles

```javascript
await page.evaluate(() => {
  const expandAll = async (root) => {
    const toggles = root.querySelectorAll(
      '[aria-expanded="false"], ' +
      '.accordion-toggle:not(.expanded), ' +
      '.collapsed'
    );

    for (const toggle of toggles) {
      toggle.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // Recurse into shadow roots
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        await expandAll(el.shadowRoot);
      }
    }
  };

  await expandAll(document);
});
```

### Extract Properties Panel Data

```javascript
await page.evaluate(() => {
  const panel = document.querySelector('.properties-panel');
  const root = panel?.shadowRoot || panel;

  return Array.from(root.querySelectorAll('.property-row')).map(row => ({
    name: row.querySelector('.property-name')?.textContent?.trim(),
    value: row.querySelector('input')?.value ||
           row.querySelector('select')?.value ||
           row.querySelector('.property-value')?.textContent?.trim(),
    type: row.querySelector('input')?.type || 'text'
  }));
});
```

### Extract CodeMirror Content

```javascript
await page.evaluate(() => {
  const editors = document.querySelectorAll('.CodeMirror');
  return Array.from(editors).map(cm => {
    // Access CodeMirror instance
    const editor = cm.CodeMirror;
    return editor ? editor.getValue() : cm.textContent;
  });
});
```

---

## Common Selector Patterns Summary

| Element | Light DOM | Shadow DOM |
|---------|-----------|------------|
| Coach element | `.coach-view-element` | `>>> [data-coach-id]` |
| Properties panel | `.properties-panel` | `>>> .bpm-properties-panel` |
| Property row | `.property-row` | `>>> .property-editor-row` |
| Variables tab | `.tab:has-text("Variables")` | `>>> .editor-tab[data-tab="variables"]` |
| Behavior tab | `.tab:has-text("Behavior")` | `>>> .editor-tab[data-tab="behavior"]` |
| Debug button | `button:has-text("Debug")` | `>>> .debug-button` |
| Collapsible | `.accordion-toggle` | `>>> [aria-expanded]` |
| Code editor | `.CodeMirror` | `>>> .behavior-code-editor` |
