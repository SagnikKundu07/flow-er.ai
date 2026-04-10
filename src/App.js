import React, { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { FiPlay, FiTrash2, FiCopy, FiRotateCw, FiCode, FiSave, FiCornerUpLeft, FiCornerUpRight, FiChevronLeft } from 'react-icons/fi';
import { BsDiagram3 } from "react-icons/bs";
import 'reactflow/dist/style.css';
import './App.css';
import Editor from './components/Editor';
import FlowChart from './components/FlowChart';
import UploadWizard from './components/UploadWizard';
import TableValidator from './components/TableValidator';
import Landing from './components/Landing';
import { parseSQLToMermaid } from './utils/sqlParser';

// Sample Snowflake DDL to pre-populate the editor
const SAMPLE_DDL = `-- Generated DDL for CM_SYS_DB.GLOBAL.CUSTOMERS
CREATE TABLE CM_SYS_DB.GLOBAL.CUSTOMERS (
  CUSTOMER_ID NUMBER PRIMARY KEY,
  FIRST_NAME TEXT(50),
  LAST_NAME TEXT(50),
  EMAIL TEXT(100),
  PHONE TEXT(20),
  CREATED_AT TIMESTAMP_NTZ
);

-- Generated DDL for CM_SYS_DB.GLOBAL.ORDERS
CREATE TABLE CM_SYS_DB.GLOBAL.ORDERS (
  ORDER_ID NUMBER PRIMARY KEY,
  CUSTOMER_ID NUMBER,
  ORDER_DATE TIMESTAMP_NTZ,
  STATUS TEXT(20),
  SHIPPING_ADDRESS TEXT(16777216),
  TOTAL_AMOUNT NUMBER
);

-- Suggested foreign key relationship:
ALTER TABLE CM_SYS_DB.GLOBAL.ORDERS ADD CONSTRAINT FK_ORDERS_CUSTOMER_ID 
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CM_SYS_DB.GLOBAL.CUSTOMERS(CUSTOMER_ID);`;

function App() {
  const [sql, setSql] = useState(SAMPLE_DDL);
  const [originalMetadata, setOriginalMetadata] = useState('');
  // We're storing generatedDDL but not using it directly in App.js
  // It's used for state persistence when navigating back to TableValidator
  const [, setGeneratedDDL] = useState('');
  const [tables, setTables] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [showEditor, setShowEditor] = useState(true);
  const [connectorsMode, setConnectorsMode] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showTableValidator, setShowTableValidator] = useState(false);
  const [showFlowchart, setShowFlowchart] = useState(false);
  // We need to track the database type but don't directly use it in this component
  // It's passed to child components that need it
  const [, setDbType] = useState('mysql');
  const [erdError, setErdError] = useState(null);
  
  // Undo/Redo history state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Removed unused handleSqlChange function as we're using setSql directly

  // Handle undo/redo functionality
  const addToHistory = useCallback((newTables, newRelationships) => {
    // Add current state to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ tables: [...newTables], relationships: [...newRelationships] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const { tables: prevTables, relationships: prevRelationships } = history[newIndex];
      setTables(prevTables);
      setRelationships(prevRelationships);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const { tables: nextTables, relationships: nextRelationships } = history[newIndex];
      setTables(nextTables);
      setRelationships(nextRelationships);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const handleGenerate = () => {
    try {
      // Ensure we have valid SQL before parsing
      if (!sql || sql.trim() === '') {
        setErdError('No SQL provided for ERD generation');
        return;
      }
      
      // Clean up SQL to prevent parsing errors
      const cleanedSql = sql
        .replace(/\[/g, '') // Remove square brackets
        .replace(/\]/g, '') // Remove square brackets
        .replace(/--.*$/gm, '') // Remove comments
        .trim();
      
      const result = parseSQLToMermaid(cleanedSql);
      const parsedTables = result.tables || [];
      const parsedRelationships = result.relationships || [];
      
      setTables(parsedTables);
      setRelationships(parsedRelationships);
      
      // Add to history for undo/redo
      addToHistory(parsedTables, parsedRelationships);
      
      setErdError(null);
      console.log('Generated tables:', parsedTables);
      console.log('Generated relationships:', parsedRelationships);
    } catch (error) {
      console.error('Error parsing SQL:', error);
      setErdError(`Error generating ERD: ${error.message || 'Invalid SQL syntax'}`);
    }
  };

  // No longer needed as we use inline function in the button click handler

  const handleImportComplete = (importedSql, selectedPlatform) => {
    setSql(importedSql);
    setOriginalMetadata(importedSql); 
    setShowUploadWizard(false);
    setShowFlowchart(true);
    setShowEditor(true);
    
    // Generate the ERD after a short delay
    setTimeout(() => {
      try {
        handleGenerate();
      } catch (err) {
        console.error('ERD generation error:', err);
        setErdError('Could not generate ERD. Please check your DDL.');
      }
    }, 100);
  };

  const handleBackFromUploadWizard = () => {
    setShowUploadWizard(false);
    setShowLanding(true);
  };

  const handleSelectOption = (option) => {
    setShowFlowchart(true);
    setShowEditor(true);
  };
  
  const handleBackFromValidator = () => {
    setShowTableValidator(false);
    setShowFlowchart(true);
    // Keep the original metadata and generated DDL in memory
  };

  const handleGenerateERDFromValidator = (ddlSql) => {
    // Use the full generated DDL without filtering
    setSql(ddlSql);
    setGeneratedDDL(ddlSql); // Store the original DDL for persistence
    setShowTableValidator(false);
    setShowFlowchart(true);
    setShowEditor(true);
    setErdError(null);
    
    // Generate the ERD after a short delay to ensure the SQL is set
    setTimeout(() => {
      try {
        handleGenerate();
      } catch (err) {
        console.error('ERD generation error:', err);
        setErdError('Could not generate ERD. Please check your DDL.');
      }
    }, 100);
  };

  const handleBackFromFlowchart = () => {
    setShowFlowchart(false);
    setShowTableValidator(true);
    setErdError(null);
    // Restore the original metadata for the validator
    // but keep the generated DDL in memory
    setSql(originalMetadata);
  };

  const handleGetStarted = () => {
    setShowLanding(false);
    // Show the upload wizard
    setShowUploadWizard(true);
  };
  
  const toggleQueryEditor = () => {
    setShowEditor(!showEditor);
  };

  const handleCopyDiagram = () => {
    alert('Copy diagram feature coming soon!');
  };

  const handleSaveDiagram = () => {
    alert('Save diagram feature coming soon!');
  };

  const handleDeleteDiagram = () => {
    setTables([]);
    setRelationships([]);
    // Reset history when clearing the diagram
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleReloadPage = () => {
    // Reset the state instead of reloading the page
    setSql('');
    setTables([]);
    setRelationships([]);
    setHistory([]);
    setHistoryIndex(-1);
    
    // Clear any error states
    setErdError(null);
    
    // Show success message
    console.log('Application state reset successfully');
  };

  return (
    <div className="App">
      {showLanding && (
        <Landing onGetStarted={handleGetStarted} />
      )}
      
      {showUploadWizard && (
        <UploadWizard 
          onImportComplete={handleImportComplete}
          onBack={handleBackFromUploadWizard}
        />
      )}
      
      {showTableValidator && (
        <TableValidator 
          onBack={handleBackFromValidator} 
          metadataContent={sql}
          onGenerateERD={handleGenerateERDFromValidator}
        />
      )}
      
      {showFlowchart && (
        <div className="flowchart-container">
          <div className="toolbar">
            <div className="toolbar-left">
              <button className="toolbar-button" onClick={handleBackFromFlowchart} title="Back to Table Validator">
                <FiChevronLeft /> Back
              </button>
              <button 
                onClick={toggleQueryEditor} 
                className={`toolbar-button ${showEditor ? 'active' : ''}`}
                title="Open/close query editor"
              >
                <FiCode className="button-icon" />
                <span>Query</span>
              </button>
              <button 
                onClick={handleGenerate} 
                className="toolbar-button generate-button"
                title="Generate flowchart from SQL"
              >
                <FiPlay className="button-icon" />
                <span>Generate</span>
              </button>
              <button 
                onClick={() => setConnectorsMode(!connectorsMode)} 
                className={`toolbar-button ${connectorsMode ? 'active' : ''}`}
                title="Create or delete connections between tables"
              >
                <BsDiagram3 className="button-icon" />
                <span>Connectors</span>
              </button>
            </div>
            
            <div className="toolbar-right">
              <button 
                className="toolbar-button icon-button" 
                onClick={handleUndo} 
                title="Undo" 
                disabled={historyIndex <= 0}
              >
                <FiCornerUpLeft />
              </button>
              <button 
                className="toolbar-button icon-button" 
                onClick={handleRedo} 
                title="Redo" 
                disabled={historyIndex >= history.length - 1}
              >
                <FiCornerUpRight />
              </button>
              <button 
                onClick={handleReloadPage} 
                className="toolbar-button icon-button"
                title="Reload page"
              >
                <FiRotateCw className="button-icon" />
              </button>
              <button 
                onClick={handleCopyDiagram} 
                className="toolbar-button icon-button"
                title="Copy diagram (coming soon)"
              >
                <FiCopy className="button-icon" />
              </button>
              <button 
                onClick={handleSaveDiagram} 
                className="toolbar-button icon-button"
                title="Save diagram (coming soon)"
              >
                <FiSave className="button-icon" />
              </button>
              <button 
                onClick={handleDeleteDiagram} 
                className="toolbar-button icon-button"
                title="Delete diagram"
              >
                <FiTrash2 className="button-icon" />
              </button>
            </div>
          </div>

          {erdError ? (
            <div className="error-message">
              <p>{erdError}</p>
            </div>
          ) : (
            <div className="main-content">
              <div className="editor-container" style={{ width: showEditor ? '40%' : '0%' }}>
                <Editor sql={sql} onSqlChange={setSql} />
              </div>
              <div className="flowchart-area">
                <ReactFlowProvider>
                  <FlowChart 
                    tables={tables} 
                    relationships={relationships} 
                    connectorsMode={connectorsMode}
                    onStateChange={(newTables, newRelationships) => {
                      // Add to history when user makes changes in the flowchart
                      if (JSON.stringify(tables) !== JSON.stringify(newTables) || 
                          JSON.stringify(relationships) !== JSON.stringify(newRelationships)) {
                        addToHistory(newTables, newRelationships);
                        setTables(newTables);
                        setRelationships(newRelationships);
                      }
                    }}
                  />
                </ReactFlowProvider>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
