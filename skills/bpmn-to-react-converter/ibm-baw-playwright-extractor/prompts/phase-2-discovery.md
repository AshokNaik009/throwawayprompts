# Phase 2: Shadow DOM Element Discovery

## OBJECTIVE
Systematically discover ALL visible elements in the Coach View canvas, handling shadow DOM and expanding all collapsible sections.

## PREREQUISITE CHECK

Before starting, verify Phase 1 completed successfully:

```
ACTION: Read navigation-status.json
VERIFY: status === "success" AND canvasReady === true
```

**IF PREREQUISITE FAILS**: Stop and report. Do not proceed.

---

## ANTI-HALLUCINATION RULES

1. **DO NOT** invent element IDs - extract only what exists in DOM
2. **DO NOT** assume element types - read from actual attributes
3. **DO NOT** skip shadow DOM exploration - it contains most elements
4. **ALWAYS** expand collapsibles BEFORE counting elements
5. **ALWAYS** scroll to ensure lazy-loaded content is visible
6. **ONLY** write to output files after COMPLETE discovery

---

## STEP-BY-STEP EXECUTION

### Step 1: Build Shadow DOM Map

First, map the shadow DOM tree structure:

```
ACTION: playwright_evaluate
CODE:
(() => {
  const shadowMap = {
    timestamp: new Date().toISOString(),
    hosts: []
  };

  const mapShadowHost = (element, path = '') => {
    if (element.shadowRoot) {
      const hostInfo = {
        tagName: element.tagName,
        id: element.id || null,
        className: element.className || null,
        path: path,
        childShadowHosts: []
      };

      // Find nested shadow hosts
      element.shadowRoot.querySelectorAll('*').forEach((child, index) => {
        if (child.shadowRoot) {
          const childPath = path ? `${path} > ${index}` : `${index}`;
          hostInfo.childShadowHosts.push(mapShadowHost(child, childPath));
        }
      });

      return hostInfo;
    }
    return null;
  };

  // Find all top-level shadow hosts
  document.querySelectorAll('*').forEach((el, index) => {
    const hostInfo = mapShadowHost(el, `root[${index}]`);
    if (hostInfo) {
      shadowMap.hosts.push(hostInfo);
    }
  });

  return shadowMap;
})()
```

Write result to `shadow-dom-map.json`.

---

### Step 2: Expand All Collapsible Sections

Before discovering elements, expand everything:

```
ACTION: playwright_evaluate
CODE:
(async () => {
  const expandedCount = { accordions: 0, menus: 0, panels: 0 };

  const expandInRoot = async (root) => {
    // Accordion toggles
    const accordions = root.querySelectorAll(
      '.accordion-toggle:not(.expanded), ' +
      '.accordion-header.collapsed, ' +
      '[aria-expanded="false"], ' +
      '.collapsible-trigger:not(.open), ' +
      '.collapse-toggle:not(.expanded)'
    );

    for (const toggle of accordions) {
      toggle.click();
      expandedCount.accordions++;
      await new Promise(r => setTimeout(r, 300));
    }

    // Expandable menus/trees
    const menus = root.querySelectorAll(
      '.tree-node.collapsed, ' +
      '.menu-item:not(.expanded), ' +
      '.expand-icon:not(.open)'
    );

    for (const menu of menus) {
      menu.click();
      expandedCount.menus++;
      await new Promise(r => setTimeout(r, 200));
    }

    // Collapsible panels
    const panels = root.querySelectorAll(
      '.panel-header.collapsed, ' +
      '.section-toggle:not(.open), ' +
      '.memo-expand'
    );

    for (const panel of panels) {
      panel.click();
      expandedCount.panels++;
      await new Promise(r => setTimeout(r, 200));
    }

    // Recurse into shadow roots
    root.querySelectorAll('*').forEach(async (el) => {
      if (el.shadowRoot) {
        await expandInRoot(el.shadowRoot);
      }
    });
  };

  // Start from document
  await expandInRoot(document);

  // Also check all shadow roots at document level
  for (const el of document.querySelectorAll('*')) {
    if (el.shadowRoot) {
      await expandInRoot(el.shadowRoot);
    }
  }

  // Wait for animations to complete
  await new Promise(r => setTimeout(r, 1000));

  return expandedCount;
})()
```

Take screenshot after expansion:

```
ACTION: playwright_screenshot
FILENAME: screenshots/08-all-expanded.png
FULL_PAGE: true
```

---

### Step 3: Comprehensive Scrolling

Scroll through the entire canvas to trigger lazy loading:

```
ACTION: playwright_evaluate
CODE:
(async () => {
  const scrollResults = {
    viewportsScrolled: 0,
    elementsFoundDuringScroll: []
  };

  // Find scrollable containers
  const scrollContainers = [
    document.querySelector('.coach-canvas'),
    document.querySelector('.design-surface'),
    document.querySelector('.canvas-scroll-container'),
    document.documentElement
  ].filter(Boolean);

  // Also check shadow roots for scroll containers
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      const shadowScrollers = el.shadowRoot.querySelectorAll(
        '.coach-canvas, .design-surface, .scroll-container, [style*="overflow"]'
      );
      scrollContainers.push(...shadowScrollers);
    }
  });

  for (const container of scrollContainers) {
    const originalScrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (scrollHeight <= clientHeight) continue;

    // Scroll in increments
    const increment = clientHeight * 0.8;
    let currentScroll = 0;

    while (currentScroll < scrollHeight) {
      container.scrollTop = currentScroll;
      scrollResults.viewportsScrolled++;

      // Wait for content to render
      await new Promise(r => setTimeout(r, 300));

      // Count visible elements at this scroll position
      const visibleElements = document.querySelectorAll('[data-coach-id]:not([counted])');
      visibleElements.forEach(el => {
        el.setAttribute('counted', 'true');
        scrollResults.elementsFoundDuringScroll.push(el.getAttribute('data-coach-id'));
      });

      currentScroll += increment;
    }

    // Scroll back to top
    container.scrollTop = originalScrollTop;
  }

  return scrollResults;
})()
```

