# Phase 1: Authentication & Navigation

## OBJECTIVE
Handle IBM BAW Process Designer login and navigate to the target Coach View.

## CONFIGURATION (Update before running)

```
TARGET_URL: https://bpmuatpfsapp2.enbduat.com:9444/ProcessCenter
USERNAME: AshokNjjj
PASSWORD: 
PROCESS_APP: Retail Fixed Deposit Process
SECTION: User Interface
SERVICE_TYPE: Client-Side Human Service
SERVICE_NAME: Initiate Retail Deposit Account Opening
```

---

## ANTI-HALLUCINATION RULES

1. **DO NOT** assume any page state - verify with screenshots
2. **DO NOT** proceed if login fails - report and stop
3. **DO NOT** guess navigation paths - follow exact steps
4. **ALWAYS** take screenshots after each major action
5. **ONLY** write to `navigation-status.json` when ALL steps complete successfully

---

## STEP-BY-STEP EXECUTION

### Step 1: Navigate to Process Center

```
ACTION: playwright_navigate
URL: ${TARGET_URL}
```

Wait for page to fully load. Take screenshot:

```
ACTION: playwright_screenshot
FILENAME: screenshots/01-initial-page.png
```

---

### Step 2: Handle Login

Check if login form is present:

```
ACTION: playwright_wait_for_selector
SELECTOR: input[name="j_username"], #j_username, input[type="text"]
TIMEOUT: 10000
```

If login form found, fill credentials:

```
ACTION: playwright_fill
SELECTOR: input[name="j_username"]
VALUE: ${USERNAME}
```

```
ACTION: playwright_fill
SELECTOR: input[name="j_password"]
VALUE: ${PASSWORD}
```

```
ACTION: playwright_screenshot
FILENAME: screenshots/02-credentials-filled.png
```

Click login button:

```
ACTION: playwright_click
SELECTOR: input[type="submit"], button:has-text("Log in"), .login-button
```

Wait for redirect/dashboard:

```
ACTION: playwright_wait_for_selector
SELECTOR: .process-app-list, .dashboard, .home-page
TIMEOUT: 30000
```

```
ACTION: playwright_screenshot
FILENAME: screenshots/03-logged-in.png
```

---

### Step 3: Dismiss Popups

Check for and dismiss any popup dialogs:

```
ACTION: playwright_evaluate
CODE:
(async () => {
  // Close any modal dialogs
  const closeButtons = document.querySelectorAll(
    '.dialog-close, .modal-close, button:contains("OK"), button:contains("Close"), button:contains("Dismiss"), .popup-close'
  );
  for (const btn of closeButtons) {
    btn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Click overlay to dismiss
  const overlays = document.querySelectorAll('.modal-backdrop, .dialog-overlay');
  for (const overlay of overlays) {
    overlay.click();
    await new Promise(r => setTimeout(r, 500));
  }

  return { dismissed: closeButtons.length + overlays.length };
})()
```

---

### Step 4: Navigate to Process App

Find and click the target Process App:

```
ACTION: playwright_click
SELECTOR: .app-tile:has-text("${PROCESS_APP}"), [title*="${PROCESS_APP}"], :has-text("${PROCESS_APP}")
```

Wait for Process App to open:

```
ACTION: playwright_wait_for_selector
SELECTOR: .artifact-list, .process-app-content, .app-details
TIMEOUT: 15000
```

```
ACTION: playwright_screenshot
FILENAME: screenshots/04-process-app-opened.png
```

---

### Step 5: Navigate to User Interface Section

Click on User Interface category:

```
ACTION: playwright_click
SELECTOR: :has-text("${SECTION}"), .category:has-text("${SECTION}"), [data-category="${SECTION}"]
```

Wait for interface list:

```
ACTION: playwright_wait_for_selector
SELECTOR: .service-list, .artifact-list, .human-service-list
TIMEOUT: 10000
```

```
ACTION: playwright_screenshot
FILENAME: screenshots/05-user-interface-section.png
```

---

### Step 6: Navigate to Client-Side Human Service

Click on the target Human Service:

```
ACTION: playwright_click
SELECTOR: :has-text("${SERVICE_NAME}"), .service-item:has-text("${SERVICE_NAME}"), [title*="${SERVICE_NAME}"]
```

Wait for Coach View designer to load:

```
ACTION: playwright_wait_for_selector
SELECTOR: .coach-designer, .coach-canvas, .design-surface, >>> .bpm-coach-designer
TIMEOUT: 20000
```

```
ACTION: playwright_screenshot
FILENAME: screenshots/06-coach-view-designer.png
```

---

### Step 7: Verify Canvas is Ready

Wait for canvas elements to render (including shadow DOM):

```
ACTION: playwright_evaluate
CODE:
(async () => {
  // Wait for shadow DOM to initialize
  const maxWait = 10000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    // Check for coach elements in light DOM
    let elements = document.querySelectorAll('[data-coach-id], .coach-view-element');

    // Check inside shadow roots
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        const shadowElements = el.shadowRoot.querySelectorAll('[data-coach-id], .coach-view-element');
        elements = [...elements, ...shadowElements];
      }
    });

    if (elements.length > 0) {
      return {
        ready: true,
        elementCount: elements.length,
        timestamp: new Date().toISOString()
      };
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return {
    ready: false,
    elementCount: 0,
    error: 'Timeout waiting for coach elements'
  };
})()
```

Take final verification screenshot:

```
ACTION: playwright_screenshot
FILENAME: screenshots/07-canvas-ready.png
FULL_PAGE: true
```

---

## REQUIRED OUTPUT

Write `navigation-status.json` with the following structure:

```json
{
  "phase": 1,
  "status": "success|failed",
  "timestamp": "ISO timestamp",
  "target": {
    "url": "actual URL after navigation",
    "processApp": "Retail Fixed Deposit Process",
    "section": "User Interface",
    "serviceType": "Client-Side Human Service",
    "serviceName": "Initiate Retail Deposit Account Opening"
  },
  "steps": [
    {
      "step": 1,
      "action": "navigate",
      "status": "success|failed",
      "screenshot": "screenshots/01-initial-page.png"
    },
    {
      "step": 2,
      "action": "login",
      "status": "success|failed",
      "screenshot": "screenshots/03-logged-in.png"
    },
    // ... all steps
  ],
  "canvasReady": true|false,
  "elementCount": number,
  "errors": []
}
```

---

## ERROR HANDLING

If any step fails:
1. Take a screenshot of the error state
2. Log the error message
3. Update `navigation-status.json` with `status: "failed"` and error details
4. **DO NOT** proceed to Phase 2

---

## VERIFICATION CHECKLIST

Before marking Phase 1 complete, verify:

- [ ] Login successful (screenshot shows dashboard/home)
- [ ] Process App opened (screenshot shows app content)
- [ ] Human Service opened (screenshot shows coach designer)
- [ ] Canvas has rendered elements (evaluate returned elementCount > 0)
- [ ] `navigation-status.json` written with all step details
- [ ] All screenshots saved in `screenshots/` directory

---

## NEXT PHASE

Once Phase 1 completes successfully with `status: "success"`:
- Proceed to Phase 2: Shadow DOM Element Discovery
- Phase 2 will read `navigation-status.json` to verify prerequisites
