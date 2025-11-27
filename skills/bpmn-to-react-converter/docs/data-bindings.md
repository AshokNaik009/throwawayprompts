# IBM BPM Data Binding Reference

## Overview

IBM BPM uses a data binding system based on TeamWorks (tw) variables to connect UI components with process data. This guide explains how to convert these bindings to React state management.

## TeamWorks Variable Types

### 1. Local Variables (`tw.local.*`)

**Purpose**: Process instance variables scoped to the current process

**Example:**
```xml
<property name="value" binding="tw.local.userName"/>
<property name="email" binding="tw.local.user.email"/>
<property name="items" binding="tw.local.orderItems"/>
```

**React Conversion:**
```typescript
// Simple variable
const [userName, setUserName] = useState<string>('');

// Nested object
interface User {
  email: string;
  name: string;
}
const [user, setUser] = useState<User>({ email: '', name: '' });

// Array
interface OrderItem {
  id: string;
  quantity: number;
}
const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
```

### 2. System Variables (`tw.system.*`)

**Purpose**: System-provided variables (current user, date, etc.)

**Common System Variables:**
```xml
tw.system.currentUser.userName
tw.system.currentUser.email
tw.system.currentUser.fullName
tw.system.currentDate
tw.system.currentTime
tw.system.currentProcessInstance.id
tw.system.currentProcessInstance.name
```

**React Conversion:**
```typescript
// Use context or global state
interface SystemContext {
  currentUser: {
    userName: string;
    email: string;
    fullName: string;
  };
  currentDate: Date;
  processInstance: {
    id: string;
    name: string;
  };
}

const SystemContext = createContext<SystemContext | null>(null);

// Usage in component
const { currentUser, currentDate } = useContext(SystemContext);
```

### 3. Environment Variables (`tw.env.*`)

**Purpose**: Environment-specific configuration

**Example:**
```xml
tw.env.apiEndpoint
tw.env.maxRetries
tw.env.debugMode
```

**React Conversion:**
```typescript
// Use .env file with React
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
const MAX_RETRIES = parseInt(process.env.REACT_APP_MAX_RETRIES || '3');
const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';
```

## Binding Patterns

### Simple Property Binding

**BPMN:**
```xml
<coachView type="com.ibm.bpm.coach.Text" binding="tw.local.firstName"/>
```

**React:**
```typescript
const [firstName, setFirstName] = useState<string>('');

<input
  type="text"
  value={firstName}
  onChange={(e) => setFirstName(e.target.value)}
/>
```

### Nested Object Binding

**BPMN:**
```xml
<coachView binding="tw.local.customer.address.street"/>
```

**React:**
```typescript
interface Address {
  street: string;
  city: string;
  zip: string;
}

interface Customer {
  name: string;
  address: Address;
}

const [customer, setCustomer] = useState<Customer>({
  name: '',
  address: { street: '', city: '', zip: '' }
});

// Update nested value
const updateStreet = (value: string) => {
  setCustomer(prev => ({
    ...prev,
    address: {
      ...prev.address,
      street: value
    }
  }));
};

<input
  value={customer.address.street}
  onChange={(e) => updateStreet(e.target.value)}
/>
```

### Array/List Binding

**BPMN:**
```xml
<coachView type="com.ibm.bpm.coach.Table" binding="tw.local.products">
  <column binding="name"/>
  <column binding="price"/>
</coachView>
```

**React:**
```typescript
interface Product {
  id: string;
  name: string;
  price: number;
}

const [products, setProducts] = useState<Product[]>([]);

// Add item
const addProduct = (product: Product) => {
  setProducts(prev => [...prev, product]);
};

// Update item
const updateProduct = (id: string, updates: Partial<Product>) => {
  setProducts(prev =>
    prev.map(p => p.id === id ? { ...p, ...updates } : p)
  );
};

// Render
<table>
  {products.map(product => (
    <tr key={product.id}>
      <td>{product.name}</td>
      <td>${product.price}</td>
    </tr>
  ))}
</table>
```

## Expression Bindings

### Conditional Expressions

**BPMN:**
```xml
<property name="visible" value="#{tw.local.userRole == 'admin'}"/>
<property name="disabled" value="#{tw.local.itemCount == 0}"/>
```

**React:**
```typescript
const [userRole, setUserRole] = useState<string>('');
const [itemCount, setItemCount] = useState<number>(0);

// Conditional rendering
{userRole === 'admin' && <AdminPanel />}

// Conditional prop
<button disabled={itemCount === 0}>
  Process Items
</button>
```

### Computed Values

**BPMN:**
```xml
<property name="label" value="#{tw.local.firstName + ' ' + tw.local.lastName}"/>
<property name="total" value="#{tw.local.price * tw.local.quantity}"/>
```

**React:**
```typescript
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [price, setPrice] = useState(0);
const [quantity, setQuantity] = useState(0);

// Computed with useMemo
const fullName = useMemo(
  () => `${firstName} ${lastName}`,
  [firstName, lastName]
);

const total = useMemo(
  () => price * quantity,
  [price, quantity]
);

<div>{fullName}</div>
<div>Total: ${total}</div>
```

## State Management Strategies

### Option 1: Component State (Simple)

