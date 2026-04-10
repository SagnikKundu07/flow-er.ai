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
    // First pass: Extract all tables - support for fully qualified Snowflake names (DB.SCHEMA.TABLE)
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([^\s`"'(,)]+(?:\.[^\s`"'(,)]+){0,2})[`"']?\s*\(([\s\S]*?)\)\s*;?/gi;
    let match;
    
    console.log('SQL to parse:', sql);
    
    // First pass: Extract all tables
    while ((match = tableRegex.exec(sql)) !== null) {
      // Extract the simple table name from fully qualified name (DB.SCHEMA.TABLE)
      const fullTableName = match[1].trim();
      const tableParts = fullTableName.split('.');
      const tableName = tableParts[tableParts.length - 1]; // Use the last part as the table name
      const schemaName = tableParts.length > 1 ? tableParts[tableParts.length - 2] : '';
      const dbName = tableParts.length > 2 ? tableParts[0] : '';
      const tableBody = match[2];
      
      console.log(`Found table: ${tableName}`);
      console.log(`Table body: ${tableBody}`);
      
      // Store table info for second pass
      tableMap[tableName] = {
        name: tableName,
        fullName: fullTableName,
        schema: schemaName,
        database: dbName,
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
      
      // Extract columns using a more robust approach
      // Split the table body into column definitions
      const columnDefinitions = [];
      let depth = 0;
      let currentDef = '';
      
      // Process each character to properly split on commas outside of parentheses
      for (let i = 0; i < tableBody.length; i++) {
        const char = tableBody[i];
        
        if (char === '(') {
          depth++;
          currentDef += char;
        } else if (char === ')') {
          depth--;
          currentDef += char;
        } else if (char === ',' && depth === 0) {
          // Only split on commas outside of parentheses
          if (currentDef.trim()) {
            columnDefinitions.push(currentDef.trim());
          }
          currentDef = '';
        } else {
          currentDef += char;
        }
      }
      
      // Add the last definition if not empty
      if (currentDef.trim()) {
        columnDefinitions.push(currentDef.trim());
      }
      
      console.log(`Found ${columnDefinitions.length} column definitions in ${tableName}`);
      columnDefinitions.forEach((def, idx) => {
        console.log(`Column definition ${idx + 1}: ${def}`);
      });
      
      // Process each column definition
      for (const definition of columnDefinitions) {
        // Skip empty definitions
        if (!definition) continue;
        
        console.log(`Processing definition: ${definition}`);
        
        // Check if this is a primary key constraint
        const pkMatch = definition.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkColumns = pkMatch[1].split(',').map(col => col.trim().replace(/[`"']/g, ''));
          primaryKeys.push(...pkColumns);
          console.log(`Found primary keys in ${tableName}:`, pkColumns);
          continue;
        }
        
        // Check if this is a foreign key constraint
        const fkMatch = definition.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)(?:\s*\(([^)]+)\))?/i);
        if (fkMatch) {
          const fkColumn = fkMatch[1].trim().replace(/[`"']/g, '');
          const refTable = fkMatch[2].trim().replace(/[`"']/g, '');
          const refColumn = fkMatch[3] ? fkMatch[3].trim().replace(/[`"']/g, '') : 'id';
          
          console.log(`Found FK: ${tableName}.${fkColumn} -> ${refTable}.${refColumn}`);
          
          // Add to foreign keys
          table.foreignKeys.push({
            column: fkColumn,
            refTable: refTable,
            refColumn: refColumn
          });
          
          continue;
        }
        
        // Check if this is a constraint definition
        if (definition.toUpperCase().startsWith('CONSTRAINT')) {
          continue;
        }
        
        // Extract column name and data type
        // This regex matches: column_name data_type(params) [constraints]
        const columnRegex = /^\s*([^\s]+)\s+([^\s]+(?:\s*\([^)]*\))?)\s*(.*)?$/i;
        const columnMatch = definition.match(columnRegex);
        
        if (columnMatch) {
          const columnName = columnMatch[1].trim().replace(/[`"']/g, '');
          let columnType = columnMatch[2].trim();
          const constraints = columnMatch[3] ? columnMatch[3].trim() : '';
          
          // Skip if this is a constraint line
          if (columnName.toUpperCase() === 'CONSTRAINT' || 
              columnName.toUpperCase() === 'PRIMARY' || 
              columnName.toUpperCase() === 'FOREIGN') {
            continue;
          }
          
          // Normalize data type
          if (columnType.toUpperCase().startsWith('TEXT')) {
            const sizeMatch = columnType.match(/TEXT\s*\(([^)]+)\)/);
            columnType = sizeMatch ? `TEXT(${sizeMatch[1]})` : 'TEXT';
          } else if (columnType.toUpperCase() === 'TIMESTAMP_NTZ') {
            columnType = 'TIMESTAMP';
          } else if (columnType.toUpperCase().startsWith('NUMBER')) {
            const precisionMatch = columnType.match(/NUMBER\s*\(([^)]+)\)/);
            columnType = precisionMatch ? `NUMBER(${precisionMatch[1]})` : 'NUMBER';
          } else if (columnType.includes('(')) {
            const typeBase = columnType.split('(')[0].trim();
            const paramMatch = columnType.match(/\(([^)]+)\)/);
            columnType = paramMatch ? `${typeBase}(${paramMatch[1]})` : typeBase;
          }
          
          // Check if this column is a primary key
          const isPrimaryKey = primaryKeys.includes(columnName) || 
                              constraints.toUpperCase().includes('PRIMARY KEY');
          
          if (isPrimaryKey && !primaryKeys.includes(columnName)) {
            primaryKeys.push(columnName);
          }
          
          // Check if this column is a foreign key
          const isForeignKey = constraints.toUpperCase().includes('REFERENCES');
          let refTable = null;
          let refColumn = null;
          
          if (isForeignKey) {
            const refMatch = constraints.match(/REFERENCES\s+([^\s(]+)(?:\s*\(([^)]+)\))?/i);
            if (refMatch) {
              refTable = refMatch[1].trim().replace(/[`"']/g, '');
              refColumn = refMatch[2] ? refMatch[2].trim().replace(/[`"']/g, '') : 'id';
              
              // Add to foreign keys
              table.foreignKeys.push({
                column: columnName,
                refTable: refTable,
                refColumn: refColumn
              });
            }
          }
          
          console.log(`Found column: ${columnName} (${columnType}) isPK: ${isPrimaryKey} isFK: ${isForeignKey}`);
          
          // Add column to the list
          columns.push({
            name: columnName,
            type: columnType,
            primaryKey: isPrimaryKey,
            foreignKey: isForeignKey,
            refTable: refTable,
            refColumn: refColumn
          });
        } else {
          console.warn(`Could not parse column definition: ${definition}`);
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
      
      // Look for foreign key relationships in column names
      for (const column of table.columns) {
        if (column.name.toLowerCase().endsWith('_id')) {
          // Extract potential table name from column name
          const potentialTableName = column.name.toLowerCase().replace(/_id$/, '');
          
          // Check if we have a table with this name
          const targetTable = Object.values(tableMap).find(t => 
            t.name.toLowerCase() === potentialTableName ||
            t.name.toLowerCase() === potentialTableName + 's' // Handle singular/plural
          );
          
          if (targetTable) {
            // Find the primary key of the target table
            const targetPk = targetTable.primaryKeys.length > 0 ? 
              targetTable.primaryKeys[0] : 
              targetTable.columns.length > 0 ? targetTable.columns[0].name : 'id';
            
            console.log(`Found potential FK by naming convention: ${tableName}.${column.name} -> ${targetTable.name}.${targetPk}`);
            
            // Add foreign key relationship
            const fk = {
              column: column.name,
              refTable: targetTable.name,
              refColumn: targetPk
            };
            
            // Add to foreign keys if not already present
            if (!table.foreignKeys.some(existingFk => 
              existingFk.column === fk.column && 
              existingFk.refTable === fk.refTable)) {
              table.foreignKeys.push(fk);
              column.foreignKey = true;
              column.refTable = targetTable.name;
              column.refColumn = targetPk;
            }
          }
        }
      }
      
      // Look for suggested foreign key relationships in comments
      const fkCommentRegex = /ALTER\s+TABLE\s+([^\s.]+(?:\.[^\s.]+){0,2})\s+ADD\s+CONSTRAINT\s+[^\s]+\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s.]+(?:\.[^\s.]+){0,2})\s*\(([^)]+)\)/gi;
      let fkCommentMatch;
      
      while ((fkCommentMatch = fkCommentRegex.exec(sql)) !== null) {
        const sourceFullName = fkCommentMatch[1].trim();
        const sourceColumn = fkCommentMatch[2].trim();
        const targetFullName = fkCommentMatch[3].trim();
        const targetColumn = fkCommentMatch[4].trim();
        
        // Extract simple table names
        const sourceTableName = sourceFullName.split('.').pop();
        const targetTableName = targetFullName.split('.').pop();
        
        if (sourceTableName === tableName) {
          console.log(`Found suggested FK in comments: ${sourceTableName}.${sourceColumn} -> ${targetTableName}.${targetColumn}`);
          
          // Add to foreign keys if not already present
          const fk = {
            column: sourceColumn,
            refTable: targetTableName,
            refColumn: targetColumn
          };
          
          if (!table.foreignKeys.some(existingFk => 
            existingFk.column === fk.column && 
            existingFk.refTable === fk.refTable)) {
            table.foreignKeys.push(fk);
            
            // Update column if it exists
            const columnToUpdate = table.columns.find(col => col.name === sourceColumn);
            if (columnToUpdate) {
              columnToUpdate.foreignKey = true;
              columnToUpdate.refTable = targetTableName;
              columnToUpdate.refColumn = targetColumn;
            }
          }
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
    
    // We'll use the SQL directly for parsing
    
    // Clean up SQL for parsing but keep comments for later
    sql = sql.replace(/\n\s*\n/g, '\n') // Remove empty lines
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
      // Use the table name in the diagram
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
    
    return { mermaidCode, tables, relationships };
  } catch (error) {
    console.error('Error parsing SQL:', error);
    return { mermaidCode: 'erDiagram\n', tables: [], relationships: [] };
  }
};

export { parseCreateTable, parseSQLToMermaid };