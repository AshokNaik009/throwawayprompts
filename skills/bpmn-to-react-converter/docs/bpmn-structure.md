# IBM BPM BPMN Structure Reference

## Overview

IBM BPM (Business Process Manager) uses BPMN 2.0 XML to define processes, UI components (CoachViews), and services. Understanding this structure is essential for successful migration to React/Node.js.

## Main Components

### 1. CoachViews (UI Components)

**XML Structure:**
```xml
<coachView id="CoachView_1"
           type="com.ibm.bpm.coach.Button"
           name="SubmitButton"
           binding="tw.local.submitAction">
  <properties>
    <property name="label" value="Submit"/>
    <property name="visible" binding="tw.local.showButton"/>
  </properties>
  <events>
    <event name="onClick" handler="submitHandler"/>
  </events>
</coachView>
```

**Key Attributes:**
- `id`: Unique identifier
- `type`: CoachView type (maps to React component)
- `name`: Display name
- `binding`: Data binding path (tw.local.*, tw.system.*)

**Common CoachView Types:**
- `com.ibm.bpm.coach.Button` → Button component
- `com.ibm.bpm.coach.Text` → Text input
- `com.ibm.bpm.coach.Table` → Data table
- `com.ibm.bpm.coach.Section` → Layout container
- `com.ibm.bpm.coach.ContentBox` → Content wrapper

### 2. Human Services (User-Facing Workflows)

**XML Structure:**
```xml
<humanService id="HS_1" name="UserRegistration">
  <documentation>User registration process</documentation>
  <input>
    <variable name="userData" type="UserData"/>
  </input>
  <output>
    <variable name="registrationResult" type="Result"/>
  </output>
  <flow>
    <startEvent id="Start_1"/>
    <userTask id="Task_1" name="Enter Details"/>
    <serviceTask id="Task_2" name="Validate User"/>
    <endEvent id="End_1"/>
  </flow>
</humanService>
```

**Components:**
- Input/Output variables
- Flow definition (tasks, events, gateways)
- Coach associations (UI screens)

### 3. BPD Processes (Business Process Definitions)

**XML Structure:**
```xml
<process id="Process_1"
         name="OrderFulfillment"
         isExecutable="true">
  <startEvent id="StartEvent_1"/>
  <task id="Task_1" name="Receive Order"/>
  <serviceTask id="ServiceTask_1"
               name="Validate Order"
               implementation="##WebService"/>
  <exclusiveGateway id="Gateway_1" name="Check Stock"/>
  <endEvent id="EndEvent_1"/>

  <sequenceFlow id="Flow_1"
                sourceRef="StartEvent_1"
                targetRef="Task_1"/>
</process>
```

**Key Elements:**
- **startEvent**: Process entry point
- **task/userTask**: Human activities
- **serviceTask**: Automated services
- **gateway**: Decision points
- **endEvent**: Process completion
- **sequenceFlow**: Task connections

### 4. Service Tasks (Backend Logic)

**XML Structure:**
```xml
<serviceTask id="ST_1"
             name="ValidateUser"
             implementation="##WebService"
             operationRef="validateUserOperation">
  <dataInputAssociation>
    <sourceRef>tw.local.userId</sourceRef>
    <targetRef>inputParameter</targetRef>
  </dataInputAssociation>
  <dataOutputAssociation>
    <sourceRef>outputParameter</sourceRef>
    <targetRef>tw.local.validationResult</targetRef>
  </dataOutputAssociation>
</serviceTask>
```

**Implementation Types:**
- `##WebService`: External web service call
- `##JavaIntegration`: Java service
- `##Script`: JavaScript/Server-side script

## Data Bindings

### TeamWorks Variables

IBM BPM uses the `tw` prefix for TeamWorks variables:

**Types:**
- `tw.local.*` - Local process variables
- `tw.system.*` - System variables (current user, date, etc.)
- `tw.env.*` - Environment variables

**Examples:**
```xml
<!-- Simple binding -->
<property name="value" binding="tw.local.userName"/>

<!-- Nested object binding -->
<property name="email" binding="tw.local.currentUser.email"/>

<!-- Expression binding -->
<property name="visible" value="#{tw.local.userRole == 'admin'}"/>
```

### Conversion to React State

