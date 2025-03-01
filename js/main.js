// Initialize Mermaid with default configuration
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    er: {
        diagramPadding: 20,
        layoutDirection: 'TB',
        minEntityWidth: 100,
        minEntityHeight: 75,
        entityPadding: 15,
        stroke: 'gray',
        fill: 'white',
        fontSize: 12
    }
});

// DOM Elements
const sqlInput = document.getElementById('sqlInput');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const themeSelect = document.getElementById('themeSelect');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = errorContainer.querySelector('.error-message');
const closeErrorBtn = errorContainer.querySelector('.close-btn');
const diagramContainer = document.getElementById('mermaidDiagram');

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
generateBtn.addEventListener('click', generateDiagram);
downloadBtn.addEventListener('click', downloadDiagram);
themeSelect.addEventListener('change', handleThemeChange);
closeErrorBtn.addEventListener('click', hideError);

// File Upload Handler
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.sql')) {
        showError('Please upload a .sql file');
        return;
    }

    try {
        const text = await file.text();
        sqlInput.value = text;
        fileInput.value = ''; // Reset file input
    } catch (error) {
        showError('Error reading file: ' + error.message);
    }
}

// SQL Parser
function parseSQLScript(sql) {
    const tables = new Map();
    const relationships = new Set();

    // Normalize line endings and clean up whitespace
    sql = sql.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split the script into individual statements
    const statements = sql.split(/\bGO\b/).join('\n').split(';');
    
    // First pass: Process CREATE TABLE statements
    for (const statement of statements) {
        const trimmedStmt = statement.trim();
        if (!trimmedStmt) continue;

        if (/CREATE\s+TABLE/i.test(trimmedStmt)) {
            processCreateTable(trimmedStmt, tables);
        }
    }

    // Second pass: Process ALTER TABLE statements for relationships
    for (const statement of statements) {
        const trimmedStmt = statement.trim();
        if (!trimmedStmt) continue;

        if (/ALTER\s+TABLE/i.test(trimmedStmt)) {
            processAlterTable(trimmedStmt, tables);
        }
    }

    return { tables, relationships };
}

function processCreateTable(statement, tables) {
    // Extract table name and columns part
    const createTableMatch = statement.match(/CREATE\s+TABLE\s+(?:\[?(?:dbo|TechopediaModelStoreContainer)\]?\.)?\[?([^\]\s]+)\]?\s*\(([\s\S]*)/i);
    if (!createTableMatch) return;

    const [, tableName, columnsPart] = createTableMatch;
    if (!columnsPart) return;

    const columns = [];
    const foreignKeys = [];

    // Split column definitions and constraints
    const columnDefs = splitColumnDefinitions(columnsPart);
    
    for (const columnDef of columnDefs) {
        // Check for inline foreign key constraint
        const inlineFkMatch = columnDef.match(/FOREIGN\s+KEY\s*(?:\([^)]+\))?\s*REFERENCES\s+(\w+)\s*\(([^)]+)\)/i);
        if (inlineFkMatch) {
            // Extract local column name from the definition or previous context
            const localColMatch = columnDef.match(/\(([^)]+)\)/);
            if (localColMatch) {
                const [, localCol] = localColMatch;
                const [, foreignTable, foreignCol] = inlineFkMatch;
                foreignKeys.push({
                    from: localCol.trim(),
                    to: foreignTable.trim(),
                    foreignColumn: foreignCol.trim()
                });
            }
            continue;
        }

        // Check for standalone foreign key constraint
        if (/^\s*(?:CONSTRAINT\s+\[?\w+\]?\s+)?FOREIGN\s+KEY/i.test(columnDef)) {
            const fkMatch = columnDef.match(/FOREIGN\s+KEY\s*\(\[?([^\]]+)\]?\)\s*REFERENCES\s+(?:\[?(?:dbo|TechopediaModelStoreContainer)\]?\.)?\[?([^\]]+)\]?\s*\(\[?([^\]]+)\]?\)/i);
            if (fkMatch) {
                const [, localCol, foreignTable, foreignCol] = fkMatch;
                foreignKeys.push({
                    from: localCol.trim(),
                    to: foreignTable.trim(),
                    foreignColumn: foreignCol.trim()
                });
            }
            continue;
        }

        // Match regular column definitions
        const colMatch = columnDef.match(/^\s*\[?([^\]]+)\]?\s+([\w\s\(\),]+)(?:\s+IDENTITY\s*\(\d+,\d+\))?(?:\s+NULL|\s+NOT\s+NULL)?(?:\s+PRIMARY\s+KEY)?/i);
        if (colMatch) {
            const [, name, type] = colMatch;
            const isPrimary = /PRIMARY\s+KEY/i.test(columnDef) || /IDENTITY/i.test(columnDef);
            columns.push({
                name: name,
                type: simplifyType(type.trim()),
                isPrimary: isPrimary
            });
        }
    }

    if (columns.length > 0) {
        tables.set(tableName, { columns, foreignKeys });
    }
}

