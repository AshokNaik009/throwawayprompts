# Phase 1: Unpack and Catalog TWX Export

## Objective
Extract the .twx file and create a structured inventory of all XML artifacts.

## Instructions

1. **Unpack the TWX file**
   The .twx file is a ZIP archive. Extract it to a working directory:
   ```bash
   mkdir -p ./extraction/raw
   unzip "$TWX_FILE" -d ./extraction/raw
   ```

2. **Catalog all XML files by type**
   Scan the extracted directory and categorize files:
   - Coach Views (look for `<coachView>` or `<teamworks.CoachView>` root elements)
   - Human Services (look for `<humanService>` or service flow elements)
   - BPD Processes (look for `<bpd>` or process definition elements)
   - Integration Services
   - Data Types / Business Objects

3. **Create inventory JSON**
   Generate `./extraction/inventory.json`:
   ```json
   {
     "coachViews": [
       {
         "id": "CV_CustomerForm",
         "name": "Customer Form",
         "filePath": "./raw/path/to/file.xml",
         "nestedViews": ["CV_AddressSection", "CV_ContactInfo"],
         "bindings": ["tw.local.customer", "tw.local.address"],
         "sizeKB": 145
       }
     ],
     "humanServices": [...],
     "processes": [...],
     "dataTypes": [...]
   }
   ```

4. **Identify entry points**
   Find the main Human Service or Coach View that serves as the entry point (usually referenced by a BPD human task).

5. **Generate dependency graph**
   Create `./extraction/dependencies.json` showing which Coach Views reference others.

## Expected Output
- `./extraction/raw/` - Unpacked XML files
- `./extraction/inventory.json` - Cataloged artifacts
- `./extraction/dependencies.json` - Reference graph
- `./extraction/summary.md` - Human-readable summary

## Chunking Strategy for Large Files
For XML files > 100KB:
1. First extract just the metadata (id, name, type)
2. Then process sections individually:
   - Layout/UI section
   - Bindings section
   - Validation section
   - Event handlers section

## Variables
- `$TWX_FILE` - Path to the .twx file to process
