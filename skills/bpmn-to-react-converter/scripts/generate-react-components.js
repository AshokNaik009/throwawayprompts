#!/usr/bin/env node

/**
 * React Component Generator
 *
 * Converts extracted CoachView XML to React TypeScript components
 *
 * Usage: node generate-react-components.js <extracted-dir> <output-dir>
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

class ReactComponentGenerator {
  constructor(outputDir = './output/frontend') {
    this.outputDir = outputDir;
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true
    });

    this.componentMappings = this.initializeComponentMappings();
    this.dataBindings = new Set();

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  initializeComponentMappings() {
    return {
      'com.ibm.bpm.coach.Button': 'Button',
      'com.ibm.bpm.coach.Text': 'TextInput',
      'com.ibm.bpm.coach.TextArea': 'TextArea',
      'com.ibm.bpm.coach.Integer': 'NumberInput',
      'com.ibm.bpm.coach.Decimal': 'NumberInput',
      'com.ibm.bpm.coach.Date': 'DatePicker',
      'com.ibm.bpm.coach.Time': 'TimePicker',
      'com.ibm.bpm.coach.Checkbox': 'Checkbox',
      'com.ibm.bpm.coach.Radio': 'RadioGroup',
      'com.ibm.bpm.coach.Select': 'Select',
      'com.ibm.bpm.coach.Table': 'DataTable',
      'com.ibm.bpm.coach.Section': 'Section',
      'com.ibm.bpm.coach.Panel': 'Panel',
      'com.ibm.bpm.coach.OutputText': 'Label',
      'com.ibm.bpm.coach.Image': 'Image',
      'com.ibm.bpm.coach.FileUploader': 'FileUpload',
      'com.ibm.bpm.coach.ContentBox': 'Container'
    };
  }

  generateFromExtractedDir(extractedDir) {
    const coachViewDir = path.join(extractedDir, 'coachView');

    if (!fs.existsSync(coachViewDir)) {
      console.log('No coachView directory found in extracted components');
      return { components: [], count: 0 };
    }

    const xmlFiles = fs.readdirSync(coachViewDir)
      .filter(f => f.endsWith('.xml'));

    const components = [];

    for (const xmlFile of xmlFiles) {
      const xmlPath = path.join(coachViewDir, xmlFile);
      const component = this.generateComponent(xmlPath);

      if (component) {
        components.push(component);
      }
    }

    // Generate types file
    this.generateTypesFile();

    // Generate index file
    this.generateIndexFile(components);

    return {
      components,
      count: components.length,
      outputDir: this.outputDir
    };
  }

  generateComponent(xmlPath) {
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const parsed = this.xmlParser.parse(xmlContent);

    // Get the root element (should be coachView)
    const rootElement = parsed.coachView || parsed;

    const metadata = this.extractMetadata(rootElement);
    const componentName = this.sanitizeComponentName(metadata.name || metadata.id);

    console.log(`Generating React component: ${componentName}`);

    // Extract data bindings
    this.extractDataBindings(rootElement);

    // Generate TypeScript interface for props
    const propsInterface = this.generatePropsInterface(componentName, rootElement);

    // Generate component JSX
    const componentJSX = this.generateComponentJSX(componentName, rootElement);

    // Generate complete component file
    const componentCode = this.generateComponentCode(componentName, propsInterface, componentJSX, metadata);

    // Save component file
    const outputPath = path.join(this.outputDir, 'components', `${componentName}.tsx`);
    const componentDir = path.dirname(outputPath);

    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, componentCode);

    return {
      name: componentName,
      path: outputPath,
      metadata
    };
  }

  extractMetadata(element) {
    const attrs = element['@_id'] ? element : {};

    return {
      id: attrs['@_id'] || 'unknown',
      name: attrs['@_name'] || attrs['@_id'] || 'UnnamedComponent',
      type: attrs['@_type'] || 'unknown',
      binding: attrs['@_binding'] || attrs['@_data-binding']
    };
  }

  extractDataBindings(element, bindings = new Set()) {
    if (typeof element === 'object') {
      for (const [key, value] of Object.entries(element)) {
        if (typeof value === 'string') {
          // Extract tw.local.* bindings
          const twMatches = value.match(/tw\.(local|system|env)\.[\w.]+/g);
          if (twMatches) {
            twMatches.forEach(b => {
              bindings.add(b);
              this.dataBindings.add(b);
            });
          }

          // Extract #{...} bindings
          const exprMatches = value.match(/#\{([^}]+)\}/g);
          if (exprMatches) {
            exprMatches.forEach(b => {
              bindings.add(b);
              this.dataBindings.add(b);
            });
          }
        } else if (typeof value === 'object') {
          this.extractDataBindings(value, bindings);
        }
      }
    }

    return bindings;
  }

  sanitizeComponentName(name) {
    // Convert to PascalCase
    return name
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^./, (chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  convertBindingToState(binding) {
    // tw.local.userName -> userName
    // tw.local.currentUser.email -> currentUser.email
    return binding
      .replace(/^tw\.(local|system|env)\./, '')
      .replace(/#\{([^}]+)\}/, '$1');
  }

  generatePropsInterface(componentName, element) {
    const metadata = this.extractMetadata(element);
    const bindings = this.extractDataBindings(element);

    let propsCode = `export interface ${componentName}Props {\n`;

    // Add common props
    propsCode += `  className?: string;\n`;
    propsCode += `  style?: React.CSSProperties;\n`;

    // Add data binding props
    if (metadata.binding) {
      const stateName = this.convertBindingToState(metadata.binding);
      propsCode += `  value?: any; // Bound to: ${metadata.binding}\n`;
      propsCode += `  onChange?: (value: any) => void;\n`;
    }

    // Add discovered bindings as optional props
    for (const binding of bindings) {
      const propName = this.convertBindingToState(binding);
      if (propName && !propsCode.includes(`${propName}?:`)) {
        propsCode += `  ${propName}?: any; // From: ${binding}\n`;
      }
    }

    propsCode += `}\n`;

    return propsCode;
  }

  generateComponentJSX(componentName, element) {
    const metadata = this.extractMetadata(element);
    const reactComponent = this.componentMappings[metadata.type] || 'div';

    // Simple JSX generation - can be expanded
    return `  return (
    <div className={\`${componentName.toLowerCase()} \${className || ''}\`} style={style}>
      {/* Original type: ${metadata.type} */}
      {/* TODO: Implement component logic */}
      <div>Component: ${componentName}</div>
    </div>
  );`;
  }

  generateComponentCode(componentName, propsInterface, componentJSX, metadata) {
    return `import React, { useState, useEffect } from 'react';

