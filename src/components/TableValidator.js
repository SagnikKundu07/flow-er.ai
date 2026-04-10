import React, { useState, useEffect } from 'react';
import './TableValidator.css';
import { FiCopy, FiChevronLeft, FiDownload } from 'react-icons/fi';

const TableValidator = ({ onBack, metadataContent }) => {
  const [tables, setTables] = useState({});
  const [selectedTable, setSelectedTable] = useState('');
  const [activeTab, setActiveTab] = useState('structure');
  const [copied, setCopied] = useState(false);
  const [generatedDDL, setGeneratedDDL] = useState('');

  // Parse the CSV metadata content
  useEffect(() => {
    if (!metadataContent) return;
    
    const parseMetadata = () => {
      const lines = metadataContent.trim().split('\n');
      const startIndex = lines[0].startsWith('DBMS') || lines[0].startsWith('snowflake') ? 1 : 0;
      const parsedTables = {};
      
      for (let i = startIndex; i < lines.length; i++) {
        const columns = lines[i].split(',');
        // Expected format: DBMS,DATABASE_NAME,TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH
        if (columns.length >= 8) {
          const dbName = columns[1];
          const schema = columns[2];
          const tableName = columns[3];
          const tableKey = `${dbName}.${schema}.${tableName}`;
          
          if (!parsedTables[tableKey]) {
            parsedTables[tableKey] = {
              database: dbName,
              schema,
              name: tableName,
              columns: []
            };
          }
          
          parsedTables[tableKey].columns.push({
            name: columns[4],
            position: parseInt(columns[5], 10),
            dataType: columns[6],
            maxLength: columns[7] ? parseInt(columns[7], 10) : null
          });
        }
      }
      
      Object.values(parsedTables).forEach(table => {
        table.columns.sort((a, b) => a.position - b.position);
      });
      
      setTables(parsedTables);
      // Don't automatically select a table - let user choose
      setSelectedTable("");
    };
    
    parseMetadata();
  }, [metadataContent]);

  const generateValidationQueries = (table) => {
    if (!table) return [];
    
    const { database, schema, name, columns } = table;
    const fullyQualifiedName = `${database}.${schema}.${name}`;
    const queries = [];

    // 1. Table Structure
    queries.push({
      name: 'Table Structure',
      sql: `-- Table structure for ${fullyQualifiedName}\n` +
           `SELECT * FROM ${fullyQualifiedName} LIMIT 10;`,
      description: 'Shows the structure of the table'
    });

    // 2. Primary Key Check
    const pkColumn = columns[0];
    queries.push({
      name: 'Primary Key Check',
      sql: `-- Check for primary key uniqueness\n` +
           `SELECT 'PK_VIOLATION' AS check_type, ${pkColumn.name} AS id, COUNT(*) AS count\n` +
           `FROM ${fullyQualifiedName}\n` +
           `GROUP BY ${pkColumn.name}\n` +
           `HAVING COUNT(*) > 1;`,
      description: 'Checks for duplicate primary key values'
    });

    // 3. Foreign Key Checks
    columns.forEach(col => {
      if ((col.name.endsWith('_ID') || col.name === 'ID') && col.position !== 1) {
        queries.push({
          name: `Foreign Key Check: ${col.name}`,
          sql: `-- Check for orphaned ${col.name} values\n` +
               `SELECT 'ORPHANED_${col.name}' AS check_type, t.${col.name} AS id\n` +
               `FROM ${fullyQualifiedName} t\n` +
               `LEFT JOIN ${database}.PARENT_SCHEMA.PARENT_TABLE p ON t.${col.name} = p.id\n` +
               `WHERE t.${col.name} IS NOT NULL AND p.id IS NULL;`,
          description: `Checks for orphaned ${col.name} values (update PARENT_TABLE)`
        });
      }
    });

    // 4. Data Type Checks
    columns.forEach(col => {
      if (col.dataType === 'TEXT' && col.maxLength) {
        queries.push({
          name: `Data Length Check: ${col.name}`,
          sql: `-- Check for data exceeding max length (${col.maxLength})\n` +
               `SELECT 'LENGTH_VIOLATION' AS check_type, ${pkColumn.name} AS id, '${col.name}' AS column_name,\n` +
               `       LENGTH(${col.name}) AS actual_length, ${col.maxLength} AS max_length\n` +
               `FROM ${fullyQualifiedName}\n` +
               `WHERE LENGTH(${col.name}) > ${col.maxLength};`,
          description: `Checks for values exceeding max length in ${col.name}`
        });
      }
    });

    // 5. Null Checks
    columns.forEach(col => {
      if (!col.name.endsWith('_ID') && col.name !== 'ID' && 
          !col.name.toLowerCase().includes('date') && 
          col.dataType !== 'BOOLEAN') {
        queries.push({
          name: `Null Check: ${col.name}`,
          sql: `-- Check for NULL values in ${col.name}\n` +
               `SELECT 'NULL_VALUE' AS check_type, ${pkColumn.name} AS id, '${col.name}' AS column_name\n` +
               `FROM ${fullyQualifiedName}\n` +
               `WHERE ${col.name} IS NULL;`,
          description: `Checks for NULL values in ${col.name}`
        });
      }
    });

    return queries;
  };

  // Generate DDL for the selected table
  const generateTableDDL = (table) => {
    if (!table) return '';
    
    const { database, schema, name, columns } = table;
    // Use proper SQL syntax without square brackets for Snowflake
    const fullyQualifiedName = `${database}.${schema}.${name}`;
    
    let ddl = `-- Generated DDL for ${fullyQualifiedName}\n`;
    ddl += `CREATE TABLE ${fullyQualifiedName} (\n`;
    
    columns.forEach((col, index) => {
      ddl += `  ${col.name} ${col.dataType}`;
      
      // Add length for character types
      if (col.dataType.toUpperCase().includes('TEXT') || col.dataType.toUpperCase().includes('VARCHAR') || col.dataType.toUpperCase().includes('CHAR')) {
        if (col.maxLength) {
          ddl += `(${col.maxLength})`;
        }
      }
      
      // Add primary key constraint for first column
      if (index === 0) {
        ddl += ' PRIMARY KEY';
      }
      
      // Add comma if not the last column
      if (index < columns.length - 1) {
        ddl += ',\n';
      }
    });
    
    ddl += '\n);';
    
    // Add foreign key comments - avoid square brackets which cause syntax errors
    columns.forEach(col => {
      if ((col.name.endsWith('_ID') || col.name === 'ID') && col.position !== 1) {
        ddl += `\n\n-- Suggested foreign key relationship:\n`;
        ddl += `-- ALTER TABLE ${fullyQualifiedName} ADD CONSTRAINT FK_${name}_${col.name} \n`;
        ddl += `--   FOREIGN KEY (${col.name}) REFERENCES ${database}.PARENT_SCHEMA.PARENT_TABLE(ID);`;
      }
    });
    
    setGeneratedDDL(ddl);
    return ddl;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate DDL for ALL tables
  const generateAllTablesDDL = () => {
    // Create a complete DDL script with all tables
    const allDDL = Object.values(tables)
      .map(table => {
        // Generate DDL for this table without setting state
        const { database, schema, name, columns } = table;
        const fullyQualifiedName = `${database}.${schema}.${name}`;
        
        let ddl = `-- Generated DDL for ${fullyQualifiedName}\n`;
        ddl += `CREATE TABLE ${fullyQualifiedName} (\n`;
        
        columns.forEach((col, index) => {
          ddl += `  ${col.name} ${col.dataType}`;
          
          // Add length for character types
          if (col.dataType.toUpperCase().includes('TEXT') || col.dataType.toUpperCase().includes('VARCHAR') || col.dataType.toUpperCase().includes('CHAR')) {
            if (col.maxLength) {
              ddl += `(${col.maxLength})`;
            }
          }
          
          // Add primary key constraint for first column
          if (index === 0) {
            ddl += ' PRIMARY KEY';
          }
          
          // Add comma if not the last column
          if (index < columns.length - 1) {
            ddl += ',\n';
          }
        });
        
        ddl += '\n);';
        
        // Add foreign key comments - avoid square brackets which cause syntax errors
        columns.forEach(col => {
          if ((col.name.endsWith('_ID') || col.name === 'ID') && col.position !== 1) {
            ddl += `\n\n-- Suggested foreign key relationship:\n`;
            ddl += `-- ALTER TABLE ${fullyQualifiedName} ADD CONSTRAINT FK_${name}_${col.name} \n`;
            ddl += `--   FOREIGN KEY (${col.name}) REFERENCES ${database}.PARENT_SCHEMA.PARENT_TABLE(ID);`;
          }
        });
        
        return ddl;
      })
      .join('\n\n');
      
    return allDDL;
  };

  // Run validation and generate DDL when a table is selected
  useEffect(() => {
    if (!selectedTable || selectedTable === "" || !tables[selectedTable]) {
      setGeneratedDDL("");
      return;
    }
    
    const ddl = generateTableDDL(tables[selectedTable]);
    setGeneratedDDL(ddl);
  }, [selectedTable, tables]);

  const downloadDDL = () => {
    const allDDL = generateAllTablesDDL();
    if (allDDL) {
      // Format the DDL with proper comments and formatting
      const formattedDDL = allDDL
        .replace(/\n\s*\n+/g, '\n\n') // Normalize empty lines
        .trim(); // Remove leading/trailing whitespace
      
      // Create a formatted SQL file with header
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sqlContent = 
`/*
 * Generated SQL DDL Script
 * Generated on: ${new Date().toLocaleString()}
 * Contains table definitions and suggested foreign key relationships
 */

${formattedDDL}`;
      
      // Create a blob and download link
      const blob = new Blob([sqlContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database_schema_${timestamp}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const downloadValidationScript = () => {
    if (!selectedTable || !tables[selectedTable]) return;
    
    // Generate validation queries for all tables
    const allValidationQueries = Object.values(tables).flatMap(table => {
      return generateValidationQueries(table);
    });
    
    // Format the validation queries into a single script
    const validationScript = allValidationQueries.map(query => {
      return `-- ${query.name}\n-- ${query.description}\n${query.sql}\n`;
    }).join('\n\n');
    
    // Create a formatted SQL file with header
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sqlContent = 
`/*
 * Generated SQL Validation Script
 * Generated on: ${new Date().toLocaleString()}
 * Contains validation queries for all tables
 */

${validationScript}`;
    
    // Create a blob and download link
    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation_script_${timestamp}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTabs = () => {
    const table = tables[selectedTable];
    if (!table) return null;

    const queries = generateValidationQueries(table);

    return (
      <div className="tabs-container">
        <div className="tabs-header">
          <button 
            className={`tab-button ${activeTab === 'structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('structure')}
          >
            Table Structure
          </button>
          <button 
            className={`tab-button ${activeTab === 'queries' ? 'active' : ''}`}
            onClick={() => setActiveTab('queries')}
          >
            Validation Queries
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'structure' ? (
            <div className="table-structure">
              <h3>Table: {selectedTable}</h3>
              <div className="sql-editor">
                <div className="editor-header">
                  <span>SQL</span>
                  <button 
                    className="copy-button"
                    onClick={() => copyToClipboard(`SELECT * FROM ${table ? `${table.database}.${table.schema}.${table.name}` : selectedTable} LIMIT 10;`)}
                  >
                    <FiCopy /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="sql-code">
                  {`-- Sample query for ${table ? `${table.database}.${table.schema}.${table.name}` : selectedTable}\n`}
                  {`SELECT * FROM ${table ? `${table.database}.${table.schema}.${table.name}` : selectedTable} LIMIT 10;`}
                </pre>
              </div>
              
              <div className="table-details">
                <h4>Columns</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Data Type</th>
                      <th>Max Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map(col => (
                      <tr key={col.name}>
                        <td>{col.name}</td>
                        <td>{col.dataType}</td>
                        <td>{col.maxLength || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="ddl-section">
                <h4>Generated DDL</h4>
                <div className="sql-editor">
                  <div className="editor-header">
                    <span>SQL DDL</span>
                    <div className="editor-actions">
                      <button 
                        className="copy-button"
                        onClick={() => copyToClipboard(generatedDDL)}
                      >
                        <FiCopy /> {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button 
                        className="download-sql-button small"
                        onClick={downloadDDL}
                      >
                        <FiDownload /> Download DDL
                      </button>
                      <button 
                        className="download-validation-button small"
                        onClick={downloadValidationScript}
                      >
                        <FiDownload /> Validation Script
                      </button>
                    </div>
                  </div>
                  <pre className="sql-code">
                    {generatedDDL}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="validation-queries">
              <h3>Validation Queries for {selectedTable}</h3>
              <p className="query-help">
                Run these queries to validate your data. Results will show any issues found.
              </p>
              
              {queries.map((query, index) => (
                <div key={index} className="query-card">
                  <div className="query-header">
                    <h4>{query.name}</h4>
                    <button 
                      className="copy-button small"
                      onClick={() => copyToClipboard(query.sql)}
                    >
                      <FiCopy /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="query-desc">{query.description}</p>
                  <pre className="sql-code">{query.sql}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="validator-container">
      <div className="validator-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            <FiChevronLeft /> Back
          </button>
        </div>
        <div className="table-selector">
          <select 
            value={selectedTable} 
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            <option value="">-- Select a table --</option>
            {Object.keys(tables).map(tableKey => (
              <option key={tableKey} value={tableKey}>{tableKey}</option>
            ))}
          </select>
          <div className="divider" />
          <div className="button-group">
            <button 
              className="download-sql-button" 
              onClick={downloadDDL}
              title="Download DDL SQL file"
            >
              <FiDownload /> Download DDL
            </button>
            <button 
              className="download-validation-button" 
              onClick={downloadValidationScript}
              title="Download validation queries"
            >
              <FiDownload /> Validation Script
            </button>
          </div>
        </div>
      </div>

      {selectedTable ? (
        renderTabs()
      ) : (
        <div className="no-table-selected">
          <p>No table selected or no metadata available.</p>
        </div>
      )}
    </div>
  );
};

export default TableValidator;