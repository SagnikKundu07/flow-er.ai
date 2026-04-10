import React, { useState } from 'react';
import { FiDatabase, FiArrowRight, FiCopy } from 'react-icons/fi';
import './ImportWizard.css';
import { getMetadataQuery } from '../utils/databaseQueries';

const ImportWizard = ({ onImportComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dbType, setDbType] = useState('');
  const [metadataQuery, setMetadataQuery] = useState('');
  const [queryResult, setQueryResult] = useState('');
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setQueryResult(e.target.result);
    };
    reader.readAsText(file);
  };
  
  const handleDbTypeChange = (e) => {
    const selectedDb = e.target.value;
    setDbType(selectedDb);
    // Generate the appropriate metadata query for the selected database
    const query = getMetadataQuery(selectedDb);
    setMetadataQuery(query);
  };
  
  const handleImportComplete = () => {
    onImportComplete(queryResult, dbType);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(metadataQuery);
    alert('Query copied to clipboard!');
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="import-step">
            <div className="import-icon">
              <FiDatabase size={48} color="#2563eb" />
            </div>
            <h2>Import Database</h2>
            <p>Import database to create table data validator and create a data lineage diagram</p>
            <div className="import-actions">
              <button className="import-button" onClick={() => setCurrentStep(1)}>
                Import Database
              </button>
            </div>
          </div>
        );
      
      case 1:
        return (
          <div className="import-step">
            <div className="wizard-tabs">
              <div className={`wizard-tab ${currentStep === 1 ? 'active' : ''}`}>Query</div>
              <div className={`wizard-tab ${currentStep === 2 ? 'active' : ''}`}>Data</div>
              <div className="tab-indicator" style={{ transform: 'translateX(0%)' }}></div>
            </div>
            
            <div className="wizard-content">
              <h3>Database</h3>
              <div className="db-type-selector">
                <select value={dbType} onChange={handleDbTypeChange}>
                  <option value="">-- Select a database type --</option>
                  <option value="snowflake">Snowflake</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="sqlserver">SQL Server</option>
                  <option value="oracle">Oracle</option>
                </select>
              </div>
              
              <h3>Metadata Query (Execute this in your database)</h3>
              <div className="query-container">
                <div className="query-actions">
                  <button className="copy-button" onClick={copyToClipboard}>
                    <FiCopy /> Copy
                  </button>
                </div>
                <pre className="metadata-query">{metadataQuery}</pre>
              </div>
              
              <div className="import-actions">
                <button className="back-button" onClick={() => setCurrentStep(0)}>
                  Cancel
                </button>
                <button className="next-button" onClick={() => setCurrentStep(2)}>
                  Next <FiArrowRight />
                </button>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="import-step">
            <div className="wizard-tabs">
              <div className={`wizard-tab ${currentStep === 1 ? 'active' : ''}`}>Query</div>
              <div className={`wizard-tab ${currentStep === 2 ? 'active' : ''}`}>Data</div>
              <div className="tab-indicator" style={{ transform: 'translateX(100%)' }}></div>
            </div>
            
            <div className="wizard-content">
              <h3>Paste generated result in .csv, .tsv, .txt file format</h3>
              
              <div className="data-input-container">
                <textarea 
                  className="data-input" 
                  placeholder="Paste the query result here..."
                  value={queryResult}
                  onChange={(e) => setQueryResult(e.target.value)}
                ></textarea>
              </div>
              
              <div className="file-upload-container">
                <p>Or upload a file:</p>
                <input 
                  type="file" 
                  accept=".csv,.tsv,.txt" 
                  onChange={handleFileUpload} 
                />
              </div>
              
              <div className="import-actions">
                <button className="back-button" onClick={() => setCurrentStep(1)}>
                  Back
                </button>
                <button 
                  className="complete-button" 
                  onClick={handleImportComplete}
                  disabled={!queryResult.trim()}
                >
                  Import
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
    <div className="import-wizard-container">
      <div className="import-wizard-content">
        {renderStep()}
      </div>
    </div>
  );
};

export default ImportWizard;
