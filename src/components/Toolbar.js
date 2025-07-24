import React from 'react';
import { FiPlay, FiTrash2, FiDownload, FiRotateCw } from 'react-icons/fi';
import './Toolbar.css';

const Toolbar = ({ onGenerate, onClear, onRefresh, onExport }) => {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button 
          className="toolbar-button generate-button"
          onClick={onGenerate}
          title="Generate Flowchart"
        >
          <FiPlay className="button-icon" />
          <span>Generate</span>
        </button>
        <button 
          className="toolbar-button"
          onClick={onRefresh}
          title="Refresh View"
        >
          <FiRotateCw className="button-icon" />
        </button>
      </div>
      <div className="toolbar-right">
        <button 
          className="toolbar-button"
          onClick={onClear}
          title="Clear Editor"
        >
          <FiTrash2 className="button-icon" />
        </button>
        <button 
          className="toolbar-button export-button"
          onClick={onExport}
          title="Export Diagram"
          disabled={!onExport}
        >
          <FiDownload className="button-icon" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;