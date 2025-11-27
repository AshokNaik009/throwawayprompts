#!/usr/bin/env node

/**
 * Node.js Service Generator with bpmn-js integration
 *
 * Converts extracted Service Tasks to Node.js/TypeScript services
 * Integrates with bpmn-js for BPMN visualization and execution
 *
 * Usage: node generate-node-services.js <extracted-dir> <output-dir>
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

class NodeServiceGenerator {
  constructor(outputDir = './output/backend') {
    this.outputDir = outputDir;
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  generateFromExtractedDir(extractedDir) {
    const serviceTaskDir = path.join(extractedDir, 'serviceTask');
    const services = [];

    if (fs.existsSync(serviceTaskDir)) {
      const xmlFiles = fs.readdirSync(serviceTaskDir).filter(f => f.endsWith('.xml'));

      for (const xmlFile of xmlFiles) {
        const xmlPath = path.join(serviceTaskDir, xmlFile);
        const service = this.generateService(xmlPath);
        if (service) services.push(service);
      }
    }

    // Generate bpmn-js integration files
    this.generateBpmnJsIntegration();

    // Generate service orchestrator
    this.generateServiceOrchestrator(services);

    // Generate package.json additions
    this.generatePackageJson();

    return {
      services,
      count: services.length,
      outputDir: this.outputDir
    };
  }

  generateService(xmlPath) {
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const parsed = this.xmlParser.parse(xmlContent);

    const rootElement = parsed.serviceTask || parsed.scriptTask || parsed;
    const metadata = {
      id: rootElement['@_id'] || 'unknown',
      name: rootElement['@_name'] || 'UnnamedService',
      implementation: rootElement['@_implementation']
    };

    const serviceName = this.sanitizeServiceName(metadata.name);
    console.log(`Generating Node.js service: ${serviceName}`);

    const serviceCode = this.generateServiceCode(serviceName, metadata);

    const outputPath = path.join(this.outputDir, 'services', `${serviceName}.service.ts`);
    const serviceDir = path.dirname(outputPath);

    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, serviceCode);

    return {
      name: serviceName,
      path: outputPath,
      metadata
    };
  }

  sanitizeServiceName(name) {
    return name
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^./, (chr) => chr.toLowerCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  generateServiceCode(serviceName, metadata) {
    const className = serviceName.charAt(0).toUpperCase() + serviceName.slice(1) + 'Service';

    return `import { injectable } from 'tsyringe';

/**
 * ${className}
 *
 * Generated from IBM BPM Service Task
 * Original ID: ${metadata.id}
 * Implementation: ${metadata.implementation || 'N/A'}
 */

