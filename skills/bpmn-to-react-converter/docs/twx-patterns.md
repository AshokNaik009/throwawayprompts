# IBM BPM TWX Patterns and Artifact Types

Complete reference for IBM BPM (TeamWorks / Process Designer) artifacts, file patterns, and conversion strategies for React/Node.js migration.

## TWX File Structure

**TWX (TeamWorks Export)** files are ZIP archives containing:
- `/objects/` - XML files organized by pattern numbers
- Metadata and configuration files
- Resources (CSS, JavaScript, images)

**File Naming Pattern**: `<pattern>.<identifier>.xml`
- Example: `21.abc123def456.xml` (CoachView)
- Example: `25.xyz789uvw012.xml` (Process/BPD)

## Core Runtime Artifacts

### Process Application (Pattern: 1.*)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Top-level container grouping BPDs, services, coach views, variables into versioned application |
| **File Pattern** | `1.<app-id>.xml` |
| **Storage** | Versioned snapshots in Process Center; deployed to Process Server |
| **React/Node Migration** | → Root application structure, routing configuration |
| **Priority** | HIGH - Start here to understand application scope |

**Conversion Strategy:**
```javascript
// 1.*.xml → Application structure
const appMetadata = {
  name: 'UserManagementApp',
  version: '1.0.0',
  routes: [...],  // from BPDs
  services: [...], // from services
  components: [...] // from coach views
};
```

### Toolkit (Pattern: 4.*)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Shared library of reusable artifacts (services, coach views, variables) |
| **File Pattern** | `4.<toolkit-id>.xml` |
| **Storage** | Versioned toolkit snapshots; referenced by process apps via dependencies |
| **React/Node Migration** | → Shared component library, utility modules |
| **Priority** | HIGH - Extract first for reuse across apps |

**Conversion Strategy:**
```typescript
// 4.*.xml → Shared libraries
// /shared/
//   components/    (from coach views)
//   services/      (from service flows)
//   utils/         (from business objects)
//   types/         (from data types)
```

### BPD - Business Process Definition (Pattern: 25.*)

| Attribute | Value |
|-----------|-------|
| **Purpose** | BPMN-style process model with activities, gateways, events, lanes, sequence flow |
| **File Pattern** | `25.<bpd-id>.xml` (usually **largest files**) |
| **Storage** | BPMN-like XML; executed as process instances |
| **React/Node Migration** | → Workflow orchestration, state machine, API endpoints |
| **Priority** | MEDIUM - Complex, requires bpmn-js integration |

**Conversion Strategy:**
```typescript
// 25.*.xml → Workflow engine integration
import { BpmnJsService } from './services/bpmnJs.service';
import { WorkflowOrchestrator } from './orchestrator';

// Load process definition
const workflow = new WorkflowOrchestrator();
await workflow.loadBPMN(bpdXml);

// Execute process
const instance = await workflow.startProcess({
  processKey: 'UserRegistration',
  variables: { userId: '123' }
});
```

### Activity (Part of BPD)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Node in BPD representing unit of work (human task, system task, subprocess) |
| **File Pattern** | Embedded in `25.*.xml` (no separate file) |
| **Storage** | Internal XML as part of BPD model |
| **React/Node Migration** | → Task handlers, API endpoints, UI flows |
| **Priority** | MEDIUM - Extracted from parent BPD |

**Conversion Strategy:**
```typescript
// Activity → Service endpoint + UI flow
// Human Task → React form component
// System Task → Node.js service method
// Subprocess → Nested service call
```

## Service Artifacts

### Human Service (Pattern: 61.*)

| Attribute | Value |
|-----------|-------|
| **Purpose** | User-facing flow with multiple coaches, decisions, integrations |
| **File Pattern** | `61.<service-id>.xml` |
| **Storage** | Service model XML; generates user tasks in Process Portal |
| **React/Node Migration** | → Multi-step form wizard, user workflow components |
| **Priority** | HIGH - Core user experience |

**Conversion Strategy:**
```typescript
// 61.*.xml → Multi-step React wizard
interface HumanServiceWizard {
  steps: CoachStep[];
  currentStep: number;
  data: FormData;

  nextStep(): Promise<void>;
  previousStep(): void;
  submit(): Promise<Result>;
}

// Example: UserRegistrationService.61.abc.xml
// → components/UserRegistrationWizard.tsx
//   - Step 1: PersonalInfo (coach)
//   - Step 2: AddressInfo (coach)
//   - Step 3: Confirmation (coach)
```

