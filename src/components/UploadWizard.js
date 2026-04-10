import React, { useState } from 'react';
import { FiUpload, FiArrowRight, FiCopy, FiDownload, FiCode } from 'react-icons/fi';
import './UploadWizard.css';
import * as XLSX from 'xlsx';

const UploadWizard = ({ onImportComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [generatedDDL, setGeneratedDDL] = useState('');
  const [platform, setPlatform] = useState('snowflake');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeType, setCodeType] = useState('ddl');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setError('');
  };
  
  const handlePlatformChange = (e) => {
    setPlatform(e.target.value);
  };
  
  const handleCodeTypeChange = (e) => {
    setCodeType(e.target.value);
  };
  
  const processFile = () => {
    if (!file) {
      setError('Please upload a file first');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Generate DDL based on the mapping specification
        const ddl = generateDDLFromMapping(jsonData, platform);
        setGeneratedDDL(ddl);
        
        // Generate the appropriate code based on selection
        const code = generateCode(jsonData, platform, codeType);
        setGeneratedCode(code);
        
        setCurrentStep(1);
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Failed to process the file. Please ensure it\'s a valid XLSX/CSV file with the correct format.');
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read the file');
      setIsProcessing(false);
    };
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };
  
  const generateDDLFromMapping = (mappingData, platform) => {
    // This is a simplified example - in a real application, this would be more sophisticated
    let ddl = '';
    
    // Group by target table
    const tableGroups = {};
    mappingData.forEach(row => {
      const targetTable = row.target_table || row.TargetTable || row.TARGET_TABLE;
      if (!targetTable) return;
      
      if (!tableGroups[targetTable]) {
        tableGroups[targetTable] = [];
      }
      tableGroups[targetTable].push(row);
    });
    
    // Generate DDL for each table
    Object.keys(tableGroups).forEach(tableName => {
      const columns = tableGroups[tableName];
      
      // Start CREATE TABLE statement
      ddl += `-- Generated DDL for ${tableName}\n`;
      ddl += `CREATE TABLE ${tableName} (\n`;
      
      // Add columns
      const columnDefinitions = columns.map(col => {
        const columnName = col.target_column || col.TargetColumn || col.TARGET_COLUMN;
        const dataType = getDataType(col, platform);
        const isPK = col.is_primary_key === 'Y' || col.IsPrimaryKey === 'Y' || col.IS_PRIMARY_KEY === 'Y';
        
        return `  ${columnName} ${dataType}${isPK ? ' PRIMARY KEY' : ''}`;
      });
      
      ddl += columnDefinitions.join(',\n');
      ddl += '\n);\n\n';
    });
    
    // Add foreign key constraints
    Object.keys(tableGroups).forEach(tableName => {
      const columns = tableGroups[tableName];
      
      columns.forEach(col => {
        const columnName = col.target_column || col.TargetColumn || col.TARGET_COLUMN;
        const refTable = col.reference_table || col.ReferenceTable || col.REFERENCE_TABLE;
        const refColumn = col.reference_column || col.ReferenceColumn || col.REFERENCE_COLUMN;
        
        if (refTable && refColumn) {
          ddl += `-- Suggested foreign key relationship:\n`;
          ddl += `ALTER TABLE ${tableName} ADD CONSTRAINT FK_${tableName}_${columnName} \n`;
          ddl += `  FOREIGN KEY (${columnName}) REFERENCES ${refTable}(${refColumn});\n\n`;
        }
      });
    });
    
    return ddl;
  };
  
  const getDataType = (column, platform) => {
    const dataType = column.data_type || column.DataType || column.DATA_TYPE || '';
    const length = column.length || column.Length || column.LENGTH || '';
    
    switch (platform) {
      case 'snowflake':
        switch (dataType.toLowerCase()) {
          case 'varchar':
          case 'string':
          case 'text':
            return length ? `TEXT(${length})` : 'TEXT';
          case 'number':
          case 'int':
          case 'integer':
            return 'NUMBER';
          case 'date':
            return 'DATE';
          case 'timestamp':
            return 'TIMESTAMP_NTZ';
          default:
            return dataType || 'TEXT';
        }
      
      case 'bigquery':
        switch (dataType.toLowerCase()) {
          case 'varchar':
          case 'string':
          case 'text':
            return 'STRING';
          case 'number':
          case 'int':
          case 'integer':
            return 'INT64';
          case 'float':
          case 'double':
            return 'FLOAT64';
          case 'date':
            return 'DATE';
          case 'timestamp':
            return 'TIMESTAMP';
          default:
            return dataType || 'STRING';
        }
        
      default:
        return dataType || 'VARCHAR';
    }
  };
  
  const generateCode = (mappingData, platform, codeType) => {
    switch (codeType) {
      case 'matillion':
        return generateMatillionYaml(mappingData, platform);
      case 'azure':
        return generateAzureDataflowJson(mappingData, platform);
      case 'dbt':
        return generateDbtYaml(mappingData, platform);
      default:
        return ''; // Default to empty string
    }
  };
  
  const generateMatillionYaml = (mappingData, platform) => {
    // Simplified example of Matillion YAML generation
    let yaml = `---\nversion: '1.0'\nname: data_integration_job\ncomponents:\n`;
    
    // Group by target table
    const tableGroups = {};
    mappingData.forEach(row => {
      const targetTable = row.target_table || row.TargetTable || row.TARGET_TABLE;
      if (!targetTable) return;
      
      if (!tableGroups[targetTable]) {
        tableGroups[targetTable] = [];
      }
      tableGroups[targetTable].push(row);
    });
    
    // Generate components for each table
    Object.keys(tableGroups).forEach((tableName, index) => {
      yaml += `  - id: extract_${tableName.toLowerCase()}\n`;
      yaml += `    type: TableInput\n`;
      yaml += `    properties:\n`;
      yaml += `      connection: source_connection\n`;
      yaml += `      schema: source_schema\n`;
      yaml += `      table: ${tableName}_source\n\n`;
      
      yaml += `  - id: load_${tableName.toLowerCase()}\n`;
      yaml += `    type: TableOutput\n`;
      yaml += `    properties:\n`;
      yaml += `      connection: target_connection\n`;
      yaml += `      schema: target_schema\n`;
      yaml += `      table: ${tableName}\n`;
      yaml += `      create_table: true\n`;
      yaml += `      truncate: false\n`;
      yaml += `    input: transform_${tableName.toLowerCase()}\n\n`;
      
      yaml += `  - id: transform_${tableName.toLowerCase()}\n`;
      yaml += `    type: Calculator\n`;
      yaml += `    properties:\n`;
      yaml += `      calculations:\n`;
      
      // Add calculations for each column
      tableGroups[tableName].forEach(col => {
        const targetColumn = col.target_column || col.TargetColumn || col.TARGET_COLUMN;
        const sourceColumn = col.source_column || col.SourceColumn || col.SOURCE_COLUMN;
        
        if (targetColumn && sourceColumn) {
          yaml += `        - name: ${targetColumn}\n`;
          yaml += `          type: ${getDataType(col, platform)}\n`;
          yaml += `          expression: ${sourceColumn}\n`;
        }
      });
      
      yaml += `    input: extract_${tableName.toLowerCase()}\n\n`;
    });
    
    return yaml;
  };
  
  const generateAzureDataflowJson = (mappingData, platform) => {
    // Simplified example of Azure Data Factory dataflow JSON
    const json = {
      name: "DataFlow",
      properties: {
        type: "MappingDataFlow",
        typeProperties: {
          sources: [],
          sinks: [],
          transformations: []
        }
      }
    };
    
    // Group by target table
    const tableGroups = {};
    mappingData.forEach(row => {
      const targetTable = row.target_table || row.TargetTable || row.TARGET_TABLE;
      if (!targetTable) return;
      
      if (!tableGroups[targetTable]) {
        tableGroups[targetTable] = [];
      }
      tableGroups[targetTable].push(row);
    });
    
    // Generate sources, transformations and sinks
    Object.keys(tableGroups).forEach((tableName, index) => {
      // Source
      json.properties.typeProperties.sources.push({
        name: `source_${tableName}`,
        dataset: {
          referenceName: `${tableName}_source_dataset`,
          type: "DatasetReference"
        }
      });
      
      // Transformation
      const derivedColumns = [];
      tableGroups[tableName].forEach(col => {
        const targetColumn = col.target_column || col.TargetColumn || col.TARGET_COLUMN;
        const sourceColumn = col.source_column || col.SourceColumn || col.SOURCE_COLUMN;
        
        if (targetColumn && sourceColumn) {
          derivedColumns.push({
            name: targetColumn,
            expression: sourceColumn
          });
        }
      });
      
      json.properties.typeProperties.transformations.push({
        name: `transform_${tableName}`,
        type: "DerivedColumn",
        dependsOn: [`source_${tableName}`],
        mappings: derivedColumns
      });
      
      // Sink
      json.properties.typeProperties.sinks.push({
        name: `sink_${tableName}`,
        dataset: {
          referenceName: `${tableName}_target_dataset`,
          type: "DatasetReference"
        },
        dependsOn: [`transform_${tableName}`]
      });
    });
    
    return JSON.stringify(json, null, 2);
  };
  
  const generateDbtYaml = (mappingData, platform) => {
    // Simplified example of dbt YAML generation
    let yaml = `version: 2\n\nmodels:\n`;
    
    // Group by target table
    const tableGroups = {};
    mappingData.forEach(row => {
      const targetTable = row.target_table || row.TargetTable || row.TARGET_TABLE;
      if (!targetTable) return;
      
      if (!tableGroups[targetTable]) {
        tableGroups[targetTable] = [];
      }
      tableGroups[targetTable].push(row);
    });
    
    // Generate model for each table
    Object.keys(tableGroups).forEach(tableName => {
      yaml += `  - name: ${tableName.toLowerCase()}\n`;
      yaml += `    description: "${tableName} table generated from mapping specification"\n`;
      yaml += `    columns:\n`;
      
      // Add columns
      tableGroups[tableName].forEach(col => {
        const columnName = col.target_column || col.TargetColumn || col.TARGET_COLUMN;
        if (columnName) {
          yaml += `      - name: ${columnName}\n`;
          yaml += `        description: "${col.description || ''}"\n`;
          
          // Add tests
          const isPK = col.is_primary_key === 'Y' || col.IsPrimaryKey === 'Y' || col.IS_PRIMARY_KEY === 'Y';
          if (isPK) {
            yaml += `        tests:\n`;
            yaml += `          - unique\n`;
            yaml += `          - not_null\n`;
          }
        }
      });
      
      yaml += `\n`;
    });
    
    // Add sources
    yaml += `sources:\n`;
    const sourceTables = new Set();
    mappingData.forEach(row => {
      const sourceTable = row.source_table || row.SourceTable || row.SOURCE_TABLE;
      if (sourceTable) {
        sourceTables.add(sourceTable);
      }
    });
    
    if (sourceTables.size > 0) {
      yaml += `  - name: source_system\n`;
      yaml += `    tables:\n`;
      sourceTables.forEach(table => {
        yaml += `      - name: ${table}\n`;
      });
    }
    
    return yaml;
  };
  
  const handleImportComplete = () => {
    onImportComplete(generatedDDL, platform);
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };
  
  const downloadFile = (content, fileType) => {
    const element = document.createElement('a');
    let mimeType, extension;
    
    switch (fileType) {
      case 'ddl':
        mimeType = 'text/plain';
        extension = 'sql';
        break;
      case 'matillion':
      case 'dbt':
        mimeType = 'application/yaml';
        extension = 'yaml';
        break;
      case 'azure':
        mimeType = 'application/json';
        extension = 'json';
        break;
      default:
        mimeType = 'text/plain';
        extension = 'txt';
    }
    
    const file = new Blob([content], {type: mimeType});
    element.href = URL.createObjectURL(file);
    element.download = `generated_${fileType}.${extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="upload-step">
            <div className="upload-icon">
              <FiUpload size={48} color="#2563eb" />
            </div>
            <h2>Upload Mapping Specification</h2>
            <p>Upload a mapping specification file (XLSX/CSV) to generate DDL and ETL code</p>
            
            <div className="file-upload-container">
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileUpload}
                id="file-upload"
                className="file-input"
              />
              <label htmlFor="file-upload" className="file-label">
                {fileName || 'Choose a file'}
              </label>
            </div>
            
            <div className="platform-selector">
              <label>Target Platform:</label>
              <select value={platform} onChange={handlePlatformChange}>
                <option value="snowflake">Snowflake</option>
                <option value="bigquery">Google BigQuery</option>
                <option value="redshift">Amazon Redshift</option>
                <option value="synapse">Azure Synapse</option>
              </select>
            </div>
            
            <div className="code-type-selector">
              <label>Generate Code For:</label>
              <select value={codeType} onChange={handleCodeTypeChange}>
                <option value="ddl">SQL DDL</option>
                <option value="matillion">Matillion YAML</option>
                <option value="azure">Azure Data Factory JSON</option>
                <option value="dbt">dbt YAML</option>
              </select>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="upload-actions">
              <button className="back-button" onClick={onBack}>
                Cancel
              </button>
              <button 
                className="next-button" 
                onClick={processFile}
                disabled={!file || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Next'} {!isProcessing && <FiArrowRight />}
              </button>
            </div>
          </div>
        );
      
      case 1:
        return (
          <div className="upload-step">
            <div className="wizard-tabs">
              <div className={`wizard-tab ${codeType === 'ddl' ? 'active' : ''}`} onClick={() => setCodeType('ddl')}>SQL DDL</div>
              <div className={`wizard-tab ${codeType === 'matillion' ? 'active' : ''}`} onClick={() => setCodeType('matillion')}>Matillion</div>
              <div className={`wizard-tab ${codeType === 'azure' ? 'active' : ''}`} onClick={() => setCodeType('azure')}>Azure</div>
              <div className={`wizard-tab ${codeType === 'dbt' ? 'active' : ''}`} onClick={() => setCodeType('dbt')}>dbt</div>
              <div className="tab-indicator" style={{ 
                transform: `translateX(${codeType === 'ddl' ? '0%' : codeType === 'matillion' ? '100%' : codeType === 'azure' ? '200%' : '300%'})` 
              }}></div>
            </div>
            
            <div className="wizard-content">
              <h3>Generated {codeType.toUpperCase()} Code</h3>
              
              <div className="code-container">
                <div className="code-actions">
                  <button className="action-button" onClick={() => copyToClipboard(codeType === 'ddl' ? generatedDDL : generatedCode)}>
                    <FiCopy /> Copy
                  </button>
                  <button className="action-button" onClick={() => downloadFile(codeType === 'ddl' ? generatedDDL : generatedCode, codeType)}>
                    <FiDownload /> Download
                  </button>
                </div>
                <pre className="generated-code">
                  {codeType === 'ddl' ? generatedDDL : generatedCode}
                </pre>
              </div>
              
              <div className="upload-actions">
                <button className="back-button" onClick={() => setCurrentStep(0)}>
                  Back
                </button>
                <button 
                  className="complete-button" 
                  onClick={handleImportComplete}
                >
                  Generate Flowchart <FiCode />
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="upload-wizard-container">
      <div className="upload-wizard-content">
        {renderStep()}
      </div>
    </div>
  );
};

export default UploadWizard;