For small components with minimal data:

```typescript
const MyComponent: React.FC = () => {
  const [localData, setLocalData] = useState({});
  // Component logic
};
```

### Option 2: Context API (Medium)

For shared data across multiple components:

```typescript
interface ProcessContextType {
  userData: any;
  setUserData: (data: any) => void;
  orderData: any;
  setOrderData: (data: any) => void;
}

const ProcessContext = createContext<ProcessContextType | null>(null);

export const ProcessProvider: React.FC = ({ children }) => {
  const [userData, setUserData] = useState({});
  const [orderData, setOrderData] = useState({});

  return (
    <ProcessContext.Provider value={{ userData, setUserData, orderData, setOrderData }}>
      {children}
    </ProcessContext.Provider>
  );
};

// Usage
const MyComponent = () => {
  const { userData, setUserData } = useContext(ProcessContext);
};
```

### Option 3: Redux/Zustand (Complex)

For large applications with complex state:

```typescript
// Zustand example
import create from 'zustand';

interface ProcessState {
  // tw.local.* variables
  local: Record<string, any>;
  // tw.system.* variables
  system: Record<string, any>;
  // Actions
  setLocal: (key: string, value: any) => void;
  getLocal: (key: string) => any;
}

const useProcessStore = create<ProcessState>((set, get) => ({
  local: {},
  system: {},
  setLocal: (key, value) =>
    set((state) => ({
      local: { ...state.local, [key]: value }
    })),
  getLocal: (key) => get().local[key]
}));

// Usage
const MyComponent = () => {
  const { local, setLocal } = useProcessStore();
  const userName = local.userName;

  const handleChange = (value: string) => {
    setLocal('userName', value);
  };
};
```

## Binding Conversion Examples

### Example 1: User Form

**BPMN:**
```xml
<coachView type="com.ibm.bpm.coach.Section">
  <coachView type="com.ibm.bpm.coach.Text"
             binding="tw.local.user.firstName"
             label="First Name"/>
  <coachView type="com.ibm.bpm.coach.Text"
             binding="tw.local.user.lastName"
             label="Last Name"/>
  <coachView type="com.ibm.bpm.coach.Text"
             binding="tw.local.user.email"
             label="Email"/>
</coachView>
```

**React:**
```typescript
interface User {
  firstName: string;
  lastName: string;
  email: string;
}

const UserForm: React.FC = () => {
  const [user, setUser] = useState<User>({
    firstName: '',
    lastName: '',
    email: ''
  });

  const updateUser = (field: keyof User, value: string) => {
    setUser(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <label>
        First Name:
        <input
          value={user.firstName}
          onChange={(e) => updateUser('firstName', e.target.value)}
        />
      </label>
      <label>
        Last Name:
        <input
          value={user.lastName}
          onChange={(e) => updateUser('lastName', e.target.value)}
        />
      </label>
      <label>
        Email:
        <input
          type="email"
          value={user.email}
          onChange={(e) => updateUser('email', e.target.value)}
        />
      </label>
    </div>
  );
};
```

### Example 2: Conditional Display

**BPMN:**
```xml
<coachView type="com.ibm.bpm.coach.Section"
           visible="#{tw.local.showAdvanced}">
  <!-- Advanced options -->
</coachView>
```

**React:**
```typescript
const [showAdvanced, setShowAdvanced] = useState(false);

{showAdvanced && (
  <div className="advanced-options">
    {/* Advanced options */}
  </div>
)}
```

### Example 3: Data Table with Selection

**BPMN:**
```xml
<coachView type="com.ibm.bpm.coach.Table"
           binding="tw.local.items"
           selection="tw.local.selectedItem">
  <column binding="name"/>
  <column binding="quantity"/>
</coachView>
```

**React:**
```typescript
interface Item {
  id: string;
  name: string;
  quantity: number;
}

const [items, setItems] = useState<Item[]>([]);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Quantity</th>
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr
        key={item.id}
        onClick={() => setSelectedItem(item)}
        className={selectedItem?.id === item.id ? 'selected' : ''}
      >
        <td>{item.name}</td>
        <td>{item.quantity}</td>
      </tr>
    ))}
  </tbody>
</table>
```

## Best Practices

1. **Type Safety**: Always define TypeScript interfaces for your data structures
2. **Immutability**: Use spread operators or immer for state updates
3. **Memoization**: Use useMemo for computed values
4. **Context**: Use Context API for truly shared state
5. **Normalization**: Normalize nested data for easier updates
6. **Validation**: Add runtime validation for critical data bindings

## Common Pitfalls

1. **Direct Mutation**: Avoid `user.name = value` - use setState
2. **Missing Dependencies**: Include all dependencies in useMemo/useEffect
3. **Over-rendering**: Memoize expensive computations
4. **Lost References**: Maintain object references for React reconciliation
5. **Type Mismatches**: Ensure BPMN types map correctly to TypeScript types

## Tools and Helpers

Generate type-safe binding helpers:

```typescript
// Create a hook for tw.local bindings
function useLocalVariable<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    // Optionally sync with backend
  }, []);

  return [value, updateValue] as const;
}

// Usage
const [userName, setUserName] = useLocalVariable('userName', '');
```
