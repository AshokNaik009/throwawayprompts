# Quick Start Guide

Get started converting your IBM BPM BPMN files to React and Node.js in 5 minutes.

## Installation

```bash
# Navigate to the skill directory
cd .claude/skills/bpmn-to-react-converter

# Install dependencies
npm install
```

## Basic Workflow

### 1. Analyze Your BPMN File

First, understand what's in your BPMN file:

```bash
npm run analyze your-bpmn-file.xml
```

**What you get:**
- Component inventory (CoachViews, Services, Tasks)
- Complexity score and recommendation
- Data binding catalog
- JSON and Markdown reports

**Example output:**
```
=== BPMN ANALYSIS REPORT ===

SUMMARY:
  Coach Views: 12
  Human Services: 3
  BPD Processes: 1
  Service Tasks: 5
  Data Bindings: 23
  Max Nesting Depth: 4

COMPLEXITY:
  Score: 87
  Recommendation: MEDIUM: Recommend component-by-component conversion
```

### 2. Extract Components

Break down the large BPMN file into individual components:

```bash
npm run extract your-bpmn-file.xml all
```

**What you get:**
```
extracted/your-bpmn-file/
├── coachView/
│   ├── UserForm.xml
│   ├── SubmitButton.xml
│   └── ...
├── serviceTask/
│   ├── ValidateUser.xml
│   └── ...
└── index.json
```

### 3. Generate React Components

Convert CoachViews to React TypeScript components:

```bash
npm run generate:react extracted/your-bpmn-file output/frontend
```

**What you get:**
```typescript
// output/frontend/components/UserForm.tsx
import React, { useState } from 'react';

export interface UserFormProps {
  className?: string;
  value?: any;
  onChange?: (value: any) => void;
}

export const UserForm: React.FC<UserFormProps> = ({
  className,
  value,
  onChange
}) => {
  const [internalValue, setInternalValue] = useState(value);

  return (
    <div className={`userform ${className || ''}`}>
      {/* TODO: Implement component logic */}
    </div>
  );
};
```

### 4. Generate Node.js Services

Convert service tasks to Node.js/TypeScript services:

```bash
npm run generate:node extracted/your-bpmn-file output/backend
```

**What you get:**
```typescript
// output/backend/services/validateUser.service.ts
import { injectable } from 'tsyringe';

@injectable()
export class ValidateUserService {
  async execute(context: ServiceContext): Promise<ServiceResult> {
    // TODO: Implement service logic
  }
}
```

### 5. Run Your Application

**Frontend:**
```bash
cd output/frontend
npm install
npm start
```

**Backend:**
```bash
cd output/backend
npm install
npm run dev
```

## Real-World Example

Let's convert a user registration form from IBM BPM:

### Step 1: Analyze

```bash
npm run analyze examples/user-registration.xml
```

Output shows:
- 8 CoachViews (text inputs, buttons)
- 2 Service Tasks (validation, save)
- 15 data bindings
- Complexity: MEDIUM

### Step 2: Extract

```bash
npm run extract examples/user-registration.xml all
```

Creates:
- `extracted/user-registration/coachView/FirstNameInput.xml`
- `extracted/user-registration/coachView/LastNameInput.xml`
- `extracted/user-registration/coachView/EmailInput.xml`
- `extracted/user-registration/serviceTask/ValidateUser.xml`
- etc.

### Step 3: Generate Code

```bash
# Generate React components
npm run generate:react extracted/user-registration frontend/

# Generate Node.js services
npm run generate:node extracted/user-registration backend/
```

### Step 4: Customize

Edit the generated files:

**frontend/components/UserRegistrationForm.tsx:**
```typescript
import React, { useState } from 'react';

export const UserRegistrationForm: React.FC = () => {
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  const handleSubmit = async () => {
    // Call backend service
    const response = await fetch('/api/users/validate', {
      method: 'POST',
      body: JSON.stringify(user)
    });
    // Handle response
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Implement form fields */}
    </form>
  );
};
```

**backend/services/validateUser.service.ts:**
```typescript
@injectable()
export class ValidateUserService {
  async execute(context: ServiceContext): Promise<ServiceResult> {
    const { email, firstName, lastName } = context.variables;

    // Validate email
    if (!this.isValidEmail(email)) {
      return { success: false, error: 'Invalid email' };
    }

    // Check if user exists
    const exists = await this.checkUserExists(email);
    if (exists) {
      return { success: false, error: 'User already exists' };
    }

    return { success: true };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async checkUserExists(email: string): Promise<boolean> {
    // Database check
    return false;
  }
}
```

### Step 5: Test

```bash
# Run tests
cd backend && npm test
cd frontend && npm test
```

## Tips for Success

### 1. Start with Analysis

Always run analysis first to understand:
- How many components you have
- Complexity level
- Data binding patterns

### 2. Extract Incrementally

For large files (345KB+), extract components by type:

```bash
# Extract only CoachViews first
npm run extract your-file.xml coachview

# Then extract services
npm run extract your-file.xml service
```

### 3. Review Generated Code

The generated code includes:
- ✅ Correct TypeScript interfaces
- ✅ State management hooks
- ✅ Event handlers structure
- ⚠️ TODO comments for business logic

**Always review and implement TODOs!**

### 4. Use bpmn-js for Visualization

The generated backend includes bpmn-js integration:

```typescript
import { BpmnJsService } from './services/bpmnJs.service';

const bpmnService = new BpmnJsService();
await bpmnService.initializeModeler(containerElement);
await bpmnService.loadBpmn(bpmnXml);

// Highlight active task
bpmnService.highlightElement('ServiceTask_1', '#FFA500');
```

### 5. Test in Isolation

Test each component independently:

```typescript
// UserForm.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { UserForm } from './UserForm';

test('updates value on input change', () => {
  const onChange = jest.fn();
  const { getByRole } = render(<UserForm onChange={onChange} />);

  const input = getByRole('textbox');
  fireEvent.change(input, { target: { value: 'test' } });

  expect(onChange).toHaveBeenCalledWith('test');
});
```

## Common Issues

### Issue: "Cannot find module 'sax'"

**Solution:**
```bash
npm install
```

### Issue: "Out of memory" on large files

**Solution:**
```bash
node --max-old-space-size=4096 scripts/analyze-bpmn.js large-file.xml
```

### Issue: Component not extracted

**Solution:**
Check if the component type is supported in the analysis report. If not, it may be a custom CoachView that needs manual conversion.

### Issue: Generated code has many TODOs

**Solution:**
This is expected! The generator creates the structure, but you need to implement:
- Business logic
- Validation rules
- API calls
- Error handling

## Next Steps

1. ✅ Install dependencies
2. ✅ Analyze your BPMN file
3. ✅ Extract components
4. ✅ Generate React and Node.js code
5. 📝 Review generated code
6. 💻 Implement TODOs
7. 🎨 Add styling
8. ✅ Test components
9. 🚀 Deploy!

## Need Help?

Check these resources:

- **[SKILL.md](SKILL.md)** - Complete documentation
- **[BPMN Structure Guide](docs/bpmn-structure.md)** - BPMN XML reference
- **[Data Bindings Guide](docs/data-bindings.md)** - Binding conversion
- **[Examples](examples/)** - Working examples
- **[bpmn-js Docs](https://bpmn.io/toolkit/bpmn-js/)** - Visualization toolkit

## Ready to Start?

```bash
# Install
npm install

# Analyze your first file
npm run analyze path/to/your/bpmn/file.xml

# Follow the recommendations in the analysis report!
```

Happy converting! 🚀
