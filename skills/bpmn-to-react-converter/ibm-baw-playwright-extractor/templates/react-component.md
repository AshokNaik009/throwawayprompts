# React Component Templates

Templates for converting IBM BAW Coach View elements to React components.

## Text Input

```typescript
// TextInput.tsx
import React from 'react';
import { Form, Input } from 'antd';

interface TextInputProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  onChange?: (value: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  name,
  label,
  placeholder,
  required = false,
  readOnly = false,
  maxLength,
  onChange
}) => (
  <Form.Item
    name={name}
    label={label}
    rules={[{ required, message: `${label} is required` }]}
  >
    <Input
      placeholder={placeholder}
      readOnly={readOnly}
      maxLength={maxLength}
      onChange={(e) => onChange?.(e.target.value)}
    />
  </Form.Item>
);
```

## Select/Dropdown

```typescript
// SelectField.tsx
import React from 'react';
import { Form, Select } from 'antd';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label: string;
  options: Option[];
  required?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  options,
  required = false,
  placeholder = 'Select...',
  onChange
}) => (
  <Form.Item
    name={name}
    label={label}
    rules={[{ required, message: `${label} is required` }]}
  >
    <Select placeholder={placeholder} onChange={onChange}>
      {options.map((opt) => (
        <Select.Option key={opt.value} value={opt.value}>
          {opt.label}
        </Select.Option>
      ))}
    </Select>
  </Form.Item>
);
```

## Checkbox

```typescript
// CheckboxField.tsx
import React from 'react';
import { Form, Checkbox } from 'antd';

interface CheckboxFieldProps {
  name: string;
  label: string;
  onChange?: (checked: boolean) => void;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  onChange
}) => (
  <Form.Item name={name} valuePropName="checked">
    <Checkbox onChange={(e) => onChange?.(e.target.checked)}>
      {label}
    </Checkbox>
  </Form.Item>
);
```

## Date Picker

```typescript
// DateField.tsx
import React from 'react';
import { Form, DatePicker } from 'antd';
import dayjs from 'dayjs';

interface DateFieldProps {
  name: string;
  label: string;
  required?: boolean;
  format?: string;
  onChange?: (date: Date | null) => void;
}

export const DateField: React.FC<DateFieldProps> = ({
  name,
  label,
  required = false,
  format = 'YYYY-MM-DD',
  onChange
}) => (
  <Form.Item
    name={name}
    label={label}
    rules={[{ required, message: `${label} is required` }]}
  >
    <DatePicker
      format={format}
      onChange={(date) => onChange?.(date?.toDate() || null)}
    />
  </Form.Item>
);
```

## Table/DataGrid

```typescript
// DataTable.tsx
import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnsType<T>;
  loading?: boolean;
  onRowClick?: (record: T) => void;
  pagination?: boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  onRowClick,
  pagination = true
}: DataTableProps<T>) {
  return (
    <Table
      dataSource={data}
      columns={columns}
      loading={loading}
      rowKey="id"
      pagination={pagination ? { pageSize: 10 } : false}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record)
      })}
    />
  );
}
```

## Section/Card

```typescript
// Section.tsx
import React from 'react';
import { Card, Typography } from 'antd';

interface SectionProps {
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  collapsible = false,
  defaultExpanded = true,
  children
}) => (
  <Card
    title={title && <Typography.Title level={4}>{title}</Typography.Title>}
    style={{ marginBottom: 16 }}
  >
    {children}
  </Card>
);
```

## Button

```typescript
// ActionButton.tsx
import React from 'react';
import { Button } from 'antd';

interface ActionButtonProps {
  label: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  type = 'default',
  onClick,
  loading = false,
  disabled = false
}) => (
  <Button
    type={type}
    onClick={onClick}
    loading={loading}
    disabled={disabled}
  >
    {label}
  </Button>
);
```

## Form Container

```typescript
// CoachFormContainer.tsx
import React from 'react';
import { Form, Button, Space, message } from 'antd';

interface CoachFormContainerProps<T> {
  initialValues?: Partial<T>;
  onSubmit: (values: T) => Promise<void>;
  children: React.ReactNode;
}

export function CoachFormContainer<T>({
  initialValues,
  onSubmit,
  children
}: CoachFormContainerProps<T>) {
  const [form] = Form.useForm<T>();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values: T) => {
    setLoading(true);
    try {
      await onSubmit(values);
      message.success('Form submitted successfully');
    } catch (error) {
      message.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSubmit}
    >
      {children}
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Submit
          </Button>
          <Button onClick={() => form.resetFields()}>
            Reset
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
```

## Validation Patterns

```typescript
// validation.ts
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s-()]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/
};

export const createValidationRules = (config: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
}) => {
  const rules: any[] = [];

  if (config.required) {
    rules.push({ required: true, message: config.message || 'This field is required' });
  }
  if (config.minLength) {
    rules.push({ min: config.minLength, message: `Minimum ${config.minLength} characters` });
  }
  if (config.maxLength) {
    rules.push({ max: config.maxLength, message: `Maximum ${config.maxLength} characters` });
  }
  if (config.pattern) {
    rules.push({ pattern: config.pattern, message: 'Invalid format' });
  }

  return rules;
};
```

## Event Handler Conversion

```typescript
// useCoachEvents.ts
// Convert IBM BAW this.context patterns to React

import { useCallback } from 'react';
import { Form } from 'antd';

export const useCoachEvents = (form: ReturnType<typeof Form.useForm>[0]) => {
  // this.context.binding.get('value') → form.getFieldValue
  const getBinding = useCallback((path: string) => {
    return form.getFieldValue(path.replace('tw.local.', ''));
  }, [form]);

  // this.context.binding.set('value', x) → form.setFieldValue
  const setBinding = useCallback((path: string, value: any) => {
    form.setFieldValue(path.replace('tw.local.', ''), value);
  }, [form]);

  // this.context.setValid(false, 'message')
  const setValid = useCallback((field: string, isValid: boolean, message?: string) => {
    if (!isValid) {
      form.setFields([{ name: field, errors: [message || 'Invalid'] }]);
    } else {
      form.setFields([{ name: field, errors: [] }]);
    }
  }, [form]);

  return { getBinding, setBinding, setValid };
};
```
