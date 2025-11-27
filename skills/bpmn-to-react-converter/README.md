# BPMN to React/Node.js Converter Skill

Convert IBM BPM Teamworks and Camunda BPMN XML files to modern React.js and Node.js/TypeScript applications.

## Quick Start

1. **Analyze your BPMN file**:
   ```bash
   node scripts/analyze-bpmn.js your-file.xml
   ```

2. **Extract components**:
   ```bash
   node scripts/extract-components.js your-file.xml all
   ```

3. **Generate React components**:
   ```bash
   node scripts/generate-react-components.js extracted/your-file output/frontend
   ```

4. **Generate Node.js services**:
   ```bash
   node scripts/generate-node-services.js extracted/your-file output/backend
   ```

## Directory Structure

```
bpmn-to-react-converter/
├── SKILL.md                    # Main skill documentation
├── README.md                   # This file
├── scripts/
│   ├── analyze-bpmn.js        # Analyze BPMN structure
│   ├── extract-components.js  # Extract individual components
│   ├── generate-react-components.js  # Generate React code
│   └── generate-node-services.js     # Generate Node.js services
├── templates/
│   ├── component.template.tsx  # React component template
│   ├── service.template.ts     # Node.js service template
│   └── types.template.ts       # TypeScript types template
├── docs/
│   ├── bpmn-structure.md      # BPMN structure reference
│   ├── data-bindings.md       # Data binding conversion guide
│   └── migration-checklist.md # Migration checklist
└── examples/
    ├── README.md              # Examples overview
    ├── user-form/            # Simple form example
    ├── data-table/           # Table with filtering
    └── wizard/               # Multi-step workflow
```

## What This Skill Does

### Problem It Solves

IBM BPM stores UI components (CoachViews), workflows (Human Services), and business processes (BPD) in large BPMN XML files (often 345KB+). These files are:

- Too large to parse in a single pass
- Contain nested structures 5-10 levels deep
- Use proprietary TeamWorks (tw.*) data bindings
- Require specialized knowledge to convert

### Solution Provided

This skill provides:

1. **Streaming XML Parser**: Handles large files without memory issues
2. **Component Extraction**: Extracts CoachViews, Services, and Processes individually
3. **Code Generation**: Creates React components and Node.js services
4. **bpmn-js Integration**: Integrates with bpmn.io toolkit for visualization
5. **Template System**: Generates reusable templates for similar components

## Key Features

### 1. Large File Support (345KB+)

Uses SAX streaming parser to handle files that crash standard parsers:

```javascript
const saxStream = require('sax').createStream(true);
saxStream.on('opentag', (node) => {
  // Process incrementally
});
```

### 2. Component Mapping

Automatically maps IBM BPM components to React:

| IBM BPM CoachView | React Component |
|-------------------|-----------------|
| `com.ibm.bpm.coach.Button` | `<Button>` |
| `com.ibm.bpm.coach.Text` | `<Input>` |
| `com.ibm.bpm.coach.Table` | `<DataTable>` |
| `com.ibm.bpm.coach.Section` | `<Section>` |

### 3. Data Binding Conversion

Converts TeamWorks bindings to React state:

```
tw.local.userName  →  const [userName, setUserName] = useState('')
tw.local.user.email  →  state.user.email
#{expression}  →  JavaScript expression
```

### 4. bpmn-js Integration

