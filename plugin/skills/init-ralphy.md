# /init-ralphy

Initialize Ralphy configuration for the current project.

---
description: Initialize Ralphy project configuration with auto-detected settings
user-invocable: true
argument-hint: [--force]
---

## Overview

This skill initializes the `.ralphy/config.yaml` configuration file for your project. It auto-detects the project language, framework, and common commands.

## Instructions

1. **Check for Existing Config**
   - Look for `.ralphy/config.yaml` in the current directory
   - If it exists and `--force` was NOT passed, inform the user and ask if they want to overwrite
   - If `--force` was passed, proceed with overwriting

2. **Detect Project Settings**

   Analyze the project to determine:

   **Language Detection** (check in order):
   - `package.json` exists → TypeScript or JavaScript (check for `typescript` in devDependencies)
   - `pyproject.toml` or `requirements.txt` → Python
   - `Cargo.toml` → Rust
   - `go.mod` → Go
   - `pom.xml` or `build.gradle` → Java
   - `Gemfile` → Ruby

   **Framework Detection**:
   - Check `package.json` dependencies for: React, Next.js, Vue, Angular, Express, Fastify, NestJS
   - Check Python files for: FastAPI, Flask, Django
   - Check for common framework config files

   **Project Name**:
   - Use `name` from `package.json` or `pyproject.toml`
   - Or use the current directory name

   **Commands Detection**:
   - `test`: Look for `npm test`, `pytest`, `cargo test`, `go test ./...`, etc.
   - `lint`: Look for `npm run lint`, `eslint`, `ruff`, `cargo clippy`, etc.
   - `build`: Look for `npm run build`, `cargo build`, `go build`, etc.

3. **Create Directory and Config**

   Create `.ralphy` directory if it doesn't exist.

   Write `.ralphy/config.yaml` with detected settings:

   ```yaml
   # Ralphy Configuration
   # Auto-generated - customize as needed

   project:
     name: "<detected-name>"
     language: "<detected-language>"
     framework: "<detected-framework>"
     description: ""

   commands:
     test: "<detected-test-command>"
     lint: "<detected-lint-command>"
     build: "<detected-build-command>"

   rules:
     - "Follow existing code patterns and conventions"
     - "Write tests for new functionality"
     - "Keep changes focused and minimal"

   boundaries:
     never_touch:
       - "node_modules"
       - ".git"
       - ".env"
       - ".env.local"
       - "*.lock"

   capabilities:
     browser: false  # Set to true to enable Playwright MCP for browser testing
   ```

4. **Add to .gitignore**
   - Check if `.ralphy/progress.txt` should be added to `.gitignore`
   - The config file itself should be committed (project settings)
   - Progress files are temporary and should be ignored

5. **Report Results**

   Display summary:
   ```
   Ralphy initialized!

   Project: <name>
   Language: <language>
   Framework: <framework>

   Config: .ralphy/config.yaml

   Next steps:
   1. Review and customize .ralphy/config.yaml
   2. Create a PRD.md file with your tasks
   3. Run /parse-prd PRD.md to see your tasks
   4. Run /run-tasks PRD.md to execute them
   ```

## Example PRD Format

After initialization, suggest creating a PRD.md with this format:

```markdown
# Project Requirements Document

## Tasks

- [ ] Implement user authentication
- [ ] Add password reset functionality
- [ ] Create user profile page
- [ ] Add email notifications
```

Or YAML format for parallel execution groups:

```yaml
tasks:
  - title: "Set up database schema"
    parallel_group: 1
  - title: "Create API endpoints"
    parallel_group: 1
  - title: "Build frontend components"
    parallel_group: 2
  - title: "Add integration tests"
    parallel_group: 3
```

## Config Schema Reference

```yaml
project:
  name: string        # Project name
  language: string    # Primary language (TypeScript, Python, Rust, Go, etc.)
  framework: string   # Framework if applicable (React, FastAPI, etc.)
  description: string # Brief project description

commands:
  test: string   # Command to run tests (e.g., "npm test")
  lint: string   # Command to run linter (e.g., "npm run lint")
  build: string  # Command to build project (e.g., "npm run build")

rules:           # List of rules the agent MUST follow
  - string

boundaries:
  never_touch:   # Files/directories the agent must NOT modify
    - string

capabilities:
  browser: boolean  # Enable Playwright MCP for browser testing
```
