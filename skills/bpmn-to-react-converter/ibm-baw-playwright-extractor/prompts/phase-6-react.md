# Phase 6: React Migration Mapping

## OBJECTIVE
Generate React components, TypeScript interfaces, and migration report from all extracted data.

## PREREQUISITE CHECK

```
ACTION: Verify all phase outputs exist:
- navigation-status.json (Phase 1)
- discovered-elements.json (Phase 2)
- systematic-element-properties.json (Phase 3)
- variables-behavior-data.json (Phase 4)
- debug-preview-data.json (Phase 5)
```

**IF ANY MISSING**: Stop and report which phases need to be re-run.

---

## COMPONENT TYPE MAPPING

| IBM BAW Type | React Component | Library |
|--------------|-----------------|---------|
| Text | `<Input type="text">` | antd/MUI |
| OutputText | `<Typography>` / `<span>` | antd/MUI |
| TextArea | `<Input.TextArea>` | antd |
| Button | `<Button>` | antd/MUI |
| Select | `<Select>` | antd/MUI |
| CheckBox | `<Checkbox>` | antd/MUI |
| RadioButtonGroup | `<Radio.Group>` | antd |
| DateTimePicker | `<DatePicker>` | antd |
| Table | `<Table>` | antd |
| Section | `<Card>` / `<div>` | antd |
| TabSection | `<Tabs>` | antd |
| Panel | `<Collapse.Panel>` | antd |

---

## STEP 1: Generate TypeScript Interfaces

Read `variables-behavior-data.json` and create interfaces:

```typescript
// coach-types.ts
// Auto-generated from IBM BAW Coach View extraction

// Variable interfaces from tw.local bindings
export interface CoachFormData {
  ${variables.map(v => `${v.name}: ${mapType(v.type)};`).join('\n  ')}
}

// Business Object interfaces
${businessObjects.map(bo => `
export interface ${bo.typeName} {
  // TODO: Add fields based on business object definition
}
`).join('\n')}

// Form validation schema
export const validationRules = {
  ${elements.filter(e => e.properties.Configuration?.find(p => p.name === 'Required')?.value).map(e =>
    `${e.coachId}: { required: true, message: '${e.properties.General?.find(p => p.name === 'Label')?.value || e.coachId} is required' }`
  ).join(',\n  ')}
};
```

Type mapping function:
```javascript
const mapType = (bpmType) => ({
  'String': 'string',
  'Integer': 'number',
  'Decimal': 'number',
  'Boolean': 'boolean',
  'Date': 'Date',
  'ANY': 'any'
}[bpmType] || 'any');
```

---

## STEP 2: Generate React Components

For each element in `systematic-element-properties.json`:

```typescript
// ${element.coachId}.tsx
import React from 'react';
import { ${componentImports} } from 'antd';

interface ${element.coachId}Props {
  value?: ${valueType};
  onChange?: (value: ${valueType}) => void;
  ${element.properties.Configuration?.find(p => p.name === 'Required')?.value ? 'required?: boolean;' : ''}
  ${element.properties.Configuration?.find(p => p.name === 'Read Only')?.value ? 'readOnly?: boolean;' : ''}
  disabled?: boolean;
}

export const ${element.coachId}: React.FC<${element.coachId}Props> = ({
  value,
  onChange,
  ${defaults}
}) => {
  return (
    <${ReactComponent}
      value={value}
      onChange={onChange}
      ${propsFromExtraction}
    />
  );
};
```

---

## STEP 3: Generate Main Form Component

```typescript
// CoachForm.tsx
import React, { useState } from 'react';
import { Form, Button } from 'antd';
import { CoachFormData, validationRules } from './coach-types';
${componentImports}

interface CoachFormProps {
  initialData?: Partial<CoachFormData>;
  onSubmit?: (data: CoachFormData) => void;
}

export const CoachForm: React.FC<CoachFormProps> = ({
  initialData = {},
  onSubmit
}) => {
  const [form] = Form.useForm<CoachFormData>();

  const handleSubmit = async (values: CoachFormData) => {
    onSubmit?.(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialData}
      onFinish={handleSubmit}
    >
      ${formFields}

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};
```

---

## STEP 4: Generate Event Handlers Hook

From `variables-behavior-data.json` behavior section:

```typescript
// useCoachBehavior.ts
import { useCallback, useEffect } from 'react';

export const useCoachBehavior = (form: any) => {
  // Load event
  useEffect(() => {
    ${loadHandlerCode || '// No load handler'}
  }, []);

  // Change handlers
  ${changeHandlers.map(h => `
  const handle${h.field}Change = useCallback((value: any) => {
    ${h.code || '// TODO: Implement change logic'}
  }, [form]);
  `).join('\n')}

  // Validation
  const validate = useCallback(() => {
    ${validateHandlerCode || 'return true;'}
  }, [form]);

  return {
    ${changeHandlers.map(h => `handle${h.field}Change`).join(',\n    ')},
    validate
  };
};
```

---

## STEP 5: Generate CSS/Styles

From `debug-preview-data.json` computed styles:

```typescript
// coach-styles.ts
export const coachStyles = {
  formContainer: {
    ${containerStyles}
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  // Add more styles from extraction
};
```

---

## REQUIRED OUTPUT FILES

### 1. `react-migration/components/CoachForm.tsx`
Main form component with all fields.

### 2. `react-migration/components/[ElementName].tsx`
Individual component for each complex element.

### 3. `react-migration/types/coach-types.ts`
TypeScript interfaces for all data types.

### 4. `react-migration/hooks/useCoachBehavior.ts`
Event handlers converted from IBM BAW behavior.

### 5. `react-migration/styles/coach-styles.ts`
Extracted styles.

### 6. `extraction-summary-report.md`

```markdown
# IBM BAW Coach View Extraction Report

## Summary
- **Coach View**: ${serviceName}
- **Extraction Date**: ${timestamp}
- **Total Elements**: ${elementCount}
- **Variables**: ${variableCount}
- **Event Handlers**: ${handlerCount}

## Elements Extracted
| ID | Type | Label | Binding | Required |
|----|------|-------|---------|----------|
${elementTable}

## Variables
| Name | Type | Scope | Default |
|------|------|-------|---------|
${variableTable}

## Event Handlers
| Event | Has Code | Lines |
|-------|----------|-------|
${handlerTable}

## React Component Mapping
| IBM BAW | React Component | File |
|---------|-----------------|------|
${mappingTable}

## Migration Notes
- ${notes}

## Screenshots
- Empty State: screenshots/14-debug-empty-state.png
- Filled State: screenshots/15-debug-filled-state.png
- Validation: screenshots/16-debug-validation-errors.png
```

---

## VERIFICATION CHECKLIST

- [ ] TypeScript interfaces generated for all variables
- [ ] React components created for all elements
- [ ] Main form component assembles all fields
- [ ] Event handlers converted to React hooks
- [ ] Styles extracted from runtime CSS
- [ ] Summary report documents everything
- [ ] All files written to `react-migration/` directory

---

## COMPLETE

All 6 phases done. Output structure:
```
extraction-output/
├── navigation-status.json
├── shadow-dom-map.json
├── discovered-elements.json
├── systematic-element-properties.json
├── variables-behavior-data.json
├── debug-preview-data.json
├── screenshots/
├── react-migration/
│   ├── components/
│   ├── types/
│   ├── hooks/
│   └── styles/
└── extraction-summary-report.md
```
