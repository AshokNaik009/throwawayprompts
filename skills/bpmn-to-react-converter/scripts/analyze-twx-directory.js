#!/usr/bin/env node

/**
 * TWX Directory Analyzer
 *
 * Analyzes an already-extracted TWX directory (from /objects folder)
 * and categorizes files by their pattern numbers.
 *
 * Assumes TWX has already been extracted (unzipped).
 *
 * Usage: node analyze-twx-directory.js <extracted-twx-objects-dir>
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

class TWXDirectoryAnalyzer {
  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });

    // Pattern mapping based on IBM BPM documentation
    this.patternMap = {
      '1': { type: 'process-apps', name: 'Process Applications', priority: 'HIGH' },
      '4': { type: 'toolkits', name: 'Toolkits', priority: 'HIGH' },
      '21': { type: 'coach-views', name: 'Coach Views', priority: 'HIGHEST' },
      '25': { type: 'processes', name: 'Processes (BPD)', priority: 'MEDIUM' },
      '61': { type: 'human-services', name: 'Human Services', priority: 'HIGH' },
      '64': { type: 'service-flows', name: 'Service Flows', priority: 'HIGH' },
      '72': { type: 'business-objects', name: 'Business Objects', priority: 'MEDIUM' }
    };

    this.inventory = {};
    this.statistics = {
      totalFiles: 0,
      byPattern: {},
      bySize: { small: 0, medium: 0, large: 0, xlarge: 0 },
      largestFile: null
    };
  }

  async analyze(extractedDir) {
    console.log(`Analyzing extracted TWX directory: ${extractedDir}\n`);

    // Find all XML files
    const xmlFiles = this.findXMLFiles(extractedDir);

    console.log(`Found ${xmlFiles.length} XML files\n`);

    for (const filePath of xmlFiles) {
      await this.processFile(filePath, extractedDir);
    }

    this.generateStatistics();
    return this.inventory;
  }

  findXMLFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.findXMLFiles(fullPath, files);
      } else if (entry.name.endsWith('.xml')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async processFile(filePath, baseDir) {
    const filename = path.basename(filePath);
    const pattern = this.extractPattern(filename);
    const patternInfo = this.patternMap[pattern] || {
      type: 'other',
      name: 'Other',
      priority: 'LOW'
    };

    console.log(`Processing: ${filename} (Pattern ${pattern}: ${patternInfo.name})`);

    // Get file stats
    const stats = fs.statSync(filePath);
    this.statistics.totalFiles++;

    // Categorize by size
    const sizeMB = stats.size / (1024 * 1024);
    if (sizeMB > 1) this.statistics.bySize.xlarge++;
    else if (sizeMB > 0.5) this.statistics.bySize.large++;
    else if (sizeMB > 0.1) this.statistics.bySize.medium++;
    else this.statistics.bySize.small++;

    // Track largest file
    if (!this.statistics.largestFile || stats.size > this.statistics.largestFile.size) {
      this.statistics.largestFile = {
        path: filePath,
        filename,
        size: stats.size,
        sizeMB: sizeMB.toFixed(2)
      };
    }

    // Parse XML to extract metadata
    const metadata = await this.parseMetadata(filePath);

    // Create inventory entry
    const item = {
      filename,
      path: path.relative(baseDir, filePath),
      absolutePath: filePath,
      pattern,
      patternType: patternInfo.type,
      patternName: patternInfo.name,
      priority: patternInfo.priority,
      size: stats.size,
      sizeMB: sizeMB.toFixed(2),
      metadata
    };

    // Add to inventory
    if (!this.inventory[patternInfo.type]) {
      this.inventory[patternInfo.type] = [];
    }
    this.inventory[patternInfo.type].push(item);

    // Update pattern statistics
    this.statistics.byPattern[pattern] = (this.statistics.byPattern[pattern] || 0) + 1;
  }

  extractPattern(filename) {
    const match = filename.match(/^(\d+)\./);
    return match ? match[1] : 'unknown';
  }

  async parseMetadata(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = this.xmlParser.parse(content);

      const metadata = {
        type: null,
        id: null,
        name: null,
        description: null,
        version: null
      };

      // Find root element
      const rootKey = Object.keys(parsed).filter(k => k !== '?xml')[0];
      if (!rootKey) return metadata;

      const root = parsed[rootKey];
      if (!root) return metadata;

      metadata.type = rootKey;
      metadata.id = root['@_id'] || root['@_bpdid'] || root['@_snapshotId'] || null;
      metadata.name = root['@_name'] || root['@_displayName'] || null;
      metadata.description = root.documentation || root['@_description'] || null;
      metadata.version = root['@_version'] || null;

      // Extract data bindings for coach views
      if (rootKey === 'coachView' || rootKey.includes('coach')) {
        metadata.bindings = this.extractBindings(root);
      }

      return metadata;
    } catch (error) {
      return { error: error.message };
    }
  }

  extractBindings(obj, bindings = new Set()) {
    if (typeof obj === 'string') {
      const twMatches = obj.match(/tw\.(local|system|env)\.[\w.]+/g);
      if (twMatches) {
        twMatches.forEach(b => bindings.add(b));
      }
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(v => this.extractBindings(v, bindings));
    }

    return Array.from(bindings);
  }

  generateStatistics() {
    this.statistics.byPatternNamed = {};

    for (const [pattern, count] of Object.entries(this.statistics.byPattern)) {
      const info = this.patternMap[pattern] || { name: 'Other' };
      this.statistics.byPatternNamed[info.name] = {
        pattern,
        count,
        priority: info.priority
      };
    }
  }

  saveReports(outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save JSON report
    const jsonPath = path.join(outputDir, 'twx-analysis.json');
    const report = {
      timestamp: new Date().toISOString(),
      statistics: this.statistics,
      inventory: this.inventory
    };
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report: ${jsonPath}`);

    // Save Markdown report
    const mdPath = path.join(outputDir, 'twx-analysis.md');
    const markdown = this.generateMarkdown(report);
    fs.writeFileSync(mdPath, markdown);
    console.log(`Markdown report: ${mdPath}`);

    // Save conversion roadmap
    const roadmapPath = path.join(outputDir, 'conversion-roadmap.md');
    const roadmap = this.generateConversionRoadmap(report);
    fs.writeFileSync(roadmapPath, roadmap);
    console.log(`Conversion roadmap: ${roadmapPath}`);

    return { jsonPath, mdPath, roadmapPath };
  }

  generateMarkdown(report) {
    let md = `# TWX Analysis Report\n\n`;
    md += `**Generated:** ${report.timestamp}\n\n`;

    md += `## Overview\n\n`;
    md += `- **Total Files:** ${report.statistics.totalFiles}\n`;
    md += `- **Largest File:** ${report.statistics.largestFile?.filename || 'N/A'} (${report.statistics.largestFile?.sizeMB || 0} MB)\n\n`;

    md += `## Files by Pattern\n\n`;
    md += `| Pattern | Type | Count | Priority |\n`;
    md += `|---------|------|-------|----------|\n`;

    for (const [name, info] of Object.entries(report.statistics.byPatternNamed)) {
      md += `| ${info.pattern} | ${name} | ${info.count} | ${info.priority} |\n`;
    }
    md += `\n`;

    md += `## Files by Size\n\n`;
    md += `| Size Category | Count |\n`;
    md += `|---------------|-------|\n`;
    md += `| Small (< 100 KB) | ${report.statistics.bySize.small} |\n`;
    md += `| Medium (100-500 KB) | ${report.statistics.bySize.medium} |\n`;
    md += `| Large (500 KB - 1 MB) | ${report.statistics.bySize.large} |\n`;
    md += `| X-Large (> 1 MB) | ${report.statistics.bySize.xlarge} |\n\n`;

    md += `## Inventory Details\n\n`;

    for (const [type, items] of Object.entries(report.inventory)) {
      if (items.length === 0) continue;

      const firstItem = items[0];
      md += `### ${firstItem.patternName} (Pattern ${firstItem.pattern})\n\n`;
      md += `**Count:** ${items.length} | **Priority:** ${firstItem.priority}\n\n`;

      for (const item of items.slice(0, 10)) {
        md += `#### ${item.metadata.name || item.filename}\n\n`;
        md += `- **File:** \`${item.filename}\`\n`;
        md += `- **Size:** ${item.sizeMB} MB\n`;

        if (item.metadata.id) md += `- **ID:** ${item.metadata.id}\n`;
        if (item.metadata.description) md += `- **Description:** ${item.metadata.description}\n`;
        if (item.metadata.bindings && item.metadata.bindings.length > 0) {
          md += `- **Data Bindings:** ${item.metadata.bindings.length} bindings\n`;
        }
        md += `\n`;
      }

      if (items.length > 10) {
        md += `_... and ${items.length - 10} more ${firstItem.patternName.toLowerCase()}_\n\n`;
      }
    }

    return md;
  }

  generateConversionRoadmap(report) {
    let md = `# TWX to React/Node.js Conversion Roadmap\n\n`;
    md += `**Generated:** ${report.timestamp}\n\n`;

    md += `## Recommended Conversion Order\n\n`;

    const conversionOrder = [
      {
        priority: 1,
        type: 'toolkits',
        reason: 'Extract shared libraries first for reuse across the application'
      },
      {
        priority: 2,
        type: 'business-objects',
        reason: 'Generate TypeScript types early to support type-safe development'
      },
      {
        priority: 3,
        type: 'coach-views',
        reason: 'Convert UI components - core building blocks for user interface'
      },
      {
        priority: 4,
        type: 'service-flows',
        reason: 'Implement backend APIs that coach views will call'
      },
      {
        priority: 5,
        type: 'human-services',
        reason: 'Build multi-step workflows using converted coach views and services'
      },
      {
        priority: 6,
        type: 'processes',
        reason: 'Integrate complex BPD processes last using bpmn-js orchestration'
      }
    ];

    for (const step of conversionOrder) {
      const items = report.inventory[step.type] || [];
      const patternInfo = Object.values(this.patternMap).find(p => p.type === step.type);

      md += `### Step ${step.priority}: Convert ${patternInfo?.name || step.type}\n\n`;
      md += `**Why:** ${step.reason}\n\n`;
      md += `**Files to convert:** ${items.length}\n\n`;

      if (items.length > 0) {
        md += `**Commands:**\n\`\`\`bash\n`;
        md += `# Analyze files\n`;
        md += `node scripts/analyze-bpmn.js extracted/${step.type}/*.xml\n\n`;

        if (step.type === 'coach-views') {
          md += `# Generate React components\n`;
          md += `node scripts/generate-react-components.js extracted/${step.type} output/frontend\n`;
        } else if (step.type === 'service-flows') {
          md += `# Generate Node.js services\n`;
          md += `node scripts/generate-node-services.js extracted/${step.type} output/backend\n`;
        } else if (step.type === 'business-objects') {
          md += `# Generate TypeScript types\n`;
          md += `node scripts/generate-types.js extracted/${step.type} output/shared/types\n`;
        }

        md += `\`\`\`\n\n`;

        md += `**Files:**\n`;
        items.slice(0, 5).forEach((item, idx) => {
          md += `${idx + 1}. ${item.metadata.name || item.filename} (${item.sizeMB} MB)\n`;
        });

        if (items.length > 5) {
          md += `   _... and ${items.length - 5} more_\n`;
        }
        md += `\n`;
      }
    }

    md += `## Estimated Timeline\n\n`;
    md += `Based on file counts and complexity:\n\n`;

    let totalEstimate = 0;
    for (const step of conversionOrder) {
      const items = report.inventory[step.type] || [];
      const hoursPerFile = step.type === 'processes' ? 4 : step.type === 'coach-views' ? 2 : 1;
      const estimate = items.length * hoursPerFile;
      totalEstimate += estimate;

      const patternInfo = Object.values(this.patternMap).find(p => p.type === step.type);
      md += `- **${patternInfo?.name}:** ~${estimate} hours (${items.length} files × ${hoursPerFile}h/file)\n`;
    }

    md += `\n**Total Estimated:** ~${totalEstimate} hours (~${Math.ceil(totalEstimate / 8)} working days)\n\n`;

    md += `_Note: Estimates assume familiarity with both IBM BPM and React/Node.js. Add 50% buffer for testing and refinement._\n`;

    return md;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node analyze-twx-directory.js <extracted-twx-directory>');
    console.error('');
    console.error('Example:');
    console.error('  node analyze-twx-directory.js ./extracted/MyApp/objects');
    console.error('');
    console.error('Note: This script analyzes an already-extracted TWX directory.');
    console.error('      If you have a .twx file, use extract-twx.js first.');
    process.exit(1);
  }

  const extractedDir = args[0];

  if (!fs.existsSync(extractedDir)) {
    console.error(`Error: Directory not found: ${extractedDir}`);
    process.exit(1);
  }

  const analyzer = new TWXDirectoryAnalyzer();

  (async () => {
    try {
      await analyzer.analyze(extractedDir);

      const outputDir = path.join(path.dirname(extractedDir), 'analysis');
      const reports = analyzer.saveReports(outputDir);

      console.log('\n=== ANALYSIS COMPLETE ===');
      console.log(`Total files analyzed: ${analyzer.statistics.totalFiles}`);
      console.log(`\nReports saved to: ${outputDir}`);
      console.log('\nNext steps:');
      console.log('1. Review conversion-roadmap.md for recommended conversion order');
      console.log('2. Start with toolkits and business objects');
      console.log('3. Convert coach views to React components');
      console.log('4. Generate Node.js services from service flows');
    } catch (error) {
      console.error('Error analyzing TWX directory:', error);
      process.exit(1);
    }
  })();
}

module.exports = TWXDirectoryAnalyzer;