Generates code that integrates with [bpmn-js](https://bpmn.io/toolkit/bpmn-js/):

- Load and visualize BPMN diagrams
- Highlight active tasks
- Track process execution
- Interactive process models

### 5. Service Orchestration

Converts BPMN service tasks to Node.js/TypeScript services:

```typescript
@injectable()
export class UserValidationService {
  async execute(context: ServiceContext): Promise<ServiceResult> {
    // Converted service logic
  }
}
```

## Installation

### Prerequisites

```bash
# Install Node.js dependencies
npm install xml2js fast-xml-parser sax xmldom
npm install bpmn-js express tsyringe reflect-metadata
npm install --save-dev @types/node typescript
```

### Verify Installation

```bash
node scripts/analyze-bpmn.js --help
```

## Usage Workflow

### Step 1: Initial Analysis

Understand your BPMN file structure:

```bash
node scripts/analyze-bpmn.js myprocess.xml
```

**Output:**
- `myprocess-analysis.json` - Component inventory
- `myprocess-analysis.md` - Readable report

**Report includes:**
- CoachView count and types
- Service task inventory
- Data binding catalog
- Complexity score and recommendation

### Step 2: Component Extraction

Extract individual components:

```bash
# Extract all components
node scripts/extract-components.js myprocess.xml all

# Extract only CoachViews
node scripts/extract-components.js myprocess.xml coachview

# Extract specific component
node scripts/extract-components.js myprocess.xml service ServiceTask_123
```

**Output:**
```
extracted/myprocess/
├── coachView/
│   ├── Button1.xml
│   ├── Button1.json
│   └── Form1.xml
├── serviceTask/
│   └── ValidateUser.xml
└── index.json
```

### Step 3: Generate React Components

Convert CoachViews to React:

```bash
node scripts/generate-react-components.js extracted/myprocess output/frontend
```

**Output:**
```
output/frontend/
├── components/
│   ├── Button1.tsx
│   ├── Form1.tsx
│   └── index.ts
└── types/
    └── bpmn-types.ts
```

### Step 4: Generate Node.js Services

Convert service tasks to Node.js:

```bash
node scripts/generate-node-services.js extracted/myprocess output/backend
```

**Output:**
```
output/backend/
├── services/
│   ├── validateUser.service.ts
│   ├── bpmnJs.service.ts
│   └── ...
├── ServiceOrchestrator.ts
└── package.json
```

### Step 5: Review and Customize

1. Review generated components
2. Implement TODO sections (marked in code)
3. Add styling and layout
4. Test components
5. Integrate with your app

## Examples

See [examples/README.md](examples/README.md) for complete examples including:

- Simple user form
- Data table with filtering
- Multi-step wizard
- Complex nested structures

## Documentation

- **[SKILL.md](SKILL.md)** - Complete skill documentation
- **[bpmn-structure.md](docs/bpmn-structure.md)** - BPMN XML structure reference
- **[data-bindings.md](docs/data-bindings.md)** - Data binding conversion guide
- **[examples/](examples/)** - Working examples

## Common Scenarios

### Scenario 1: Single CoachView

```bash
# Analyze
node scripts/analyze-bpmn.js form.xml

# Extract
node scripts/extract-components.js form.xml coachview

# Generate React
node scripts/generate-react-components.js extracted/form frontend/

# Done! Component is in frontend/components/
```

### Scenario 2: Complex Process with Services

```bash
# Analyze to understand complexity
node scripts/analyze-bpmn.js process.xml
# Check complexity score in output

# Extract all components
node scripts/extract-components.js process.xml all

# Generate both frontend and backend
node scripts/generate-react-components.js extracted/process frontend/
node scripts/generate-node-services.js extracted/process backend/

# Install and run
cd backend && npm install && npm run dev
cd frontend && npm install && npm start
```

### Scenario 3: Large File (345KB+)

The scripts automatically handle large files using streaming parsers. No special flags needed:

```bash
# Works even with 345KB+ files
node scripts/analyze-bpmn.js large-process.xml
```

## Troubleshooting

### Memory Issues

If you still encounter memory issues with very large files (1MB+):

```bash
node --max-old-space-size=4096 scripts/analyze-bpmn.js huge-file.xml
```

### Parsing Errors

Check XML validity:
```bash
# Ensure file is valid XML
xmllint --noout your-file.xml
```

### Component Not Extracted

Verify component type in analysis report:
```bash
node scripts/analyze-bpmn.js your-file.xml
# Check the component types in the report
```

## Integration with bpmn-js

The generated code integrates with bpmn-js for visualization:

```typescript
// Frontend: Display BPMN diagram
import BpmnViewer from 'bpmn-js/lib/Viewer';

const viewer = new BpmnViewer({ container: '#canvas' });
await viewer.importXML(bpmnXml);

// Backend: Process execution with highlighting
const orchestrator = new ServiceOrchestrator();
await orchestrator.loadProcess(bpmnXml, containerElement);
await orchestrator.executeService('ServiceTask_1', context);
```

## Best Practices

1. **Start Small**: Convert one CoachView first, test it, then proceed
2. **Analyze First**: Always run analysis before extraction
3. **Review Generated Code**: Check TODOs and implement business logic
4. **Test Incrementally**: Test each component before moving to the next
5. **Document Bindings**: Keep a mapping of tw.* → React state
6. **Version Control**: Commit after each successful conversion

## Limitations

- Custom Java services require manual conversion
- Some IBM BPM-specific features may not have direct React equivalents
- Complex process orchestration may need a workflow engine
- Performance characteristics may differ from original

## Support and Resources

- **IBM BPM Documentation**: https://www.ibm.com/docs/en/bpm
- **bpmn-js Documentation**: https://bpmn.io/toolkit/bpmn-js/
- **BPMN 2.0 Specification**: https://www.omg.org/spec/BPMN/2.0/

## Contributing

This skill is designed to be extended. Add new component mappings in:
- `scripts/generate-react-components.js` → `initializeComponentMappings()`

Add new service converters in:
- `scripts/generate-node-services.js` → `generateServiceCode()`

## License

This skill is part of the Claude Code Skills library.