/**
 * ${componentName}
 *
 * Generated from IBM BPM CoachView
 * Original ID: ${metadata.id}
 * Original Type: ${metadata.type}
 * Original Binding: ${metadata.binding || 'none'}
 */

${propsInterface}

export const ${componentName}: React.FC<${componentName}Props> = ({
  className,
  style,
  value,
  onChange,
  ...props
}) => {
  // State management
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (newValue: any) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  };

${componentJSX}
};

export default ${componentName};
`;
  }

  generateTypesFile() {
    const typesPath = path.join(this.outputDir, 'types', 'bpmn-types.ts');
    const typesDir = path.dirname(typesPath);

    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    // Generate type definitions from data bindings
    const typeDefinitions = this.generateTypeDefinitions();

    fs.writeFileSync(typesPath, typeDefinitions);
    console.log(`Generated types file: ${typesPath}`);
  }

  generateTypeDefinitions() {
    let code = `/**
 * Type definitions generated from BPMN data bindings
 */

// Data binding types
export interface BPMNDataBindings {
`;

    for (const binding of this.dataBindings) {
      const varName = this.convertBindingToState(binding);
      code += `  ${varName}?: any; // Original: ${binding}\n`;
    }

    code += `}\n\n`;

    code += `// Common component props
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  visible?: boolean;
}

// Form data types
export interface FormData extends BPMNDataBindings {
  // Add your form-specific fields here
}
`;

    return code;
  }

  generateIndexFile(components) {
    const indexPath = path.join(this.outputDir, 'components', 'index.ts');

    let code = `/**
 * Generated component exports
 */

`;

    for (const component of components) {
      code += `export { ${component.name} } from './${component.name}';\n`;
    }

    fs.writeFileSync(indexPath, code);
    console.log(`Generated index file: ${indexPath}`);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node generate-react-components.js <extracted-dir> [output-dir]');
    console.error('');
    console.error('Example:');
    console.error('  node generate-react-components.js ./extracted/myprocess ./output/frontend');
    process.exit(1);
  }

  const extractedDir = args[0];
  const outputDir = args[1] || './output/frontend';

  if (!fs.existsSync(extractedDir)) {
    console.error(`Error: Directory not found: ${extractedDir}`);
    process.exit(1);
  }

  const generator = new ReactComponentGenerator(outputDir);

  console.log(`Generating React components from: ${extractedDir}`);
  console.log(`Output directory: ${outputDir}\n`);

  const result = generator.generateFromExtractedDir(extractedDir);

  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`Components generated: ${result.count}`);
  console.log(`Output directory: ${result.outputDir}`);
  console.log('\nGenerated files:');

  result.components.forEach((comp, idx) => {
    console.log(`${idx + 1}. ${comp.name} -> ${comp.path}`);
  });

  console.log('\nNext steps:');
  console.log('1. Review generated components');
  console.log('2. Implement component logic (marked with TODO)');
  console.log('3. Add styling and layout');
  console.log('4. Test components individually');
  console.log('5. Integrate into your application');
}

module.exports = ReactComponentGenerator;
