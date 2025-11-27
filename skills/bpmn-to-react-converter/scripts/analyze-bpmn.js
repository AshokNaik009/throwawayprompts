#!/usr/bin/env node

/**
 * BPMN XML Analyzer
 *
 * Analyzes large BPMN XML files (345KB+) using streaming SAX parser
 * to avoid memory issues. Generates inventory of components, nesting
 * hierarchy, and complexity metrics.
 *
 * Usage: node analyze-bpmn.js <path-to-bpmn-file.xml>
 */

const fs = require('fs');
const path = require('path');
const sax = require('sax');

class BPMNAnalyzer {
  constructor() {
    this.coachViews = [];
    this.humanServices = [];
    this.bpdProcesses = [];
    this.serviceTasks = [];
    this.dataBindings = new Set();
    this.nestingDepth = 0;
    this.maxNestingDepth = 0;
    this.currentPath = [];
    this.elementCounts = {};
  }

  analyze(xmlFilePath) {
    return new Promise((resolve, reject) => {
      const saxStream = sax.createStream(true, {
        trim: true,
        normalize: true,
        lowercase: false,
        xmlns: false,
        position: true
      });

      let currentElement = null;
      let currentAttributes = null;

      saxStream.on('opentag', (node) => {
        this.nestingDepth++;
        this.maxNestingDepth = Math.max(this.maxNestingDepth, this.nestingDepth);
        this.currentPath.push(node.name);

        // Count element types
        this.elementCounts[node.name] = (this.elementCounts[node.name] || 0) + 1;

        // Extract Coach Views
        if (node.name === 'coachView' || node.attributes.type?.includes('coach')) {
          this.coachViews.push({
            id: node.attributes.id,
            type: node.attributes.type,
            name: node.attributes.name,
            nestingLevel: this.nestingDepth,
            path: [...this.currentPath],
            attributes: { ...node.attributes }
          });
        }

        // Extract Human Services
        if (node.name === 'humanService' || node.name === 'service') {
          this.humanServices.push({
            id: node.attributes.id,
            name: node.attributes.name,
            nestingLevel: this.nestingDepth,
            path: [...this.currentPath],
            attributes: { ...node.attributes }
          });
        }

        // Extract BPD Processes
        if (node.name === 'process' || node.name === 'bpdProcess') {
          this.bpdProcesses.push({
            id: node.attributes.id,
            name: node.attributes.name,
            isExecutable: node.attributes.isExecutable,
            nestingLevel: this.nestingDepth,
            path: [...this.currentPath],
            attributes: { ...node.attributes }
          });
        }

        // Extract Service Tasks
        if (node.name === 'serviceTask' || node.name === 'scriptTask') {
          this.serviceTasks.push({
            id: node.attributes.id,
            name: node.attributes.name,
            implementation: node.attributes.implementation,
            nestingLevel: this.nestingDepth,
            path: [...this.currentPath],
            attributes: { ...node.attributes }
          });
        }

        // Extract Data Bindings (tw.local.*, tw.*, #{...})
        for (const [key, value] of Object.entries(node.attributes)) {
          if (typeof value === 'string') {
            // Find tw.local.* bindings
            const twMatches = value.match(/tw\.(local|system|env)\.\w+(\.\w+)*/g);
            if (twMatches) {
              twMatches.forEach(binding => this.dataBindings.add(binding));
            }

            // Find #{...} bindings
            const exprMatches = value.match(/#\{[^}]+\}/g);
            if (exprMatches) {
              exprMatches.forEach(binding => this.dataBindings.add(binding));
            }
          }
        }

        currentElement = node.name;
        currentAttributes = node.attributes;
      });

      saxStream.on('closetag', (tagName) => {
        this.nestingDepth--;
        this.currentPath.pop();
      });

      saxStream.on('error', (error) => {
        console.error('SAX Parser Error:', error);
        reject(error);
      });

      saxStream.on('end', () => {
        resolve(this.generateReport());
      });

      // Stream the file to avoid loading entire 345KB+ file into memory
      const fileStream = fs.createReadStream(xmlFilePath, { encoding: 'utf8' });
      fileStream.pipe(saxStream);
    });
  }

  generateReport() {
    const report = {
      summary: {
        totalCoachViews: this.coachViews.length,
        totalHumanServices: this.humanServices.length,
        totalBPDProcesses: this.bpdProcesses.length,
        totalServiceTasks: this.serviceTasks.length,
        uniqueDataBindings: this.dataBindings.size,
        maxNestingDepth: this.maxNestingDepth,
        elementTypeCounts: this.elementCounts
      },
      coachViews: this.coachViews,
      humanServices: this.humanServices,
      bpdProcesses: this.bpdProcesses,
      serviceTasks: this.serviceTasks,
      dataBindings: Array.from(this.dataBindings).sort(),
      complexity: this.calculateComplexity()
    };

    return report;
  }

  calculateComplexity() {
    return {
      score: this.calculateComplexityScore(),
      factors: {
        componentCount: this.coachViews.length + this.humanServices.length + this.bpdProcesses.length,
        nestingDepth: this.maxNestingDepth,
        dataBindingComplexity: this.dataBindings.size,
        serviceTaskCount: this.serviceTasks.length
      },
      recommendation: this.getComplexityRecommendation()
    };
  }

  calculateComplexityScore() {
    const componentScore = (this.coachViews.length + this.humanServices.length) * 2;
    const nestingScore = this.maxNestingDepth * 5;
    const bindingScore = this.dataBindings.size * 1;
    const serviceScore = this.serviceTasks.length * 3;

    return componentScore + nestingScore + bindingScore + serviceScore;
  }

  getComplexityRecommendation() {
    const score = this.calculateComplexityScore();

    if (score < 50) {
      return 'LOW: Can be converted in a single pass';
    } else if (score < 150) {
      return 'MEDIUM: Recommend component-by-component conversion';
    } else if (score < 300) {
      return 'HIGH: Requires chunked processing and template generation';
    } else {
      return 'VERY HIGH: Requires incremental migration with multiple templates';
    }
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node analyze-bpmn.js <path-to-bpmn-file.xml>');
    process.exit(1);
  }

  const xmlFilePath = args[0];

  if (!fs.existsSync(xmlFilePath)) {
    console.error(`Error: File not found: ${xmlFilePath}`);
    process.exit(1);
  }

  const analyzer = new BPMNAnalyzer();

  console.log(`Analyzing BPMN file: ${xmlFilePath}`);
  console.log('This may take a moment for large files...\n');

  analyzer.analyze(xmlFilePath)
    .then((report) => {
      // Print summary to console
      console.log('=== BPMN ANALYSIS REPORT ===\n');
      console.log('SUMMARY:');
      console.log(`  Coach Views: ${report.summary.totalCoachViews}`);
      console.log(`  Human Services: ${report.summary.totalHumanServices}`);
      console.log(`  BPD Processes: ${report.summary.totalBPDProcesses}`);
      console.log(`  Service Tasks: ${report.summary.totalServiceTasks}`);
      console.log(`  Data Bindings: ${report.summary.uniqueDataBindings}`);
      console.log(`  Max Nesting Depth: ${report.summary.maxNestingDepth}`);
      console.log('');
      console.log('COMPLEXITY:');
      console.log(`  Score: ${report.complexity.score}`);
      console.log(`  Recommendation: ${report.complexity.recommendation}`);
      console.log('');

      // Save detailed report to JSON
      const outputPath = xmlFilePath.replace(/\.(xml|bpmn)$/i, '-analysis.json');
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`Detailed report saved to: ${outputPath}`);

      // Generate markdown report
      const mdReport = generateMarkdownReport(report, xmlFilePath);
      const mdOutputPath = xmlFilePath.replace(/\.(xml|bpmn)$/i, '-analysis.md');
      fs.writeFileSync(mdOutputPath, mdReport);
      console.log(`Markdown report saved to: ${mdOutputPath}`);
    })
    .catch((error) => {
      console.error('Error analyzing BPMN file:', error);
      process.exit(1);
    });
}

