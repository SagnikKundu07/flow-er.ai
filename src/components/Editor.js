import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { materialDark } from '@uiw/codemirror-theme-material';

const Editor = ({ value, onChange }) => {
  const handleChange = useCallback((val) => {
    onChange(val);
  }, [onChange]);

  return (
    <div className="editor-wrapper">
      <CodeMirror
        value={value}
        height="100%"
        theme={materialDark}
        extensions={[sql()]}
        onChange={handleChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          tabSize: 2,
          indentOnInput: true,
          syntaxHighlighting: true,
          foldGutter: true,
        }}
      />
    </div>
  );
};

export default Editor;