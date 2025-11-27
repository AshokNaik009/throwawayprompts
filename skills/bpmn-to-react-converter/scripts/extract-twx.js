#!/usr/bin/env node

/**
 * TWX Archive Extractor
 *
 * IBM BPM TWX (TeamWorks Export) files are ZIP archives containing XML files
 * organized by pattern numbers (1.*, 64.*, 21.*, 61.*, 4.*, 72.*, 25.*, etc.)
 *
 * Pattern Mapping:
 * - 1.*  = Process Applications
 * - 4.*  = Toolkits
 * - 21.* = Coach Views (UI Components)
 * - 25.* = Processes (BPD) - usually largest files
 * - 61.* = Human Services
 * - 64.* = Service Flows
 * - 72.* = Business Objects/Data Types
 *
 * Usage: node extract-twx.js <file.twx> [output-dir]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { XMLParser } = require('fast-xml-parser');

class TWXExtractor {
  constructor(outputDir = './twx-extracted') {
    this.outputDir = outputDir;
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });

    // Pattern to component type mapping
    this.patternMap = {
      '1': 'process-apps',
      '4': 'toolkits',
      '21': 'coach-views',
      '25': 'processes',
      '61': 'human-services',
      '64': 'service-flows',
      '72': 'business-objects'
    };

    this.inventory = {
      processApps: [],
      toolkits: [],
      coachViews: [],
      processes: [],
      humanServices: [],
      serviceFlows: [],
      businessObjects: [],
      other: []
    };
  }

  /**
   * Extract TWX file (which is a ZIP archive)
   */
  async extractTWX(twxPath) {
    console.log(`Extracting TWX file: ${twxPath}`);

    // Create temp directory for extraction
    const tempDir = path.join(this.outputDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // TWX is just a ZIP file - extract it
    try {
      // Try using unzip command
      execSync(`unzip -q "${twxPath}" -d "${tempDir}"`, { stdio: 'inherit' });
    } catch (error) {
      // Fallback: rename to .zip and extract
      const zipPath = twxPath.replace(/\.twx$/i, '.zip');
      if (!fs.existsSync(zipPath)) {
        fs.copyFileSync(twxPath, zipPath);
      }
      execSync(`unzip -q "${zipPath}" -d "${tempDir}"`, { stdio: 'inherit' });
    }

    console.log(`Extracted to: ${tempDir}`);
    return tempDir;
  }

  /**
   * Analyze extracted TWX structure
   */
  async analyzeTWX(extractedDir) {
    console.log('\nAnalyzing TWX structure...');

    // Navigate to /objects folder (standard TWX structure)
    const objectsDir = path.join(extractedDir, 'objects');

    if (!fs.existsSync(objectsDir)) {
      console.log('No /objects directory found. Analyzing root...');
      return this.analyzeDirectory(extractedDir);
    }

    return this.analyzeDirectory(objectsDir);
  }

  /**
   * Analyze directory and categorize files by pattern
   */
  async analyzeDirectory(dir) {
    const files = fs.readdirSync(dir);
    const xmlFiles = files.filter(f => f.endsWith('.xml'));

    console.log(`Found ${xmlFiles.length} XML files`);

    for (const file of xmlFiles) {
      const filePath = path.join(dir, file);
      const pattern = this.extractPattern(file);
      const category = this.categorizeByPattern(pattern);

      console.log(`Processing: ${file} (Pattern: ${pattern}, Category: ${category})`);

      // Parse XML to get metadata
      const metadata = await this.parseXMLMetadata(filePath);

      const item = {
        filename: file,
        path: filePath,
        pattern,
        category,
        metadata
      };

      // Add to inventory
      this.addToInventory(category, item);
    }

    return this.inventory;
  }

  /**
   * Extract pattern from filename (e.g., "21.abc123.xml" -> "21")
   */
  extractPattern(filename) {
    const match = filename.match(/^(\d+)\./);
    return match ? match[1] : 'unknown';
  }

  /**
   * Categorize file by pattern number
   */
  categorizeByPattern(pattern) {
    return this.patternMap[pattern] || 'other';
  }

  /**
   * Parse XML file to extract metadata
   */
  async parseXMLMetadata(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = this.xmlParser.parse(content);

      // Extract common metadata
      const metadata = {
        size: fs.statSync(filePath).size,
        type: null,
        id: null,
        name: null,
        description: null
      };

      // Find root element
      const rootKey = Object.keys(parsed)[0];
      const root = parsed[rootKey];

      if (root) {
        metadata.type = rootKey;
        metadata.id = root['@_id'] || root['@_bpdid'] || null;
        metadata.name = root['@_name'] || null;
        metadata.description = root.documentation || root['@_description'] || null;
      }

      return metadata;
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error.message);
      return { error: error.message };
    }
  }

  /**
   * Add item to inventory
   */
  addToInventory(category, item) {
    switch (category) {
      case 'process-apps':
        this.inventory.processApps.push(item);
        break;
      case 'toolkits':
        this.inventory.toolkits.push(item);
        break;
      case 'coach-views':
        this.inventory.coachViews.push(item);
        break;
      case 'processes':
        this.inventory.processes.push(item);
        break;
      case 'human-services':
        this.inventory.humanServices.push(item);
        break;
      case 'service-flows':
        this.inventory.serviceFlows.push(item);
        break;
      case 'business-objects':
        this.inventory.businessObjects.push(item);
        break;
      default:
        this.inventory.other.push(item);
    }
  }

  /**
   * Organize files by category
   */
  async organizeFiles() {
    console.log('\nOrganizing files by category...');

    const organized = {};

    for (const [category, items] of Object.entries(this.inventory)) {
      if (items.length === 0) continue;

      const categoryDir = path.join(this.outputDir, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      organized[category] = [];

      for (const item of items) {
        const destPath = path.join(categoryDir, item.filename);
        fs.copyFileSync(item.path, destPath);

        // Also save metadata as JSON
        const jsonPath = destPath.replace('.xml', '.json');
        fs.writeFileSync(jsonPath, JSON.stringify(item.metadata, null, 2));

        organized[category].push({
          original: item.filename,
          organized: destPath,
          metadata: item.metadata
        });

        console.log(`  ${category}/${item.filename}`);
      }
    }

    return organized;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: 0,
        processApps: this.inventory.processApps.length,
        toolkits: this.inventory.toolkits.length,
        coachViews: this.inventory.coachViews.length,
        processes: this.inventory.processes.length,
        humanServices: this.inventory.humanServices.length,
        serviceFlows: this.inventory.serviceFlows.length,
        businessObjects: this.inventory.businessObjects.length,
        other: this.inventory.other.length
      },
      inventory: this.inventory
    };

    report.summary.totalFiles = Object.values(report.summary).reduce((a, b) =>
      typeof b === 'number' ? a + b : a, 0);

    // Save JSON report
    const jsonPath = path.join(this.outputDir, 'twx-inventory.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report saved: ${jsonPath}`);

    // Save Markdown report
    const mdPath = path.join(this.outputDir, 'twx-inventory.md');
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(mdPath, markdown);
    console.log(`Markdown report saved: ${mdPath}`);

    return report;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(report) {
    let md = `# TWX Inventory Report\n\n`;
    md += `**Generated:** ${report.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `| Category | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| **Total Files** | **${report.summary.totalFiles}** |\n`;
    md += `| Process Applications (1.*) | ${report.summary.processApps} |\n`;
    md += `| Toolkits (4.*) | ${report.summary.toolkits} |\n`;
    md += `| Coach Views (21.*) | ${report.summary.coachViews} |\n`;
    md += `| Processes/BPD (25.*) | ${report.summary.processes} |\n`;
    md += `| Human Services (61.*) | ${report.summary.humanServices} |\n`;
    md += `| Service Flows (64.*) | ${report.summary.serviceFlows} |\n`;
    md += `| Business Objects (72.*) | ${report.summary.businessObjects} |\n`;
    md += `| Other | ${report.summary.other} |\n\n`;

    // Add details for each category
    for (const [category, items] of Object.entries(report.inventory)) {
      if (items.length === 0) continue;

      md += `## ${this.formatCategoryName(category)}\n\n`;

      for (const item of items.slice(0, 10)) {
        md += `### ${item.metadata.name || item.filename}\n\n`;
        md += `- **File:** ${item.filename}\n`;
        md += `- **Pattern:** ${item.pattern}\n`;
        md += `- **Type:** ${item.metadata.type || 'Unknown'}\n`;
        md += `- **ID:** ${item.metadata.id || 'N/A'}\n`;
        if (item.metadata.description) {
          md += `- **Description:** ${item.metadata.description}\n`;
        }
        md += `\n`;
      }

      if (items.length > 10) {
        md += `_... and ${items.length - 10} more_\n\n`;
      }
    }

    return md;
  }

  formatCategoryName(category) {
    return category.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node extract-twx.js <file.twx> [output-dir]');
    console.error('');
    console.error('Example:');
    console.error('  node extract-twx.js MyApp.twx ./extracted');
    console.error('');
    console.error('TWX Pattern Guide:');
    console.error('  1.*  = Process Applications');
    console.error('  4.*  = Toolkits');
    console.error('  21.* = Coach Views (UI Components)');
    console.error('  25.* = Processes (BPD) - usually largest files');
    console.error('  61.* = Human Services');
    console.error('  64.* = Service Flows');
    console.error('  72.* = Business Objects/Data Types');
    process.exit(1);
  }

  const twxPath = args[0];
  const outputDir = args[1] || './twx-extracted';

  if (!fs.existsSync(twxPath)) {
    console.error(`Error: File not found: ${twxPath}`);
    process.exit(1);
  }

  const extractor = new TWXExtractor(outputDir);

  (async () => {
    try {
      // Step 1: Extract TWX (ZIP) file
      const extractedDir = await extractor.extractTWX(twxPath);

      // Step 2: Analyze structure
      await extractor.analyzeTWX(extractedDir);

      // Step 3: Organize files
      await extractor.organizeFiles();

      // Step 4: Generate report
      const report = extractor.generateReport();

      console.log('\n=== TWX EXTRACTION COMPLETE ===');
      console.log(`Total files extracted: ${report.summary.totalFiles}`);
      console.log(`Output directory: ${outputDir}`);
      console.log('\nNext steps:');
      console.log('1. Review twx-inventory.md for component overview');
      console.log('2. Use analyze-bpmn.js on specific files for detailed analysis');
      console.log('3. Use extract-components.js to extract individual components');
      console.log('4. Generate React/Node.js code from extracted components');
    } catch (error) {
      console.error('Error extracting TWX:', error);
      process.exit(1);
    }
  })();
}

module.exports = TWXExtractor;
