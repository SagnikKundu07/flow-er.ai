import React, { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import Editor from './components/Editor';
import FlowChart from './components/FlowChart';
import Toolbar from './components/Toolbar';
import { parseSQLToMermaid } from './utils/sqlParser';

function App() {
  const [sql, setSql] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [tables, setTables] = useState([]);
  const [relationships, setRelationships] = useState([]);

  const handleSqlChange = (newSql) => {
    setSql(newSql);
  };

  const generateFlowChart = useCallback(() => {
    console.log('Generating flowchart from SQL:', sql);
    try {
      const result = parseSQLToMermaid(sql);
      console.log('Parser result:', result);
      setMermaidCode(result.mermaidCode);
      setTables(result.tables);
      setRelationships(result.relationships);
      console.log('Updated state with tables and relationships');
    } catch (error) {
      console.error('Error parsing SQL:', error);
      alert('Error parsing SQL. Please check your SQL syntax.');
    }
  }, [sql]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>SQL Flowchart Generator</h1>
      </header>
      <Toolbar onGenerate={generateFlowChart} />
      <div className="main-content">
        <div className="editor-container">
          <h2>SQL Editor</h2>
          <Editor value={sql} onChange={handleSqlChange} />
        </div>
        <div className="flowchart-container">
          <h2>Flowchart</h2>
          <ReactFlowProvider>
            <FlowChart mermaidCode={mermaidCode} tables={tables} relationships={relationships} />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}

export default App;