---

### Step 4: Discover All Elements (Deep)

Now extract complete element inventory including shadow DOM:

```
ACTION: playwright_evaluate
CODE:
(() => {
  const elements = [];
  let elementIndex = 0;

  const discoverInRoot = (root, shadowPath = 'document') => {
    // Coach view elements
    const coachElements = root.querySelectorAll(
      '[data-coach-id], ' +
      '[data-coach-type], ' +
      '[data-control-id], ' +
      '.coach-view-element, ' +
      '.cv-element, ' +
      '.bpm-coach-view'
    );

    coachElements.forEach(el => {
      const rect = el.getBoundingClientRect();

      elements.push({
        index: elementIndex++,
        shadowPath: shadowPath,
        coachId: el.getAttribute('data-coach-id'),
        coachType: el.getAttribute('data-coach-type'),
        controlId: el.getAttribute('data-control-id'),
        tagName: el.tagName,
        className: el.className,
        id: el.id || null,
        position: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        isVisible: rect.width > 0 && rect.height > 0,
        attributes: {
          label: el.getAttribute('data-label') || el.getAttribute('aria-label'),
          binding: el.getAttribute('data-binding'),
          required: el.getAttribute('data-required') || el.hasAttribute('required'),
          readonly: el.getAttribute('data-readonly') || el.hasAttribute('readonly'),
          disabled: el.hasAttribute('disabled')
        },
        children: el.children.length,
        text: el.textContent?.substring(0, 100)?.trim() || null
      });
    });

    // Recurse into shadow roots
    root.querySelectorAll('*').forEach((child, idx) => {
      if (child.shadowRoot) {
        const newPath = `${shadowPath} > shadow[${idx}]`;
        discoverInRoot(child.shadowRoot, newPath);
      }
    });
  };

  // Start discovery from document
  discoverInRoot(document);

  return {
    timestamp: new Date().toISOString(),
    totalElements: elements.length,
    byType: elements.reduce((acc, el) => {
      const type = el.coachType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
    byShadowPath: elements.reduce((acc, el) => {
      acc[el.shadowPath] = (acc[el.shadowPath] || 0) + 1;
      return acc;
    }, {}),
    elements: elements
  };
})()
```

---

### Step 5: Take Canvas Screenshots

Capture multiple screenshots for documentation:

```
ACTION: playwright_screenshot
FILENAME: screenshots/09-canvas-full.png
FULL_PAGE: true
```

```
ACTION: playwright_evaluate
CODE:
(() => {
  // Get bounding box of all elements to determine canvas extent
  const allElements = document.querySelectorAll('[data-coach-id]');
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

  allElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  });

  return {
    canvasExtent: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  };
})()
```

---

## REQUIRED OUTPUT

### File 1: `shadow-dom-map.json`

```json
{
  "timestamp": "ISO timestamp",
  "hosts": [
    {
      "tagName": "DIV",
      "id": "coach-container",
      "className": "coach-designer",
      "path": "root[5]",
      "childShadowHosts": [...]
    }
  ]
}
```

### File 2: `discovered-elements.json`

```json
{
  "phase": 2,
  "timestamp": "ISO timestamp",
  "totalElements": 45,
  "byType": {
    "Text": 12,
    "Button": 5,
    "Section": 8,
    "Table": 2,
    "Select": 4,
    "unknown": 14
  },
  "byShadowPath": {
    "document": 5,
    "document > shadow[3]": 20,
    "document > shadow[3] > shadow[0]": 20
  },
  "elements": [
    {
      "index": 0,
      "shadowPath": "document > shadow[3]",
      "coachId": "Text1",
      "coachType": "Text",
      "controlId": "ctrl_text_1",
      "tagName": "DIV",
      "className": "cv-text coach-view-element",
      "position": { "x": 100, "y": 200, "width": 300, "height": 40 },
      "isVisible": true,
      "attributes": {
        "label": "First Name",
        "binding": "tw.local.firstName",
        "required": true
      },
      "children": 2,
      "text": "First Name"
    }
    // ... all elements
  ],
  "screenshots": [
    "screenshots/08-all-expanded.png",
    "screenshots/09-canvas-full.png"
  ]
}
```

---

## VERIFICATION CHECKLIST

Before marking Phase 2 complete, verify:

- [ ] Shadow DOM map created with all host elements
- [ ] All collapsible sections expanded (screenshot shows expanded state)
- [ ] All scroll positions visited (lazy content loaded)
- [ ] Element count matches visual inspection
- [ ] Each element has coachId or coachType
- [ ] Position data is realistic (not 0,0 for all)
- [ ] `shadow-dom-map.json` written
- [ ] `discovered-elements.json` written with complete inventory

---

## ERROR HANDLING

If discovery finds 0 elements:
1. Check if page is fully loaded
2. Verify shadow DOM map has hosts
3. Try alternative selectors from selectors reference
4. Take screenshot and log error
5. **DO NOT** proceed to Phase 3 with empty inventory

---

## NEXT PHASE

Once Phase 2 completes with `totalElements > 0`:
- Proceed to Phase 3: Systematic Property Extraction
- Phase 3 will iterate through each element in `discovered-elements.json`