function generateMarkdownReport(report, filePath) {
  const fileName = path.basename(filePath);

  return `# BPMN Analysis Report: ${fileName}

**Generated:** ${new Date().toISOString()}

## Summary

| Metric | Count |
|--------|-------|
| Coach Views | ${report.summary.totalCoachViews} |
| Human Services | ${report.summary.totalHumanServices} |
| BPD Processes | ${report.summary.totalBPDProcesses} |
| Service Tasks | ${report.summary.totalServiceTasks} |
| Data Bindings | ${report.summary.uniqueDataBindings} |
| Max Nesting Depth | ${report.summary.maxNestingDepth} |

## Complexity Analysis

**Complexity Score:** ${report.complexity.score}

**Recommendation:** ${report.complexity.recommendation}

### Complexity Factors
- Component Count: ${report.complexity.factors.componentCount}
- Nesting Depth: ${report.complexity.factors.nestingDepth}
- Data Binding Complexity: ${report.complexity.factors.dataBindingComplexity}
- Service Task Count: ${report.complexity.factors.serviceTaskCount}

## Coach Views

${report.coachViews.length > 0 ?
  report.coachViews.slice(0, 10).map((cv, idx) =>
    `${idx + 1}. **${cv.name || cv.id}** (Type: ${cv.type}, Nesting: ${cv.nestingLevel})`
  ).join('\n') +
  (report.coachViews.length > 10 ? `\n\n... and ${report.coachViews.length - 10} more` : '')
  : '_No coach views found_'}

## Human Services

${report.humanServices.length > 0 ?
  report.humanServices.slice(0, 10).map((hs, idx) =>
    `${idx + 1}. **${hs.name || hs.id}** (Nesting: ${hs.nestingLevel})`
  ).join('\n') +
  (report.humanServices.length > 10 ? `\n\n... and ${report.humanServices.length - 10} more` : '')
  : '_No human services found_'}

## BPD Processes

${report.bpdProcesses.length > 0 ?
  report.bpdProcesses.map((bp, idx) =>
    `${idx + 1}. **${bp.name || bp.id}** (Executable: ${bp.isExecutable || 'N/A'})`
  ).join('\n')
  : '_No BPD processes found_'}

## Service Tasks

${report.serviceTasks.length > 0 ?
  report.serviceTasks.slice(0, 10).map((st, idx) =>
    `${idx + 1}. **${st.name || st.id}** (Implementation: ${st.implementation || 'N/A'})`
  ).join('\n') +
  (report.serviceTasks.length > 10 ? `\n\n... and ${report.serviceTasks.length - 10} more` : '')
  : '_No service tasks found_'}

## Data Bindings (Sample)

${report.dataBindings.length > 0 ?
  '```\n' + report.dataBindings.slice(0, 20).join('\n') + '\n```' +
  (report.dataBindings.length > 20 ? `\n\n... and ${report.dataBindings.length - 20} more` : '')
  : '_No data bindings found_'}

## Element Type Distribution

| Element Type | Count |
|--------------|-------|
${Object.entries(report.summary.elementTypeCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([type, count]) => `| ${type} | ${count} |`)
  .join('\n')}

## Next Steps

1. Review the complexity score and recommendation
2. Identify components to convert first (start with lowest nesting depth)
3. Use the data bindings list to plan state management
4. Extract templates for reusable patterns
5. Begin incremental conversion

---
*Full details available in the JSON report*
`;
}

module.exports = BPMNAnalyzer;
