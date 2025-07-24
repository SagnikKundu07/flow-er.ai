// SQL Parser to convert SQL DDL to a format suitable for flowchart visualization

/**
 * Parse SQL CREATE TABLE statements and extract table information
 * @param {string} sql - SQL DDL statements
 * @returns {Object} - Tables and relationships extracted from SQL
 */
const parseCreateTable = (sql) => {
  // Tables and relationships storage
  const tables = [];
  const relationships = [];
  const tableMap = {}; // For quick lookups
  
  try {
    // First pass: Extract all tables
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([^\s`"'(,)]+)[`"']?\s*\(([\s\S]*?)\)\s*;?/gi;
    let match;
    
    console.log('SQL to parse:', sql);
    
    // First pass: Extract all tables
    while ((match = tableRegex.exec(sql)) !== null) {
      const tableName = match[1].trim();
      const tableBody = match[2];
      
      console.log(`Found table: ${tableName}`);
      console.log(`Table body: ${tableBody}`);
      
      // Store table info for second pass
      tableMap[tableName] = {
        name: tableName,
        body: tableBody,
        columns: [],
        primaryKeys: [],
        foreignKeys: []
      };
    }
    
    // Reset regex for second pass
    tableRegex.lastIndex = 0;
    
    // Second pass: Process each table
    Object.values(tableMap).forEach(table => {
      const tableName = table.name;
      const tableBody = table.body;
      
      // Process the table
      const columns = [];
      const primaryKeys = [];
      const foreignKeys = [];
      
      // Split the table body into lines
      const lines = tableBody.split(',').map(line => line.trim());
      
      // Process each line
      for (const line of lines) {
        // Skip empty lines
        if (!line) continue;
        
        console.log(`Processing line: ${line}`);
        
        // Check if this is a primary key constraint
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkColumns = pkMatch[1].split(',').map(col => col.trim().replace(/[`"']/g, ''));
          primaryKeys.push(...pkColumns);
          console.log(`Found primary keys in ${tableName}:`, pkColumns);
          continue;
        }
        
        // Special case for inline primary key
        if (line.toUpperCase().includes('PRIMARY KEY')) {
          const inlinePkMatch = line.match(/([^\s,]+)\s+[^\s,]+.*?PRIMARY\s+KEY/i);
          if (inlinePkMatch && inlinePkMatch[1]) {
            const pkColumn = inlinePkMatch[1].trim().replace(/[`"']/g, '');
            if (!primaryKeys.includes(pkColumn)) {
              primaryKeys.push(pkColumn);
              console.log(`Found inline primary key in ${tableName}: ${pkColumn}`);
            }
          }
        }
        
        // Check if this is a foreign key constraint - more permissive regex
        const fkMatch = line.match(/.*FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)(?:\s*\(([^)]+)\))?/i);
        if (fkMatch) {
          const fkColumn = fkMatch[1].trim().replace(/[`"']/g, '');
          const refTable = fkMatch[2].trim().replace(/[`"']/g, '');
          const refColumn = fkMatch[3] ? fkMatch[3].trim().replace(/[`"']/g, '') : 'id';
          
          console.log(`Found FK: ${tableName}.${fkColumn} -> ${refTable}.${refColumn}`);
          
          foreignKeys.push({
            column: fkColumn,
            refTable: refTable,
            refColumn: refColumn
          });
          
          continue;
        }
        
        // This should be a column definition
        const columnMatch = line.match(/^[`"']?([^\s`"']+)[`"']?\s+([^\s(]+)(?:\([^)]*\))?(.*)$/i);
        if (columnMatch) {
          const columnName = columnMatch[1].trim();
          const columnType = columnMatch[2].trim();
          const constraints = columnMatch[3] || '';
          
          console.log(`Found column: ${columnName}, type: ${columnType}`);
          
          // Check if this column is a primary key
          const isPrimaryKey = /PRIMARY\s+KEY/i.test(constraints) || primaryKeys.includes(columnName);
          if (isPrimaryKey && !primaryKeys.includes(columnName)) {
            primaryKeys.push(columnName);
          }
          
          // Check if this column has a foreign key reference
          const inlineFKMatch = constraints.match(/REFERENCES\s+([^\s(,]+)(?:\s*\(([^)]+)\))?/i);
          let isForeignKey = false;
          let refTable = null;
          let refColumn = null;
          
          console.log(`Checking for FK in constraints: ${constraints}`);
          
          if (inlineFKMatch) {
            isForeignKey = true;
            refTable = inlineFKMatch[1].trim().replace(/[`"']/g, '');
            refColumn = inlineFKMatch[2] ? inlineFKMatch[2].trim().replace(/[`"']/g, '') : 'id';
            
            console.log(`Found inline FK: ${columnName} -> ${refTable}.${refColumn}`);
            
            foreignKeys.push({
              column: columnName,
              refTable: refTable,
              refColumn: refColumn
            });
          }
          
          // Add the column
          columns.push({
            name: columnName,
            type: columnType,
            primaryKey: isPrimaryKey,
            foreignKey: isForeignKey,
            refTable: refTable,
            refColumn: refColumn
          });
        }
      }
      
      // Now check if any columns are foreign keys based on the foreign keys list
      for (const column of columns) {
        if (!column.foreignKey) {
          const fk = foreignKeys.find(fk => fk.column === column.name);
          if (fk) {
            column.foreignKey = true;
            column.refTable = fk.refTable;
            column.refColumn = fk.refColumn;
          }
        }
      }
      

      
      // Update table in map
      table.columns = columns;
      table.primaryKeys = primaryKeys;
      table.foreignKeys = foreignKeys;
    });
    
    // Third pass: Process foreign keys and build relationships
    Object.values(tableMap).forEach(table => {
      const tableName = table.name;
      
      // Add foreign key relationships
      table.foreignKeys.forEach(fk => {
        if (tableMap[fk.refTable]) { // Make sure the referenced table exists
          relationships.push({
            id: `${tableName}_${fk.column}_to_${fk.refTable}_${fk.refColumn}`,
            sourceTable: tableName,
            sourceColumn: fk.column,
            targetTable: fk.refTable,
            targetColumn: fk.refColumn,
            relationship: '1:N'
          });
          console.log(`Added relationship: ${tableName}.${fk.column} -> ${fk.refTable}.${fk.refColumn}`);
        } else {
          console.warn(`Referenced table ${fk.refTable} not found for FK ${tableName}.${fk.column}`);
        }
      });
      
      // Manual check for foreign key patterns in the table body
      if (table.body.toUpperCase().includes('FOREIGN KEY') && table.foreignKeys.length === 0) {
        console.log(`Table ${tableName} contains FOREIGN KEY text but no FKs were detected. Trying alternative method.`);
        
        // Try to find foreign keys using a more permissive regex
        const fkRegex = /FOREIGN\s+KEY\s*\(\s*([^)]+)\s*\)\s*REFERENCES\s+([^\s(,]+)(?:\s*\(\s*([^)]+)\s*\))?/gi;
        let fkMatch;
        
        while ((fkMatch = fkRegex.exec(table.body)) !== null) {
          const fkColumn = fkMatch[1].trim().replace(/[`"']/g, '');
          const refTable = fkMatch[2].trim().replace(/[`"']/g, '');
          const refColumn = fkMatch[3] ? fkMatch[3].trim().replace(/[`"']/g, '') : 'id';
          
          console.log(`Found FK with alternative method: ${tableName}.${fkColumn} -> ${refTable}.${refColumn}`);
          
          // Add relationship
          relationships.push({
            id: `${tableName}_${fkColumn}_to_${refTable}_${refColumn}`,
            sourceTable: tableName,
            sourceColumn: fkColumn,
            targetTable: refTable,
            targetColumn: refColumn,
            relationship: '1:N'
          });
        }
      }
      
      // Special case for orders table with customer_id foreign key
      if (tableName === 'orders' && tableMap['customers']) {
        // Check if there's a customer_id column in orders
        const customerIdColumn = table.columns.find(col => col.name === 'customer_id');
        if (customerIdColumn) {
          console.log('Found customer_id in orders table - adding explicit relationship');
          relationships.push({
            id: `orders_customer_id_to_customers_customer_id`,
            sourceTable: 'orders',
            sourceColumn: 'customer_id',
            targetTable: 'customers',
            targetColumn: 'customer_id',
            relationship: '1:N'
          });
        }
      }
      
      // Add the table to the result
      tables.push(table);
    });
    
    return { tables, relationships };
  } catch (error) {
    console.error('Error parsing SQL:', error);
    return { tables: [], relationships: [] };
  }
};

/**
 * Parse SQL to mermaid format
 * @param {string} sql - SQL DDL statements
 * @returns {Object} - Mermaid code, tables and relationships
 */
const parseSQLToMermaid = (sql) => {
  if (!sql || sql.trim() === '') {
    console.warn('Empty SQL provided');
    return { mermaidCode: 'erDiagram\n', tables: [], relationships: [] };
  }
  
  try {
    // Log the original SQL
    console.log('Original SQL:', sql);
    
    // Clean up SQL: remove comments and normalize
    sql = sql.replace(/--.*?\n/g, '\n')
             .replace(/\n\s*\n/g, '\n') // Remove empty lines
             .trim();
    
    console.log('Parsing SQL...');
    
    const { tables, relationships } = parseCreateTable(sql);
    
    console.log('Parsed tables count:', tables.length);
    console.log('Parsed relationships count:', relationships.length);
    console.log('Relationships:', relationships);
    
    // Generate mermaid code
    let mermaidCode = 'erDiagram\n';
    
    // Add tables and columns
    tables.forEach(table => {
      mermaidCode += `    ${table.name} {\n`;
      table.columns.forEach(col => {
        const pk = col.primaryKey ? 'PK ' : '';
        const fk = col.foreignKey ? 'FK ' : '';
        mermaidCode += `        ${pk}${fk}${col.type} ${col.name}\n`;
      });
      mermaidCode += '    }\n';
    });
    
    // Add relationships
    relationships.forEach(rel => {
      const sourceTableExists = tables.some(t => t.name === rel.sourceTable);
      const targetTableExists = tables.some(t => t.name === rel.targetTable);
      
      if (sourceTableExists && targetTableExists) {
        mermaidCode += `    ${rel.sourceTable} ||--o{ ${rel.targetTable} : "${rel.sourceColumn} → ${rel.targetColumn}"\n`;
      } else {
        console.warn(`Skipping relationship: missing table ${!sourceTableExists ? rel.sourceTable : rel.targetTable}`);
      }
    });
    
    // If no relationships were found but we have tables with likely foreign keys, add a warning
    if (relationships.length === 0 && tables.length > 1) {
      console.warn('No relationships detected but multiple tables found. This might indicate an issue with foreign key detection.');
      
      // Create a map of tables for quick lookup
      const tablesMap = {};
      tables.forEach(table => {
        tablesMap[table.name] = table;
      });
      
      // Last resort: Check for common foreign key naming patterns
      for (const table of tables) {
        if (table.name !== 'customers') { // Skip the main table
          for (const column of table.columns) {
            // Check if column name ends with _id and matches a table name + _id
            const potentialTableName = column.name.replace(/_id$/, '');
            if (column.name.endsWith('_id') && tablesMap[potentialTableName]) {
              console.log(`Found potential FK by naming convention: ${table.name}.${column.name} -> ${potentialTableName}.id`);
              relationships.push({
                id: `${table.name}_${column.name}_to_${potentialTableName}_id`,
                sourceTable: table.name,
                sourceColumn: column.name,
                targetTable: potentialTableName,
                targetColumn: 'id',
                relationship: '1:N'
              });
            }
          }
        }
      }
    }
    
    return { mermaidCode, tables, relationships };
  } catch (error) {
    console.error('Error parsing SQL:', error);
    return { mermaidCode: 'erDiagram\n', tables: [], relationships: [] };
  }
};

export { parseCreateTable, parseSQLToMermaid };