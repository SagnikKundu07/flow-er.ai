import React from 'react';
import './SelectionPage.css';

const SelectionPage = ({ onSelectOption }) => {
  return (
    <div className="selection-container">
      <div className="selection-header">
        <h2>Choose an option</h2>
        <p>Select what you would like to do with your imported database</p>
      </div>
      
      <div className="selection-options">
        <button 
          className="option-button validator-button"
          onClick={() => onSelectOption('validator')}
        >
          Table Validator
        </button>
        
        <button 
          className="option-button generator-button"
          onClick={() => onSelectOption('generator')}
        >
          Data lineage/ERD generator
        </button>
      </div>
    </div>
  );
};

export default SelectionPage;