function processAlterTable(statement, tables) {
    // Match ALTER TABLE statement
    const alterMatch = statement.match(/ALTER\s+TABLE\s+(?:\[?(?:dbo|TechopediaModelStoreContainer)\]?\.)?\[?([^\]]+)\]?\s+ADD\s+CONSTRAINT\s+\[?[^\]]+\]?\s+FOREIGN\s+KEY\s*\(\[?([^\]]+)\]?\)\s+REFERENCES\s+(?:\[?(?:dbo|TechopediaModelStoreContainer)\]?\.)?\[?([^\]]+)\]?\s*\(\[?([^\]]+)\]?\)/i);
    
    if (alterMatch) {
        const [, tableName, localColumn, foreignTable, foreignColumn] = alterMatch;
        
        // Get or create the table entry
        const table = tables.get(tableName) || { columns: [], foreignKeys: [] };
        
        // Add the foreign key relationship
        table.foreignKeys.push({
            from: localColumn.trim(),
            to: foreignTable.trim(),
            foreignColumn: foreignColumn.trim()
        });
        
        // Update the table in the map
        tables.set(tableName, table);
    }
}

// Helper function to split column definitions while respecting nested parentheses
function splitColumnDefinitions(columnsPart) {
    const defs = [];
    let current = '';
    let parenCount = 0;
    let inQuote = false;
    let inBracket = false;
    
    for (const char of columnsPart) {
        // Handle nested structures
        if (char === '[' && !inQuote) inBracket = true;
        else if (char === ']' && !inQuote) inBracket = false;
        else if (char === '(' && !inQuote && !inBracket) parenCount++;
        else if (char === ')' && !inQuote && !inBracket) {
            parenCount--;
            // If this closes the CREATE TABLE statement, break
            if (parenCount < 0) break;
        }
        else if (char === '"' || char === "'") inQuote = !inQuote;
        
        // Split on comma only if we're not inside any nested structure
        if (char === ',' && parenCount === 0 && !inQuote && !inBracket) {
            defs.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    if (current.trim()) defs.push(current.trim());
    
    return defs;
}

// Helper function to simplify SQL Server types
function simplifyType(type) {
    // Remove precision/scale for numeric types
    type = type.replace(/\(\d+(?:,\d+)?\)/, '');
    
    // Map SQL Server types to simpler versions
    const typeMap = {
        'nvarchar': 'string',
        'varchar': 'string',
        'char': 'string',
        'nchar': 'string',
        'text': 'string',
        'ntext': 'string',
        'uniqueidentifier': 'guid',
        'datetime': 'date',
        'datetime2': 'date',
        'date': 'date',
        'time': 'time',
        'bit': 'bool',
        'int': 'int',
        'bigint': 'long',
        'smallint': 'int',
        'tinyint': 'int',
        'decimal': 'decimal',
        'numeric': 'decimal',
        'float': 'float',
        'real': 'float',
        'varbinary': 'binary',
        'binary': 'binary',
        'image': 'binary'
    };

    // Get the base type without any modifiers
    const baseType = type.split(' ')[0].toLowerCase();
    return typeMap[baseType] || baseType;
}

// Diagram Generation
function generateMermaidER(tables) {
    let mermaidCode = 'erDiagram\n';

    // Add entities with their attributes
    for (const [tableName, table] of tables) {
        mermaidCode += `    ${tableName} {\n`;
        
        // Add columns
        table.columns.forEach(col => {
            mermaidCode += `        ${col.type} ${col.name}${col.isPrimary ? ' PK' : ''}\n`;
        });
        mermaidCode += '    }\n';
    }

    // Add relationships
    const addedRelations = new Set();
    for (const [tableName, table] of tables) {
        for (const fk of table.foreignKeys) {
            const relationKey = `${tableName}-${fk.to}`;
            if (!addedRelations.has(relationKey)) {
                mermaidCode += `    ${tableName} }|--|| ${fk.to} : "references"\n`;
                addedRelations.add(relationKey);
            }
        }
    }

    return mermaidCode;
}

// Generate Diagram
async function generateDiagram() {
    try {
        const sql = sqlInput.value.trim();
        if (!sql) {
            showError('Please enter SQL CREATE TABLE statements');
            return;
        }

        const { tables, relationships } = parseSQLScript(sql);
        if (tables.size === 0) {
            showError('No valid CREATE TABLE statements found');
            return;
        }

        // Clear previous diagram
        diagramContainer.innerHTML = '';
        
        // Create a new div for the diagram
        const newDiagram = document.createElement('div');
        newDiagram.className = 'mermaid';
        const mermaidCode = generateMermaidER(tables);
        newDiagram.textContent = mermaidCode;
        diagramContainer.appendChild(newDiagram);

        // Render the diagram
        await mermaid.run({
            querySelector: '.mermaid'
        });
        
        downloadBtn.disabled = false;
    } catch (error) {
        showError('Error generating diagram: ' + error.message);
        console.error('Diagram generation error:', error);
    }
}

// Download Diagram
async function downloadDiagram() {
    try {
        const svg = diagramContainer.querySelector('svg');
        if (!svg) {
            showError('No diagram to download');
            return;
        }

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'database-diagram.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        showError('Error downloading diagram: ' + error.message);
    }
}

// Theme Handling
function handleThemeChange(event) {
    const theme = event.target.value;
    document.body.setAttribute('data-theme', theme);
    mermaid.initialize({
        theme: theme === 'dark' ? 'dark' : 'default',
        startOnLoad: false
    });
    if (downloadBtn.disabled === false) {
        generateDiagram();
    }
}

// Error Handling
function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
    setTimeout(hideError, 5000);
}

function hideError() {
    errorContainer.classList.add('hidden');
}

// Initialize theme
handleThemeChange({ target: { value: 'light' } });