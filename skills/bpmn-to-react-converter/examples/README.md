# BPMN to React/Node Conversion Examples

This directory contains example BPMN files and their converted React/Node.js equivalents.

## Example 1: Simple User Form

**Original BPMN**: User registration form with validation

**Files:**
- `user-form.bpmn.xml` - Original IBM BPM CoachView
- `UserForm.tsx` - Converted React component
- `userValidation.service.ts` - Converted Node.js service

**Features Demonstrated:**
- Text input fields with data bindings
- Form validation
- Submit handler
- Error display

## Example 2: Data Table with Filtering

**Original BPMN**: Product catalog with search and filter

**Files:**
- `product-table.bpmn.xml` - Original CoachView with nested table
- `ProductTable.tsx` - React component with state management
- `productService.ts` - Backend API service

**Features Demonstrated:**
- Data table binding
- Row selection
- Search/filter functionality
- Pagination

## Example 3: Multi-Step Wizard

**Original BPMN**: Order processing workflow with multiple screens

**Files:**
- `order-wizard.bpmn.xml` - BPD process with Human Services
- `OrderWizard.tsx` - Multi-step form component
- `orderProcessing.service.ts` - Workflow orchestration

**Features Demonstrated:**
- Multi-step navigation
- State persistence across steps
- Conditional logic
- Integration with bpmn-js for visualization

## How to Use These Examples

### 1. Analyze the Original BPMN

```bash
node scripts/analyze-bpmn.js examples/user-form.bpmn.xml
```

This generates:
- `user-form-analysis.json` - Detailed component inventory
- `user-form-analysis.md` - Human-readable report

### 2. Extract Components

```bash
node scripts/extract-components.js examples/user-form.bpmn.xml all
```

This creates:
- `extracted/user-form/coachView/*.xml` - Individual CoachViews
- `extracted/user-form/serviceTask/*.xml` - Service tasks
- `extracted/user-form/index.json` - Component index

### 3. Generate React Components

```bash
node scripts/generate-react-components.js extracted/user-form output/frontend
```

This creates:
- `output/frontend/components/UserForm.tsx`
- `output/frontend/types/bpmn-types.ts`
- `output/frontend/components/index.ts`

### 4. Generate Node.js Services

```bash
node scripts/generate-node-services.js extracted/user-form output/backend
```

This creates:
- `output/backend/services/*.service.ts`
- `output/backend/services/bpmnJs.service.ts`
- `output/backend/ServiceOrchestrator.ts`
- `output/backend/package.json`

### 5. Review and Customize

1. Review generated components
2. Implement TODO sections
3. Add styling
4. Test functionality
5. Integrate with your application

## Running the Examples

### Frontend (React)

```bash
cd output/frontend
npm install
npm start
```

### Backend (Node.js)

```bash
cd output/backend
npm install
npm run dev
```

## Comparison: Before and After

### Before (IBM BPM BPMN XML)

```xml
<coachView id="UserForm_1" type="com.ibm.bpm.coach.Section">
  <coachView id="FirstName" type="com.ibm.bpm.coach.Text"
             binding="tw.local.user.firstName"
             label="First Name"/>
  <coachView id="Submit" type="com.ibm.bpm.coach.Button"
             label="Submit">
    <events>
      <event name="onClick" handler="submitHandler"/>
    </events>
  </coachView>
</coachView>
```

### After (React TypeScript)

```typescript
interface User {
  firstName: string;
  lastName: string;
}

const UserForm: React.FC = () => {
  const [user, setUser] = useState<User>({
    firstName: '',
    lastName: ''
  });

  const handleSubmit = async () => {
    // Submit logic
  };

  return (
    <div className="user-form">
      <label>
        First Name:
        <input
          value={user.firstName}
          onChange={(e) => setUser({ ...user, firstName: e.target.value })}
        />
      </label>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};
```

## Key Takeaways

1. **Data Bindings**: `tw.local.*` → React state hooks
2. **Events**: Event handlers → React event props
3. **Nesting**: Nested CoachViews → Component composition
4. **Services**: Service tasks → async Node.js functions
5. **Validation**: BPMN validation → Form validation libraries

## Additional Resources

- [BPMN Structure Guide](../docs/bpmn-structure.md)
- [Data Bindings Reference](../docs/data-bindings.md)
- [Migration Checklist](../docs/migration-checklist.md)
