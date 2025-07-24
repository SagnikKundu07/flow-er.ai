import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './FlowChart.css';

// Enhanced component for displaying table nodes with handles
const TableNode = ({ data }) => {
  return (
    <div className="table-node">
      {/* Add explicit handles for connections */}
      <Handle
        type="source"
        position="right"
        id="right"
        style={{ background: '#2563eb', width: '10px', height: '10px' }}
      />
      <Handle
        type="target"
        position="left"
        id="left"
        style={{ background: '#2563eb', width: '10px', height: '10px' }}
      />
      
      <div className="table-header">
        <strong>{data.label}</strong>
      </div>
      <div className="table-columns">
        {data.columns && data.columns.map((col, idx) => (
          <div key={idx} className="table-column">
            <span className="column-name">
              {col.name}
              {col.primaryKey && <span className="pk-badge">PK</span>}
              {col.foreignKey && <span className="fk-badge">FK</span>}
            </span>
            <span className="column-type">{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FlowChart = ({ tables = [], relationships = [] }) => {
  console.log('FlowChart render with:', { tables, relationships });
  
  // Create nodes state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Node types
  const nodeTypes = useMemo(() => ({
    table: TableNode
  }), []);

  // Create nodes from tables
  useEffect(() => {
    console.log('Creating nodes from tables:', tables);
    
    if (!tables || tables.length === 0) {
      setNodes([]);
      return;
    }
    
    const newNodes = tables.map((table, index) => {
      const x = (index % 3) * 300 + 50; // 3 columns layout
      const y = Math.floor(index / 3) * 400 + 50; // 400px vertical spacing
      
      return {
        id: table.name,
        type: 'table',
        data: { label: table.name, columns: table.columns || [] },
        position: { x, y }
      };
    });
    
    console.log('Setting nodes:', newNodes);
    setNodes(newNodes);
  }, [tables, setNodes]);

  // Create edges from relationships
  useEffect(() => {
    console.log('Creating edges from relationships:', relationships);
    
    if (!relationships || relationships.length === 0 || !nodes || nodes.length === 0) {
      setEdges([]);
      return;
    }
    
    // Force refresh relationships array to ensure it's processed
    const processedRelationships = [...relationships];
    console.log('Processing relationships:', processedRelationships);
    
    // Make sure we only create edges for nodes that exist
    const nodeIds = nodes.map(node => node.id);
    console.log('Available node IDs:', nodeIds);
    
    // Create edges with explicit handles
    const newEdges = [];
    
    processedRelationships.forEach((rel, index) => {
      const sourceExists = nodeIds.includes(rel.sourceTable);
      const targetExists = nodeIds.includes(rel.targetTable);
      
      if (sourceExists && targetExists) {
        console.log(`Creating edge from ${rel.sourceTable} to ${rel.targetTable}`);
        newEdges.push({
          id: `edge-${index}`,
          source: rel.sourceTable,
          target: rel.targetTable,
          sourceHandle: 'right',  // Match the handle ID in TableNode
          targetHandle: 'left',   // Match the handle ID in TableNode
          label: `${rel.sourceColumn} → ${rel.targetColumn}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#2563eb', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#2563eb'
          }
        });
      } else {
        console.warn(`Skipping edge: ${!sourceExists ? rel.sourceTable : ''} ${!targetExists ? rel.targetTable : ''} node not found`);
      }
    });
    
    console.log('Setting edges:', newEdges);
    setEdges(newEdges);
  }, [relationships, nodes, setEdges]);



  // Debug output
  useEffect(() => {
    console.log('Current nodes:', nodes);
    console.log('Current edges:', edges);
  }, [nodes, edges]);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      {tables.length === 0 ? (
        <div className="no-data-message">No tables to display. Click Generate to create a flowchart.</div>
      ) : nodes.length === 0 ? (
        <div className="no-data-message">Processing diagram...</div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#2563eb', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#2563eb'
            }
          }}
          connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2 }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      )}
    </div>
  );
};

export default FlowChart;