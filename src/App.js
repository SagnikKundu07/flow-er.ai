import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { FiPlay, FiTrash2, FiCopy, FiRotateCw, FiCode, FiSave } from 'react-icons/fi';
import { BsDiagram3 } from "react-icons/bs";
import 'reactflow/dist/style.css';
import './App.css';
import Editor from './components/Editor';
import FlowChart from './components/FlowChart';
import { parseSQLToMermaid } from './utils/sqlParser';

function App() {
  const [sql, setSql] = useState('');
  const [tables, setTables] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [showEditor, setShowEditor] = useState(true);
  const [connectorsMode, setConnectorsMode] = useState(false);

  const handleSqlChange = (newSql) => {
    setSql(newSql);
  };

  const handleGenerate = () => {
    try {
      const result = parseSQLToMermaid(sql);
      setTables(result.tables);
      setRelationships(result.relationships);
      console.log('Generated tables:', result.tables);
      console.log('Generated relationships:', result.relationships);
    } catch (error) {
      console.error('Error generating diagram:', error);
      alert('Error generating diagram. Please check your SQL syntax.');
    }
  };

  const toggleConnectorsMode = () => {
    setConnectorsMode(!connectorsMode);
  };

  const handleReloadPage = () => {
    // Reset the state instead of reloading the page
    setSql('');
    setTables([]);
    setRelationships([]);
    
    // Clear any error states
    if (sessionStorage.getItem('attempted_reload')) {
      sessionStorage.removeItem('attempted_reload');
    }
    
    // Show success message
    console.log('Application state reset successfully');
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
  };

  const toggleQueryEditor = () => {
    setShowEditor(!showEditor);
  };

  return (
    <div className="app">
      <div className="main-content">
        <div className="editor-container" style={{ width: showEditor ? '40%' : '0%' }}>
          <Editor sql={sql} onSqlChange={handleSqlChange} />
        </div>
        <div className="flowchart-container">
          <div className="toolbar">
            <div className="toolbar-left">
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
                onClick={toggleConnectorsMode} 
                className={`toolbar-button ${connectorsMode ? 'active' : ''}`}
                title="Create or delete connections between tables"
              >
                <BsDiagram3 className="button-icon" />
                <span>Connectors</span>
              </button>
            </div>
            
            <div className="toolbar-right">
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
          <ReactFlowProvider>
            <FlowChart 
              tables={tables} 
              relationships={relationships} 
              connectorsMode={connectorsMode} 
            />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}

export default App;
