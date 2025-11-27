---
name: bpmn-to-react-converter
description: Convert IBM BPM/Camunda BPMN XML files and TWX archives (including Coachviews, Human Services, and BPD processes) to React.js frontend and Node.js/TypeScript backend. Use when migrating from IBM Teamworks/BPM to modern web stack, extracting logic from BPMN XML or TWX files, or converting large files (300KB+). Handles TWX pattern-based archives (1.*, 64.*, 21.*, 61.*, 4.*, 72.*), nested services, data bindings, and coach view structures.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# BPMN to React/Node.js Converter

Convert IBM BPM Teamworks BPMN XML files and TWX archives to modern React.js and Node.js/TypeScript applications. This skill handles:
- **TWX (TeamWorks Export) archives** with pattern-based structure (1.*, 21.*, 25.*, 61.*, 64.*, 72.*)
- **Large BPMN XML files** (345KB+)
- **Nested structures** and complex logic extraction

## Problem Statement

IBM BPM uses two main formats:

### 1. TWX (TeamWorks Export) Archives
TWX files are **ZIP archives** containing multiple XML files organized by pattern numbers:
- **Pattern 1.*** - Process Applications
- **Pattern 4.*** - Toolkits (reusable components and libraries)
- **Pattern 21.*** - Coach Views (UI components)
- **Pattern 25.*** - Processes/BPD (usually the largest files)
- **Pattern 61.*** - Human Services (user-facing workflows)
- **Pattern 64.*** - Service Flows (automated workflows)
- **Pattern 72.*** - Business Objects/Data Types

### 2. BPMN XML Files
Individual XML files define:
- **Coachviews**: UI components with nested views and data bindings
- **Human Services**: User-facing workflows with nested services
- **BPD Processes**: Business process definitions with tasks and activities
- **Service Tasks**: Backend logic and integrations

These are typically stored in large files (345KB+) that are difficult to parse in a single pass, causing standard extraction tools to fail.

## Solution Overview

This skill provides a complete conversion pipeline:

### For TWX Archives:
1. **TWX Extraction**: Unzip and organize by pattern type
2. **Pattern Analysis**: Categorize components (CoachViews, Services, Toolkits, etc.)
3. **Inventory Generation**: Create comprehensive catalog of all components

### For BPMN XML Files:
1. **Pre-analysis**: Scan BPMN XML structure without loading entire file
2. **Component extraction**: Extract individual Coachviews, Services, and Processes
3. **Logic mapping**: Convert BPMN logic to TypeScript/JavaScript
4. **Template generation**: Generate React components and Node.js services
5. **Data binding migration**: Convert `tw.local.*` bindings to React state

## When to Use This Skill

- Migrating from IBM BPM/Teamworks to React + Node.js
- Extracting business logic from BPMN XML files
- Converting Coachviews to React components
- Parsing large BPMN files (300KB+) that fail with standard tools
- Understanding nested service structures in IBM BPM
- Generating migration templates for reusable patterns

## Prerequisites