| IBM BPM | React/TypeScript |
|---------|------------------|
| `tw.local.userName` | `const [userName, setUserName] = useState('')` |
| `tw.local.user.email` | `state.user.email` |
| `#{expression}` | JavaScript expression |

## Nesting and Hierarchy

### Nested CoachViews

CoachViews can be deeply nested:

```xml
<coachView id="ParentForm" type="com.ibm.bpm.coach.Section">
  <coachView id="UserInfo" type="com.ibm.bpm.coach.ContentBox">
    <coachView id="FirstName" type="com.ibm.bpm.coach.Text"/>
    <coachView id="LastName" type="com.ibm.bpm.coach.Text"/>
    <coachView id="AddressSection" type="com.ibm.bpm.coach.Section">
      <coachView id="Street" type="com.ibm.bpm.coach.Text"/>
      <coachView id="City" type="com.ibm.bpm.coach.Text"/>
    </coachView>
  </coachView>
</coachView>
```

**Migration Strategy:**
- Map each CoachView to a React component
- Preserve parent-child relationships
- Use component composition

### Nested Services

Services can call other services:

```xml
<humanService id="MainService">
  <flow>
    <serviceTask id="Task1" implementation="NestedService1"/>
    <serviceTask id="Task2" implementation="NestedService2"/>
  </flow>
</humanService>
```

**Migration Strategy:**
- Create service dependency graph
- Convert to async/await service calls
- Maintain execution order

## Event Handling

### CoachView Events

```xml
<events>
  <event name="onClick" handler="submitHandler"/>
  <event name="onChange" handler="validateInput"/>
  <event name="onLoad" handler="initializeForm"/>
</events>
```

**React Equivalent:**
```typescript
<Button
  onClick={handleSubmit}
  onChange={handleValidate}
  useEffect={handleLoad}
/>
```

## Properties and Configuration

### CoachView Properties

```xml
<properties>
  <property name="label" value="Submit"/>
  <property name="disabled" binding="tw.local.isProcessing"/>
  <property name="visible" value="#{tw.local.showForm}"/>
  <property name="cssClass" value="primary-button"/>
</properties>
```

**React Props Mapping:**
- `label` → `label` prop
- `disabled` → `disabled` prop
- `visible` → conditional rendering
- `cssClass` → `className` prop

## File Size Considerations

Large BPMN files (345KB+) typically contain:
- **Multiple CoachViews**: 50-200+ UI components
- **Nested structures**: 5-10 levels deep
- **Service definitions**: 20-100+ services
- **Data bindings**: 100-500+ variable references
- **Event handlers**: Multiple per component

**Parsing Strategy:**
1. Use SAX streaming parser
2. Extract components incrementally
3. Build dependency graph
4. Generate code in chunks

## Namespaces

Common IBM BPM namespaces:

```xml
xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
xmlns:tw="http://www.ibm.com/xmlns/prod/websphere/lombardi/7.0/bpm/model"
```

## Tips for Migration

1. **Start with analysis**: Use `analyze-bpmn.js` to understand structure
2. **Extract incrementally**: Don't try to convert everything at once
3. **Preserve bindings**: Document all `tw.*` variables
4. **Map components**: Create mapping table for CoachView types
5. **Test early**: Convert one component and test before proceeding
6. **Document dependencies**: Track service call chains

## Common Patterns

### Form with Validation
```xml
<coachView type="com.ibm.bpm.coach.Section" name="UserForm">
  <coachView type="com.ibm.bpm.coach.Text" binding="tw.local.email"/>
  <coachView type="com.ibm.bpm.coach.Button" name="Submit">
    <events>
      <event name="onClick" handler="validateAndSubmit"/>
    </events>
  </coachView>
</coachView>
```

### Conditional Display
```xml
<coachView type="com.ibm.bpm.coach.Section">
  <property name="visible" value="#{tw.local.userRole == 'admin'}"/>
</coachView>
```

### Data Table
```xml
<coachView type="com.ibm.bpm.coach.Table" binding="tw.local.users">
  <columns>
    <column binding="name" label="Name"/>
    <column binding="email" label="Email"/>
  </columns>
</coachView>
```

## Resources

- [IBM BPM Documentation](https://www.ibm.com/docs/en/bpm)
- [BPMN 2.0 Specification](https://www.omg.org/spec/BPMN/2.0/)
- [bpmn-js Documentation](https://bpmn.io/toolkit/bpmn-js/)
