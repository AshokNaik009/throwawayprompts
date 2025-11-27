#!/usr/bin/env node

/**
 * Component Extractor
 *
 * Extracts individual components (CoachViews, Services, Processes) from
 * large BPMN XML files using chunked streaming approach.
 *
 * Usage: node extract-components.js <bpmn-file.xml> <component-type> [component-id]
 *
 * component-type: coachview | service | process | all
 * component-id: optional specific component to extract
 */

const fs = require('fs');
const path = require('path');
const sax = require('sax');
const { XMLBuilder } = require('fast-xml-parser');

class ComponentExtractor {
  constructor(outputDir = './extracted') {
    this.outputDir = outputDir;
    this.components = [];
    this.currentComponent = null;
    this.captureDepth = 0;
    this.capturingContent = false;
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true
    });

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  extract(xmlFilePath, componentType = 'all', componentId = null) {
    return new Promise((resolve, reject) => {
      const saxStream = sax.createStream(true, {
        trim: false,
        normalize: false,
        lowercase: false,
        xmlns: true
      });

      let currentDepth = 0;
      let capturedContent = [];
      let componentMetadata = null;

      const shouldCapture = (tagName, attributes) => {
        if (componentId && attributes.id !== componentId) {
          return false;
        }

        if (componentType === 'all') {
          return ['coachView', 'humanService', 'service', 'process', 'bpdProcess', 'serviceTask'].includes(tagName);
        }

        const typeMap = {
          'coachview': ['coachView'],
          'service': ['humanService', 'service'],
          'process': ['process', 'bpdProcess'],
          'task': ['serviceTask', 'scriptTask', 'userTask']
        };

        return typeMap[componentType.toLowerCase()]?.includes(tagName) || false;
      };

      saxStream.on('opentag', (node) => {
        if (!this.capturingContent && shouldCapture(node.name, node.attributes)) {
          // Start capturing
          this.capturingContent = true;
          this.captureDepth = currentDepth;
          capturedContent = [];
          componentMetadata = {
            type: node.name,
            id: node.attributes.id,
            name: node.attributes.name || node.attributes.id,
            attributes: { ...node.attributes }
          };
        }

        if (this.capturingContent) {
          capturedContent.push({
            type: 'open',
            name: node.name,
            attributes: node.attributes,
            depth: currentDepth - this.captureDepth
          });
        }

        currentDepth++;
      });

      saxStream.on('text', (text) => {
        if (this.capturingContent && text.trim()) {
          capturedContent.push({
            type: 'text',
            value: text
          });
        }
      });

      saxStream.on('closetag', (tagName) => {
        currentDepth--;

        if (this.capturingContent) {
          capturedContent.push({
            type: 'close',
            name: tagName,
            depth: currentDepth - this.captureDepth
          });

          if (currentDepth === this.captureDepth) {
            // Finished capturing this component
            this.saveComponent(componentMetadata, capturedContent);
            this.components.push(componentMetadata);
            this.capturingContent = false;
            capturedContent = [];
            componentMetadata = null;
          }
        }
      });

      saxStream.on('error', (error) => {
        console.error('SAX Parser Error:', error);
        reject(error);
      });

      saxStream.on('end', () => {
        resolve({
          extractedCount: this.components.length,
          components: this.components,
          outputDir: this.outputDir
        });
      });

      const fileStream = fs.createReadStream(xmlFilePath, { encoding: 'utf8' });
      fileStream.pipe(saxStream);
    });
  }

  saveComponent(metadata, capturedContent) {
    // Create subdirectory for component type
    const typeDir = path.join(this.outputDir, metadata.type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    // Save XML content
    const xmlContent = this.reconstructXML(capturedContent);
    const xmlFileName = `${metadata.id || 'unnamed'}.xml`;
    const xmlPath = path.join(typeDir, xmlFileName);
    fs.writeFileSync(xmlPath, xmlContent);

    // Save metadata as JSON
    const jsonFileName = `${metadata.id || 'unnamed'}.json`;
    const jsonPath = path.join(typeDir, jsonFileName);
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

    console.log(`Extracted: ${metadata.type}/${metadata.name || metadata.id}`);
  }

  reconstructXML(capturedContent) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    let indentLevel = 0;
    const indent = '  ';

    for (const item of capturedContent) {
      if (item.type === 'open') {
        xml += indent.repeat(indentLevel);
        xml += `<${item.name}`;

        // Add attributes
        if (item.attributes) {
          for (const [key, value] of Object.entries(item.attributes)) {
            xml += ` ${key}="${this.escapeXML(value)}"`;
          }
        }

        xml += '>\n';
        indentLevel++;
      } else if (item.type === 'text') {
        xml += indent.repeat(indentLevel);
        xml += this.escapeXML(item.value.trim()) + '\n';
      } else if (item.type === 'close') {
        indentLevel--;
        xml += indent.repeat(indentLevel);
        xml += `</${item.name}>\n`;
      }
    }

    return xml;
  }

  escapeXML(str) {
    if (typeof str !== 'string') return str;

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  generateIndex() {
    const indexPath = path.join(this.outputDir, 'index.json');
    const index = {
      extractedAt: new Date().toISOString(),
      totalComponents: this.components.length,
      components: this.components.map(c => ({
        type: c.type,
        id: c.id,
        name: c.name,
        path: `${c.type}/${c.id}.xml`
      }))
    };

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`\nIndex saved to: ${indexPath}`);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node extract-components.js <bpmn-file.xml> <component-type> [component-id]');
    console.error('');
    console.error('component-type: coachview | service | process | task | all');
    console.error('component-id: optional specific component to extract');
    console.error('');
    console.error('Examples:');
    console.error('  node extract-components.js myprocess.xml all');
    console.error('  node extract-components.js myprocess.xml coachview');
    console.error('  node extract-components.js myprocess.xml service ServiceTask_123');
    process.exit(1);
  }

  const xmlFilePath = args[0];
  const componentType = args[1];
  const componentId = args[2] || null;

  if (!fs.existsSync(xmlFilePath)) {
    console.error(`Error: File not found: ${xmlFilePath}`);
    process.exit(1);
  }

  const outputDir = path.join(
    path.dirname(xmlFilePath),
    'extracted',
    path.basename(xmlFilePath, path.extname(xmlFilePath))
  );

  const extractor = new ComponentExtractor(outputDir);

  console.log(`Extracting components from: ${xmlFilePath}`);
  console.log(`Component type: ${componentType}`);
  if (componentId) {
    console.log(`Component ID filter: ${componentId}`);
  }
  console.log(`Output directory: ${outputDir}\n`);

  extractor.extract(xmlFilePath, componentType, componentId)
    .then((result) => {
      console.log('\n=== EXTRACTION COMPLETE ===');
      console.log(`Total components extracted: ${result.extractedCount}`);
      console.log(`Output directory: ${result.outputDir}`);

      extractor.generateIndex();

      console.log('\nNext steps:');
      console.log('1. Review extracted components in the output directory');
      console.log('2. Use generate-templates.js to create React/Node.js code');
      console.log('3. Check index.json for component inventory');
    })
    .catch((error) => {
      console.error('Error extracting components:', error);
      process.exit(1);
    });
}

module.exports = ComponentExtractor;