### Service Flow (Pattern: 64.*)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Lightweight flow for orchestration or REST APIs, callable from coach views |
| **File Pattern** | `64.<flow-id>.xml` |
| **Storage** | Service-flow model in XML; invoked via REST/Ajax |
| **React/Node Migration** | → REST API endpoints, backend services |
| **Priority** | HIGH - Core backend logic |

**Conversion Strategy:**
```typescript
// 64.*.xml → Express/Node.js API endpoint
import { injectable } from 'tsyringe';

@injectable()
export class UserValidationService {
  // Extracted from 64.ValidateUser.xml
  async validateUser(userId: string): Promise<ValidationResult> {
    // Service flow logic here
    return { isValid: true, userId };
  }
}

// routes/users.routes.ts
router.post('/api/users/validate', async (req, res) => {
  const service = container.resolve(UserValidationService);
  const result = await service.validateUser(req.body.userId);
  res.json(result);
});
```

### General/System Service (Integration Service)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Automated work: integrations, data transformations, rules |
| **File Pattern** | Varies (can be in service flows or separate) |
| **Storage** | Service model XML with JavaScript steps, variables |
| **React/Node Migration** | → Backend services, integration modules |
| **Priority** | MEDIUM - Background processing |

**Conversion Strategy:**
```typescript
// Integration Service → Node.js service class
@injectable()
export class EmailIntegrationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Integration logic from IBM BPM service
  }
}
```

### Ajax Service

| Attribute | Value |
|-----------|-------|
| **Purpose** | Async calls from coach views using BPM REST in taskless mode |
| **File Pattern** | Defined like service flow |
| **Storage** | Configuration exposed as "Service" type on coach view |
| **React/Node Migration** | → API endpoints called from React components |
| **Priority** | HIGH - Direct UI-backend communication |

**Conversion Strategy:**
```typescript
// Ajax Service → REST endpoint + React fetch
// Backend:
router.get('/api/data/search', async (req, res) => {
  const results = await searchService.search(req.query.term);
  res.json(results);
});

// Frontend React:
const searchData = async (term: string) => {
  const response = await fetch(`/api/data/search?term=${term}`);
  return await response.json();
};
```

## UI Layer (Coaches)

### Coach View (Pattern: 21.*)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Reusable UI control/template with bindings, configuration, lifecycle handlers |
| **File Pattern** | `21.<view-id>.xml` |
| **Storage** | Definition + client-side JS/HTML/CSS; loaded as custom control at runtime |
| **React/Node Migration** | → React functional components |
| **Priority** | **HIGHEST** - Core UI building blocks |

**Conversion Strategy:**
```typescript
// 21.*.xml → React TypeScript component
// Example: 21.UserFormView.xml

import React, { useState } from 'react';

interface UserFormViewProps {
  // From tw.local bindings
  userName?: string;
  onUserNameChange?: (value: string) => void;
  // From configuration options
  label?: string;
  required?: boolean;
}

export const UserFormView: React.FC<UserFormViewProps> = ({
  userName = '',
  onUserNameChange,
  label = 'User Name',
  required = false
}) => {
  const [value, setValue] = useState(userName);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onUserNameChange?.(e.target.value);
  };

  return (
    <div className="user-form-view">
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        required={required}
      />
    </div>
  );
};
```

### Coach (UI Container)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Page/screen in Human Service hosting coach views for user interaction |
| **File Pattern** | Embedded in `61.*.xml` (Human Service) |
| **Storage** | Stored in service model XML |
| **React/Node Migration** | → React page component, form container |
| **Priority** | HIGH - User interface screens |

**Conversion Strategy:**
```typescript
// Coach → React page component
// Embedded in 61.UserRegistration.xml

export const UserRegistrationPage: React.FC = () => {
  const [formData, setFormData] = useState<UserData>({});

  return (
    <div className="user-registration-page">
      <h1>User Registration</h1>
      <UserFormView
        userName={formData.userName}
        onUserNameChange={(v) => setFormData({ ...formData, userName: v })}
      />
      <AddressFormView
        address={formData.address}
        onAddressChange={(v) => setFormData({ ...formData, address: v })}
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};
```

### Client-Side Human Service

| Attribute | Value |
|-----------|-------|
| **Purpose** | Human Service optimized for rich browser-side behavior |
| **File Pattern** | Similar to `61.*.xml` but client-side variant |
| **Storage** | Optimized for client-side JS/coach framework |
| **React/Node Migration** | → React SPA with client-side state management |
| **Priority** | HIGH - Interactive UIs |

**Conversion Strategy:**
```typescript
// Client-Side Human Service → React app with local state
import create from 'zustand';

interface ClientServiceState {
  userData: UserData;
  currentStep: number;
  updateUserData: (data: Partial<UserData>) => void;
  nextStep: () => void;
}

const useClientService = create<ClientServiceState>((set) => ({
  userData: {},
  currentStep: 0,
  updateUserData: (data) => set((state) => ({
    userData: { ...state.userData, ...data }
  })),
  nextStep: () => set((state) => ({
    currentStep: state.currentStep + 1
  }))
}));
```

