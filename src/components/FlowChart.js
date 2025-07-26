import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Panel,
  MarkerType,
  ConnectionLineType,
  Handle
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

const FlowChart = ({ tables, relationships, connectorsMode }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [manualMode, setManualMode] = useState(false);
  const [suggestedConnections, setSuggestedConnections] = useState([]);
  const [selectedEdges, setSelectedEdges] = useState([]);
  const [initialized, setInitialized] = useState(false);

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
    
    // Only update nodes if this is the first render or if tables have changed
    if (!initialized) {
      // Preserve existing node positions when updating
      const existingNodes = {};
      nodes.forEach(node => {
        existingNodes[node.id] = node.position;
      });
      
      const newNodes = tables.map((table, index) => {
        // Use existing position if available, otherwise create new position
        let position;
        if (existingNodes[table.name]) {
          position = existingNodes[table.name];
        } else {
          const x = (index % 3) * 300 + 50; // 3 columns layout
          const y = Math.floor(index / 3) * 400 + 50; // 400px vertical spacing
          position = { x, y };
        }
        
        return {
          id: table.name,
          type: 'table',
          data: { label: table.name, columns: table.columns || [] },
          position: position,
          // Make nodes draggable
          draggable: true
        };
      });
      
      console.log('Setting nodes:', newNodes);
      setNodes(newNodes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, initialized]);

  // Create edges from relationships
  useEffect(() => {
    console.log('Creating edges from relationships:', relationships);
    
    if (!relationships || relationships.length === 0 || !nodes || nodes.length === 0) {
      // Don't clear edges, just return to preserve manually created edges
      return;
    }
    
    // Make sure we only create edges for nodes that exist
    const nodeIds = nodes.map(node => node.id);
    console.log('Available node IDs:', nodeIds);
    
    // Create edges with explicit handles
    const newEdges = [];
    
    // Keep track of existing edges to avoid duplicates
    const existingEdgeKeys = new Set();
    edges.forEach(edge => {
      existingEdgeKeys.add(`${edge.source}-${edge.target}`);
    });
    
    // Process relationships
    const processedRelationships = [...relationships];
    processedRelationships.forEach((rel, index) => {
      const sourceExists = nodeIds.includes(rel.sourceTable);
      const targetExists = nodeIds.includes(rel.targetTable);
      const edgeKey = `${rel.sourceTable}-${rel.targetTable}`;
      
      if (sourceExists && targetExists && !existingEdgeKeys.has(edgeKey)) {
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
          },
          data: { autoCreated: true }
        });
        existingEdgeKeys.add(edgeKey);
      } else if (!sourceExists || !targetExists) {
        console.warn(`Skipping edge: ${!sourceExists ? rel.sourceTable : ''} ${!targetExists ? rel.targetTable : ''} node not found`);
      }
    });
    
    // Preserve existing edges that weren't in the relationships
    const preservedEdges = edges.filter(edge => !edge.data?.autoCreated);
    
    console.log('Setting edges:', [...preservedEdges, ...newEdges]);
    setEdges([...preservedEdges, ...newEdges]);
    
    // After setting up initial edges, find and create additional connections based on common columns
    setTimeout(() => {
      findAndCreateConnections();
      setInitialized(true);
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationships, nodes]);

  // Debug output
  useEffect(() => {
    console.log('Current nodes:', nodes);
    console.log('Current edges:', edges);
  }, [nodes, edges]);
  
  // Handle connection events
  const onConnect = useCallback((params) => {
    // Create a new edge with arrow marker
    const newEdge = {
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#2563eb', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#2563eb'
      }
    };
    
    // Add a label to the edge
    if (params.source && params.target) {
      const sourceNode = nodes.find(node => node.id === params.source);
      const targetNode = nodes.find(node => node.id === params.target);
      
      if (sourceNode && targetNode) {
        // Find common columns between these tables
        const sourceTable = tables.find(t => t.name === sourceNode.id);
        const targetTable = tables.find(t => t.name === targetNode.id);
        
        if (sourceTable && targetTable) {
          const sourceColumns = sourceTable.columns.map(col => col.name.toLowerCase());
          const targetColumns = targetTable.columns.map(col => col.name.toLowerCase());
          const commonColumns = sourceColumns.filter(col => targetColumns.includes(col));
          
          if (commonColumns.length > 0) {
            newEdge.label = `${commonColumns[0]}`;
          } else {
            newEdge.label = `${sourceNode.id} → ${targetNode.id}`;
          }
        } else {
          newEdge.label = `${sourceNode.id} → ${targetNode.id}`;
        }
      }
    }
    
    console.log('Creating manual connection:', newEdge);
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Update suggested connections
    setSuggestedConnections(prev => 
      prev.filter(conn => 
        !(conn.sourceTable === params.source && conn.targetTable === params.target) &&
        !(conn.sourceTable === params.target && conn.targetTable === params.source)
      )
    );
  }, [nodes, setEdges, tables]);
  
  // Find and create connections based on common column names
  const findAndCreateConnections = useCallback(() => {
    if (!tables || tables.length < 2) return [];
    
    const newConnections = [];
    const createdEdges = [];
    
    // Compare each pair of tables
    for (let i = 0; i < tables.length; i++) {
      for (let j = 0; j < tables.length; j++) {
        if (i === j) continue; // Skip same table
        
        const sourceTable = tables[i];
        const targetTable = tables[j];
        
        // Check for foreign key relationships first
        const hasForeignKey = sourceTable.columns.some(col => {
          if (col.foreignKey && col.refTable === targetTable.name) {
            return true;
          }
          return false;
        });
        
        if (hasForeignKey) {
          // Find the foreign key column
          const fkColumn = sourceTable.columns.find(col => 
            col.foreignKey && col.refTable === targetTable.name
          );
          
          if (fkColumn) {
            // Check if this connection already exists
            const connectionExists = edges.some(edge => 
              edge.source === sourceTable.name && 
              edge.target === targetTable.name &&
              edge.sourceHandle === 'right' &&
              edge.targetHandle === 'left'
            );
            
            if (!connectionExists) {
              const newEdge = {
                id: `edge-fk-${sourceTable.name}-${targetTable.name}-${fkColumn.name}`,
                source: sourceTable.name,
                target: targetTable.name,
                sourceHandle: 'right',
                targetHandle: 'left',
                label: fkColumn.name,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#2563eb', strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#2563eb'
                },
                data: { autoCreated: true }
              };
              
              createdEdges.push(newEdge);
              continue;
            }
          }
        }
        
        // If no foreign key, check for common column names
        const columns1 = sourceTable.columns.map(col => col.name.toLowerCase());
        const columns2 = targetTable.columns.map(col => col.name.toLowerCase());
        
        // Find common columns
        const commonColumns = columns1.filter(col => columns2.includes(col));
        
        // If there are common columns, create a connection
        if (commonColumns.length > 0) {
          const commonCol = commonColumns[0]; // Use the first common column
          
          // Check if this connection already exists
          const connectionExists = edges.some(edge => 
            (edge.source === sourceTable.name && edge.target === targetTable.name) ||
            (edge.source === targetTable.name && edge.target === sourceTable.name)
          );
          
          if (!connectionExists) {
            newConnections.push({
              id: `potential-${sourceTable.name}-${targetTable.name}-${commonCol}`,
              sourceTable: sourceTable.name,
              targetTable: targetTable.name,
              commonColumn: commonCol
            });
          }
        }
      }
    }
    
    // Add all created edges
    if (createdEdges.length > 0) {
      setEdges(prev => [...prev, ...createdEdges]);
    }
    
    return newConnections;
  }, [tables, edges, setEdges]);
  
  // Update manual mode when connectorsMode prop changes
  useEffect(() => {
    setManualMode(connectorsMode);
    
    // Find potential connections when entering manual mode
    if (connectorsMode) {
      const potential = findAndCreateConnections();
      setSuggestedConnections(potential);
      console.log('Potential connections:', potential);
    } else {
      setSuggestedConnections([]);
    }
  }, [connectorsMode, findAndCreateConnections]);
  
  // Handle edge selection
  const onEdgeClick = useCallback((event, edge) => {
    if (!manualMode) return;
    
    event.stopPropagation();
    
    setSelectedEdges(prev => {
      if (prev.includes(edge.id)) {
        return prev.filter(id => id !== edge.id);
      } else {
        return [...prev, edge.id];
      }
    });
  }, [manualMode]);
  
  // Handle key press for deletion
  const onKeyDown = useCallback((event) => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdges.length > 0) {
      setEdges(edges => edges.filter(edge => !selectedEdges.includes(edge.id)));
      setSelectedEdges([]);
    }
  }, [selectedEdges, setEdges]);
  
  // Add event listener for key press
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {tables.length === 0 ? (
        <div className="no-data-message">No tables to display. Click Generate to create a flowchart.</div>
      ) : nodes.length === 0 ? (
        <div className="no-data-message">Processing diagram...</div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges.map(edge => ({
            ...edge,
            // Highlight selected edges
            style: {
              ...edge.style,
              stroke: selectedEdges.includes(edge.id) ? '#dc2626' : edge.style?.stroke || '#2563eb',
              strokeWidth: selectedEdges.includes(edge.id) ? 3 : edge.style?.strokeWidth || 2
            }
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
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
          connectionLineType={ConnectionLineType.SmoothStep}
          connectOnClick={manualMode}
        >
          <Background variant="dots" gap={20} size={1} color="#e5e7eb" />
          <Controls />
          {manualMode && (
            <Panel position="top-right">
              <div className="connection-instructions">
                <p>Click on a source node handle, then click on a target node handle to create a connection.</p>
                <p>To delete a connection: Click on it to select (turns red), then press Delete or Backspace.</p>
                {suggestedConnections.length > 0 && (
                  <div className="suggested-connections">
                    <h4>Suggested Connections:</h4>
                    <ul>
                      {suggestedConnections.map(conn => (
                        <li key={conn.id}>
                          {conn.sourceTable} ↔ {conn.targetTable} ({conn.commonColumn})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </ReactFlow>
      )}
    </div>
  );
};

export default FlowChart;