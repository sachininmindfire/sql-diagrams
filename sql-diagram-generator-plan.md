# SQL Diagram Generator - Technical Plan

## Overview
A lightweight web application that converts SQL scripts into visual database diagrams, providing an accessible alternative to Visual Studio and SQL Power Tools for database visualization.

## Technology Stack

### Frontend
- **HTML5**
  - Semantic markup
  - File API for SQL file uploads
  - Canvas for diagram rendering
- **CSS3**
  - CSS Grid and Flexbox for layouts
  - CSS Custom Properties for theming
  - Media queries for responsiveness
- **Vanilla JavaScript**
  - ES6+ features
  - Modules for code organization
  - Web Workers for heavy processing

### Visualization
- **mermaid-js**
  - Lightweight diagram generation
  - Entity-relationship diagram support
  - Easy integration with vanilla JavaScript

### File Structure
```
sql-diagram-generator/
├── index.html
├── css/
│   ├── styles.css
│   └── diagram.css
├── js/
│   ├── main.js
│   ├── parser/
│   │   ├── sqlParser.js
│   │   └── relationshipDetector.js
│   ├── diagram/
│   │   ├── diagramGenerator.js
│   │   └── layoutManager.js
│   └── utils/
│       ├── fileHandler.js
│       └── errorHandler.js
└── assets/
    └── icons/
```

## Core Features

### Phase 1: MVP
1. **SQL Input**
   - Clean, minimal text area for SQL input
   - Drag-and-drop SQL file upload
   - Basic syntax highlighting using Prism.js

2. **Parser Engine**
   - Custom SQL parser for CREATE TABLE statements
   - Table and column extraction
   - Primary and foreign key detection
   - Relationship mapping

3. **Diagram Generation**
   - Entity-relationship diagram rendering
   - Table nodes with column lists
   - Relationship lines with cardinality
   - Auto-layout for readability

4. **Basic UI**
   - Single-page design
   - Split view (input/output)
   - Error display
   - Image download button

### Phase 2: Enhanced Features
1. **Advanced Parsing**
   - Multiple SQL dialect support
   - Complex script handling
   - Index and constraint parsing
   - View support

2. **Interactive Diagrams**
   - Canvas-based interaction
   - Zoom and pan controls
   - Draggable table nodes
   - Relationship highlighting

3. **Export Options**
   - PNG/SVG export
   - Mermaid markdown export
   - Schema JSON export
   - Simple documentation

4. **UI Improvements**
   - Dark/light themes
   - Mobile-responsive design
   - Local diagram saving
   - Keyboard shortcuts

## Technical Implementation

### Core Components

1. **SQL Parser Module**
```javascript
// sqlParser.js
export class SQLParser {
  constructor() {
    this.tables = new Map();
    this.relationships = new Map();
  }

  parse(sqlScript) {
    // Tokenize SQL
    // Extract CREATE TABLE statements
    // Parse columns and constraints
    // Return structured data
  }
}
```

2. **Diagram Generator**
```javascript
// diagramGenerator.js
export class DiagramGenerator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  generateDiagram(tables, relationships) {
    // Calculate layout
    // Draw tables
    // Draw relationships
    // Add interactivity
  }
}
```

3. **File Handler**
```javascript
// fileHandler.js
export class FileHandler {
  handleFileUpload(file) {
    // Read SQL file
    // Validate content
    // Return SQL script
  }

  exportDiagram(format) {
    // Generate export file
    // Trigger download
  }
}
```

### Implementation Phases

### Phase 1 (MVP) - 2 weeks
1. Basic project setup (1 day)
2. SQL parser implementation (3 days)
3. Diagram generation with mermaid-js (3 days)
4. UI implementation (3 days)
5. Testing and fixes (4 days)

### Phase 2 (Enhanced) - 3 weeks
1. Advanced SQL parsing (1 week)
2. Interactive features (1 week)
3. Export options (3 days)
4. UI improvements (4 days)

### Phase 3 (Polish) - 1 week
1. Performance optimization
2. Browser testing
3. Documentation
4. Final bug fixes

## Next Steps
1. Create basic HTML structure
2. Implement SQL file upload
3. Build parser module
4. Add diagram generation
5. Test with sample SQL scripts

The focus is on creating a lightweight, dependency-minimal application that can run entirely in the browser without requiring server-side processing. This approach ensures easy deployment and usage while maintaining good performance.