## Data and Integration Artifacts

### Business Object / Variable (Pattern: 72.*)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Typed data structures used in BPDs, services, coach bindings |
| **File Pattern** | `72.<object-id>.xml` |
| **Storage** | XML metadata; serialized into process instance/task state |
| **React/Node Migration** | → TypeScript interfaces, data models |
| **Priority** | MEDIUM - Type definitions |

**Conversion Strategy:**
```typescript
// 72.*.xml → TypeScript interfaces
// Example: 72.User.xml

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: Address;
  createdAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

// Validation schemas (optional)
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  address: AddressSchema,
  createdAt: z.date()
});
```

### Undercover Agent (UCA)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Endpoint for external systems/schedulers to start processes or send events |
| **File Pattern** | Metadata in application/toolkit XML |
| **Storage** | Referenced via REST/SOAP or messaging |
| **React/Node Migration** | → Webhook endpoints, message queue listeners |
| **Priority** | LOW - External integration |

**Conversion Strategy:**
```typescript
// UCA → Webhook or message handler
router.post('/webhooks/start-process', async (req, res) => {
  const { processKey, variables } = req.body;

  const orchestrator = new WorkflowOrchestrator();
  const instance = await orchestrator.startProcess({
    processKey,
    variables
  });

  res.json({ processInstanceId: instance.id });
});
```

## TWX Pattern Quick Reference

| Pattern | Type | Priority | React/Node Target |
|---------|------|----------|-------------------|
| **1.*** | Process Application | HIGH | App structure, routing |
| **4.*** | Toolkit | HIGH | Shared libraries |
| **21.*** | Coach Views | **HIGHEST** | React components |
| **25.*** | Processes (BPD) | MEDIUM | Workflow engine |
| **61.*** | Human Services | HIGH | Multi-step wizards |
| **64.*** | Service Flows | HIGH | API endpoints |
| **72.*** | Business Objects | MEDIUM | TypeScript types |

## Extraction Priority Order

1. **Extract Toolkits (4.*)** first - reusable components
2. **Extract Coach Views (21.*)** - UI building blocks
3. **Extract Service Flows (64.*)** - backend APIs
4. **Extract Human Services (61.*)** - user workflows
5. **Extract Business Objects (72.*)** - data types
6. **Extract BPDs (25.*)** last - complex orchestration

## Conversion Workflow

```bash
# 1. Extract TWX archive
node scripts/extract-twx.js MyApp.twx

# Output structure:
# twx-extracted/
#   toolkits/          (4.*.xml)
#   coach-views/       (21.*.xml)
#   processes/         (25.*.xml)
#   human-services/    (61.*.xml)
#   service-flows/     (64.*.xml)
#   business-objects/  (72.*.xml)

# 2. Generate React components from Coach Views
node scripts/generate-react-components.js \
  twx-extracted/coach-views \
  output/frontend

# 3. Generate Node.js services from Service Flows
node scripts/generate-node-services.js \
  twx-extracted/service-flows \
  output/backend

# 4. Generate TypeScript types from Business Objects
node scripts/generate-types.js \
  twx-extracted/business-objects \
  output/shared/types
```

## Pattern Detection Logic

```javascript
const detectPatternType = (filename) => {
  const pattern = filename.match(/^(\d+)\./)?.[1];

  const patternMap = {
    '1': { type: 'process-app', priority: 'HIGH' },
    '4': { type: 'toolkit', priority: 'HIGH' },
    '21': { type: 'coach-view', priority: 'HIGHEST' },
    '25': { type: 'process-bpd', priority: 'MEDIUM' },
    '61': { type: 'human-service', priority: 'HIGH' },
    '64': { type: 'service-flow', priority: 'HIGH' },
    '72': { type: 'business-object', priority: 'MEDIUM' }
  };

  return patternMap[pattern] || { type: 'unknown', priority: 'LOW' };
};
```

## Resources

- [IBM BPM Process Designer Artifacts](https://www.ibm.com/docs/en/bpm/8.5.7?topic=designer-where-edit-process-artifacts)
- [Calling Services from Coach Views](https://www.ibm.com/docs/en/bpm/8.5.7?topic=flow-calling-services-from-coach-views)
- [Export TWX Files](https://www.ibm.com/docs/en/integration-bus/9.0.0?topic=manager-export-twx-files)
- [TWX Parser GitHub](https://github.com/jgsmarques/twx-parse)