Required packages (I'll help install these if needed):

**Backend (Node.js):**
```bash
npm install xml2js fast-xml-parser sax xmldom
npm install bpmn-js express tsyringe reflect-metadata cors
npm install --save-dev @types/node @types/xml2js @types/express typescript
```

**Frontend (React):**
```bash
npm install react react-dom bpmn-js
npm install --save-dev @types/react @types/react-dom
```

## bpmn-js Integration

This skill generates code that integrates with **[bpmn-js](https://bpmn.io/toolkit/bpmn-js/)**, the official BPMN 2.0 rendering toolkit. The bpmn-js library provides:

- **BPMN Visualization**: Render BPMN diagrams in the browser
- **Diagram Editing**: Modify BPMN processes interactively
- **Process Execution**: Execute BPMN workflows
- **Element Highlighting**: Track process execution visually

Your converted application will use bpmn-js to:
1. Load and display the original BPMN XML
2. Visualize process execution in real-time
3. Highlight active tasks and completed steps
4. Allow users to interact with the process model

The generated Node.js package wraps bpmn-js functionality, making it easy to integrate BPMN visualization and execution into your React + Node.js application.

## Step-by-Step Conversion Process

### 1. Initial Analysis

First, I'll analyze your BPMN XML file structure:

```bash
# Analyze BPMN file structure
node scripts/analyze-bpmn.js <your-bpmn-file.xml>
```

This generates:
- Component inventory (Coachviews, Services, Processes)
- Nesting hierarchy map
- Data binding catalog
- Complexity metrics

### 2. Extract Components

I'll extract components in chunks to handle large files:

**For Coachviews:**
- Parse coach view definitions
- Extract HTML templates and data bindings
- Identify nested coach views
- Map event handlers and validation logic

**For Human Services:**
- Extract service flow logic
- Identify data inputs/outputs
- Map service tasks and decisions
- Extract error handling

**For BPD Processes:**
- Extract process flow
- Identify gateways and events
- Map activities to services
- Extract business rules

### 3. Generate React Components

I'll create React components from Coachviews:

```typescript
// Example: Coach View -> React Component
// Input: <coachView id="Button1" type="com.ibm.bpm.coach.Button">
// Output: ButtonComponent.tsx

import React, { useState } from 'react';

interface ButtonComponentProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const ButtonComponent: React.FC<ButtonComponentProps> = ({
  label,
  onClick,
  disabled = false
}) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

### 4. Generate Node.js Services

I'll convert Service Tasks to Node.js/TypeScript:

```typescript
// Example: Service Task -> Node.js Service
// Input: <serviceTask id="ValidateUser" implementation="##WebService">
// Output: validateUser.service.ts

export class UserValidationService {
  async validateUser(userId: string): Promise<ValidationResult> {
    // Extracted logic from BPMN service task
    return {
      isValid: true,
      userId,
      timestamp: new Date()
    };
  }
}
```

### 5. Migrate Data Bindings

I'll convert IBM BPM data bindings to React state:

```typescript
// BPMN: tw.local.userName
// React:
const [userName, setUserName] = useState<string>('');

// BPMN: tw.local.currentUser.email
// React:
interface User {
  email: string;
}
const [currentUser, setCurrentUser] = useState<User>({ email: '' });
```

## Handling Large Files (345KB+)

For large BPMN files, I use a streaming approach:

### Strategy 1: SAX Parser (Streaming)
```javascript
// Parse large XML without loading entire file into memory
const saxStream = require('sax').createStream(true);

saxStream.on('opentag', (node) => {
  if (node.name === 'coachView') {
    // Process coach view incrementally
  }
});
```

### Strategy 2: Chunked Extraction
```javascript
// Extract specific sections by XPath
const extractCoachViews = (xmlPath) => {
  // Stream parse only <coachView> elements
  // Skip other large sections
};
```

### Strategy 3: Incremental Processing
```javascript
// Process in stages:
// 1. Extract metadata (small)
// 2. Extract individual components (medium chunks)
// 3. Generate outputs (small files)
```

## Output Structure

The conversion generates this structure:

```
output/
├── frontend/
│   ├── components/
│   │   ├── CoachView1.tsx
│   │   ├── CoachView2.tsx
│   │   └── nested/
│   │       └── NestedCoachView.tsx
│   ├── services/
│   │   └── api.service.ts
│   └── types/
│       └── bpmn-types.ts
├── backend/
│   ├── services/
│   │   ├── userValidation.service.ts
│   │   └── dataProcessing.service.ts
│   ├── routes/
│   │   └── process.routes.ts
│   └── types/
│       └── process-types.ts
└── migration-report.md
```

## Key Conversion Mappings

### Coach View Elements
| BPMN Element | React Component |
|--------------|-----------------|
| `<coachView type="Button">` | `<Button>` component |
| `<coachView type="Text">` | `<Input type="text">` |
| `<coachView type="Table">` | Custom `<DataTable>` |
| `<coachView type="Section">` | `<div className="section">` |

### Data Bindings
| IBM BPM | React |
|---------|-------|
| `tw.local.varName` | `const [varName, setVarName] = useState()` |
| `tw.local.obj.prop` | `state.obj.prop` |
| `#{binding}` | `{binding}` |

### Service Tasks
| BPMN Service | Node.js |
|--------------|---------|
| `<serviceTask>` | Express route handler |
| `<scriptTask>` | Utility function |
| `<userTask>` | API endpoint + React form |

## Best Practices

### 1. Incremental Migration
Don't try to convert everything at once:
- Start with one Coachview
- Test the conversion
- Create a reusable template
- Apply to similar components

### 2. Preserve Business Logic
Ensure BPMN business rules are preserved:
- Extract decision tables
- Convert gateway conditions
- Maintain validation rules
- Keep error handling logic

### 3. Data Flow Mapping
Trace data through the system:
- Document input/output variables
- Map service dependencies
- Identify shared state
- Plan state management (Redux/Context)

### 4. Handle Nesting Carefully
IBM BPM allows deep nesting:
- Map parent-child relationships
- Convert to React component hierarchy
- Use proper prop drilling or context
- Document nested service calls

## Common Challenges and Solutions

### Challenge 1: File Size Too Large
**Problem**: 345KB+ XML files crash parsers
**Solution**: Use SAX streaming parser (see scripts/sax-parser.js)

### Challenge 2: Nested Services
**Problem**: Services reference other services recursively
**Solution**: Build dependency graph first, then extract in topological order

### Challenge 3: Complex Data Bindings
**Problem**: `tw.local.complex.nested.structure`
**Solution**: Generate TypeScript interfaces from binding paths

### Challenge 4: Coach View Events
**Problem**: IBM BPM event handlers use proprietary format
**Solution**: Map to React event handlers (see docs/event-mapping.md)

## Example Workflow

Here's how I'll help you convert a BPMN file:

```
You: "I need to convert UserRegistration.xml which has a Coachview with nested forms"

Me:
1. I'll read and analyze UserRegistration.xml
2. Generate a structure report showing all components
3. Extract the main Coachview and nested forms
4. Create React components for each form
5. Generate TypeScript types for data bindings
6. Create a migration template you can reuse
7. Provide testing recommendations
```

## Templates Generated

After analyzing your BPMN files, I create reusable templates:

1. **Coachview Template**: For similar UI components
2. **Service Template**: For backend services
3. **Process Template**: For workflow orchestration
4. **Data Model Template**: For shared types

These templates speed up migration of similar components.

## Testing the Conversion

After conversion, I'll help you:

1. **Unit test** individual React components
2. **Integration test** API services
3. **Compare** behavior with original BPMN
4. **Document** any differences or limitations

## Additional Resources

- [BPMN Structure Guide](docs/bpmn-structure.md)
- [IBM BPM Data Binding Reference](docs/data-bindings.md)
- [React Component Patterns](docs/react-patterns.md)
- [Example Conversions](examples/)

## Limitations

- Custom Java services require manual conversion
- Some IBM BPM-specific features may not have direct React equivalents
- Complex process orchestration may need workflow engine (e.g., Camunda Platform 8)
- Performance characteristics may differ from original BPMN

## Next Steps

1. Share your BPMN XML file path
2. I'll analyze the structure
3. We'll identify components to convert
4. I'll generate React/Node.js code
5. You review and test
6. We iterate and refine

Let's start by pointing me to your BPMN XML file!