@injectable()
export class ${className} {
  /**
   * Execute the service task
   *
   * @param context - Execution context with process variables
   * @returns Promise with execution result
   */
  async execute(context: ServiceContext): Promise<ServiceResult> {
    try {
      // TODO: Implement service logic from BPMN
      // Original implementation: ${metadata.implementation || 'Not specified'}

      console.log(\`Executing ${className} with context:\`, context);

      // Extract variables from context
      const { variables, processInstanceId } = context;

      // Implement your business logic here
      const result = await this.performBusinessLogic(variables);

      return {
        success: true,
        data: result,
        processInstanceId
      };
    } catch (error) {
      console.error(\`Error in ${className}:\`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processInstanceId: context.processInstanceId
      };
    }
  }

  /**
   * Implement business logic extracted from BPMN
   */
  private async performBusinessLogic(variables: Record<string, any>): Promise<any> {
    // TODO: Implement the actual logic from your BPMN service task
    // This is a placeholder that should be replaced with your business logic

    return {
      timestamp: new Date().toISOString(),
      variables
    };
  }
}

// Type definitions
export interface ServiceContext {
  processInstanceId: string;
  activityId: string;
  variables: Record<string, any>;
  [key: string]: any;
}

export interface ServiceResult {
  success: boolean;
  data?: any;
  error?: string;
  processInstanceId: string;
}

export default ${className};
`;
  }

  generateBpmnJsIntegration() {
    const integrationCode = `import BpmnModeler from 'bpmn-js/lib/Modeler';
import { injectable } from 'tsyringe';

/**
 * BPMN.js Integration Service
 *
 * Handles BPMN diagram loading, visualization, and execution
 * using bpmn-js toolkit (https://bpmn.io/toolkit/bpmn-js/)
 */

@injectable()
export class BpmnJsService {
  private modeler: BpmnModeler | null = null;

  /**
   * Initialize bpmn-js modeler
   */
  async initializeModeler(container: HTMLElement): Promise<void> {
    this.modeler = new BpmnModeler({
      container,
      keyboard: {
        bindTo: document
      }
    });
  }

  /**
   * Load BPMN XML into the modeler
   *
   * @param bpmnXml - BPMN 2.0 XML content
   */
  async loadBpmn(bpmnXml: string): Promise<void> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized');
    }

    try {
      await this.modeler.importXML(bpmnXml);
      console.log('BPMN loaded successfully');
    } catch (error) {
      console.error('Error loading BPMN:', error);
      throw error;
    }
  }

  /**
   * Export current BPMN diagram as XML
   */
  async exportBpmn(): Promise<string> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized');
    }

    try {
      const { xml } = await this.modeler.saveXML({ format: true });
      return xml || '';
    } catch (error) {
      console.error('Error exporting BPMN:', error);
      throw error;
    }
  }

  /**
   * Get BPMN definitions for process execution
   */
  getDefinitions(): any {
    if (!this.modeler) {
      throw new Error('Modeler not initialized');
    }

    return this.modeler.getDefinitions();
  }

  /**
   * Highlight a specific element in the diagram
   */
  highlightElement(elementId: string, color: string = '#52B415'): void {
    if (!this.modeler) return;

    const canvas = this.modeler.get('canvas');
    canvas.addMarker(elementId, 'highlight');

    // Apply custom color
    const element = document.querySelector(\`[data-element-id="\${elementId}"]\`);
    if (element) {
      (element as HTMLElement).style.fill = color;
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    if (!this.modeler) return;

    const canvas = this.modeler.get('canvas');
    const elementRegistry = this.modeler.get('elementRegistry');

    elementRegistry.forEach((element: any) => {
      canvas.removeMarker(element.id, 'highlight');
    });
  }

  /**
   * Destroy the modeler instance
   */
  destroy(): void {
    if (this.modeler) {
      this.modeler.destroy();
      this.modeler = null;
    }
  }
}

export default BpmnJsService;
`;

    const outputPath = path.join(this.outputDir, 'services', 'bpmnJs.service.ts');
    fs.writeFileSync(outputPath, integrationCode);
    console.log(`Generated bpmn-js integration: ${outputPath}`);
  }

  generateServiceOrchestrator(services) {
    const orchestratorCode = `import { container } from 'tsyringe';
${services.map(s => `import { ${s.name.charAt(0).toUpperCase() + s.name.slice(1)}Service } from './services/${s.name}.service';`).join('\n')}
import { BpmnJsService } from './services/bpmnJs.service';

/**
 * Service Orchestrator
 *
 * Manages service execution and BPMN process flow
 * Integrates with bpmn-js for visualization
 */

export class ServiceOrchestrator {
  private bpmnService: BpmnJsService;
  private serviceRegistry: Map<string, any>;

  constructor() {
    this.bpmnService = container.resolve(BpmnJsService);
    this.serviceRegistry = new Map();

    // Register all services
    this.registerServices();
  }

  /**
   * Register all generated services
   */
  private registerServices(): void {
${services.map(s => {
  const className = s.name.charAt(0).toUpperCase() + s.name.slice(1) + 'Service';
  return `    this.serviceRegistry.set('${s.metadata.id}', container.resolve(${className}));`;
}).join('\n')}
  }

  /**
   * Execute a service by its BPMN ID
   */
  async executeService(
    serviceId: string,
    context: any
  ): Promise<any> {
    const service = this.serviceRegistry.get(serviceId);

    if (!service) {
      throw new Error(\`Service not found: \${serviceId}\`);
    }

    // Highlight the service in the diagram
    this.bpmnService.highlightElement(serviceId, '#FFA500');

    try {
      const result = await service.execute(context);

      // Mark as completed
      this.bpmnService.highlightElement(serviceId, '#52B415');

      return result;
    } catch (error) {
      // Mark as failed
      this.bpmnService.highlightElement(serviceId, '#FF0000');
      throw error;
    }
  }

  /**
   * Load and visualize BPMN process
   */
  async loadProcess(bpmnXml: string, container: HTMLElement): Promise<void> {
    await this.bpmnService.initializeModeler(container);
    await this.bpmnService.loadBpmn(bpmnXml);
  }

  /**
   * Get all registered services
   */
  getRegisteredServices(): string[] {
    return Array.from(this.serviceRegistry.keys());
  }
}

export default ServiceOrchestrator;
`;

    const outputPath = path.join(this.outputDir, 'ServiceOrchestrator.ts');
    fs.writeFileSync(outputPath, orchestratorCode);
    console.log(`Generated service orchestrator: ${outputPath}`);
  }

  generatePackageJson() {
    const packageJson = {
      name: 'bpmn-backend-services',
      version: '1.0.0',
      description: 'Generated Node.js services from IBM BPM/Camunda BPMN',
      main: 'dist/index.js',
      scripts: {
        build: 'tsc',
        start: 'node dist/index.js',
        dev: 'ts-node-dev --respawn --transpile-only src/index.ts',
        test: 'jest'
      },
      dependencies: {
        'bpmn-js': '^17.0.0',
        'express': '^4.18.0',
        'tsyringe': '^4.8.0',
        'reflect-metadata': '^0.2.0',
        'cors': '^2.8.5'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/express': '^4.17.0',
        '@types/cors': '^2.8.0',
        'typescript': '^5.0.0',
        'ts-node-dev': '^2.0.0',
        'jest': '^29.0.0',
        '@types/jest': '^29.0.0'
      }
    };

    const outputPath = path.join(this.outputDir, 'package.json');
    fs.writeFileSync(outputPath, JSON.stringify(packageJson, null, 2));
    console.log(`Generated package.json: ${outputPath}`);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node generate-node-services.js <extracted-dir> [output-dir]');
    console.error('');
    console.error('Example:');
    console.error('  node generate-node-services.js ./extracted/myprocess ./output/backend');
    process.exit(1);
  }

  const extractedDir = args[0];
  const outputDir = args[1] || './output/backend';

  if (!fs.existsSync(extractedDir)) {
    console.error(`Error: Directory not found: ${extractedDir}`);
    process.exit(1);
  }

  const generator = new NodeServiceGenerator(outputDir);

  console.log(`Generating Node.js services from: ${extractedDir}`);
  console.log(`Output directory: ${outputDir}\n`);

  const result = generator.generateFromExtractedDir(extractedDir);

  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`Services generated: ${result.count}`);
  console.log(`Output directory: ${result.outputDir}`);

  if (result.services.length > 0) {
    console.log('\nGenerated services:');
    result.services.forEach((svc, idx) => {
      console.log(`${idx + 1}. ${svc.name} -> ${svc.path}`);
    });
  }

  console.log('\nNext steps:');
  console.log('1. cd ' + outputDir);
  console.log('2. npm install');
  console.log('3. Review generated services and implement business logic');
  console.log('4. Test with your BPMN files using bpmn-js');
}

module.exports = NodeServiceGenerator;
