import React from 'react';
import AceEditor from 'react-ace';
import './Editor.css';

// Import ace modes and themes
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

const Editor = ({ sql, onSqlChange }) => {
  return (
    <div className="editor-wrapper">
      <div className="editor-header">
        <span className="editor-title">Query Editor</span>
      </div>
      <AceEditor
        mode="sql"
        theme="monokai"
        value={sql}
        onChange={onSqlChange}
        name="sql-editor"
        editorProps={{ $blockScrolling: true }}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          showGutter: true,
          highlightActiveLine: true,
          tabSize: 2,
        }}
        width="100%"
        height="calc(100% - 40px)"
        fontSize={14}
        showPrintMargin={false}
        placeholder="Start typing to get started.."
      />
    </div>
  );
};

export default Editor;