import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
} from '@xyflow/react';
import type { Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { EngineeringNodeComponent } from './components/EngineeringNode';
import { CADViewer } from './components/CADViewer';
import { Cpu, Plus, ShoppingBag, Sliders, Trash2, Layers, Download, Upload, Edit3 } from 'lucide-react';

const nodeTypes = {
  engineeringNode: EngineeringNodeComponent,
};

import type {
  ProjectFile,
  EngineeringNodeData,
  EngineeringNode,
  Part,
  SketchStroke,
  CADPart
} from './types/project';
import calculatePrintCost from './utils/printCost';
import useProject from './hooks/useProject';
import { Sketchpad } from './components/Sketchpad';


function getPrintCost(cadAsset: CADPart | undefined): number {
  if (!cadAsset) return 0;

  return calculatePrintCost(
    cadAsset.calculatedVolumeCM3,
    cadAsset.filamentDensity,
    cadAsset.infillPercent,
    cadAsset.waste,
    cadAsset.pricePerGram
  );
}

export default function App() {
  const {
    project,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    loadProject,
  } = useProject();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSketchOpen, setIsSketchOpen] = useState(false);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onNodeClick = (_: React.MouseEvent, node: { id: string }) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const onEdgeDoubleClick = (_: React.MouseEvent, edge: any) => {
    const newLabel = prompt("Enter new connection label (e.g. 'Bolts onto', 'Connects via'):", edge.label || '');
    if (newLabel !== null) {
      setEdges((eds) =>
        eds.map((ed) => {
          if (ed.id === edge.id) {
            return { ...ed, label: newLabel };
          }
          return ed;
        })
      );
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleCreateNode = () => {
    const newId = `node-${Date.now()}`;
    const newNode: EngineeringNode = {
      id: newId,
      type: 'engineeringNode',
      position: { x: 250 + Math.random() * 100, y: 250 + Math.random() * 100 },
      data: {
        title: 'New Subsystem',
        notes: '',
        cadAsset: {
          calculatedVolumeCM3: 50.0,
          filamentDensity: project.defaults.filamentDensity,
          infillPercent: 20,
          waste: project.defaults.waste,
          pricePerGram: project.defaults.pricePerGram,
        },
        parts: [],
        media: [],
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
  };

  // --- EDITOR HANDLERS ---
  const updateSelectedNodeData = (updates: Partial<EngineeringNodeData>) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updates,
            },
          };
        }
        return node;
      })
    );
  };

  const handleUpdateCADField = (field: string, value: number) => {
    if (!selectedNode || !selectedNode.data.cadAsset) return;
    const cad = { ...selectedNode.data.cadAsset, [field]: value };
    updateSelectedNodeData({ cadAsset: cad });
  };

  const handleAddPart = () => {
    if (!selectedNode) return;
    const currentParts = selectedNode.data.parts || [];
    const newPart: Part = {
      id: 'part-' + Date.now(),
      name: 'New Component',
      unit: 'piece',
      unitPrice: 0.00,
      quantity: 1,
    };
    updateSelectedNodeData({ parts: [...currentParts, newPart] });
  };

  const handleUpdatePart = (partId: string, field: keyof Part, value: string | number) => {
    if (!selectedNode) return;
    const currentParts = selectedNode.data.parts || [];
    const updatedParts = currentParts.map(p => {
      if (p.id === partId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    updateSelectedNodeData({ parts: updatedParts });
  };

  const handleDeletePart = (partId: string) => {
    if (!selectedNode) return;
    const currentParts = selectedNode.data.parts || [];
    updateSelectedNodeData({ parts: currentParts.filter(p => p.id !== partId) });
  };

  // --- EXAMPLE PROJECTS ---
  const handleLoadExample = async () => {
    try {
      const manifestResponse = await fetch('/examples/manifest.json');
      if (!manifestResponse.ok) throw new Error('Could not load example manifest.');
      const manifest = await manifestResponse.json();
      const firstExample = manifest.projects?.[0];
      if (!firstExample?.project) throw new Error('No example projects are listed in the manifest.');
      const projectResponse = await fetch(firstExample.project);
      if (!projectResponse.ok) throw new Error('Could not load the example project file.');
      const exampleProject = await projectResponse.json() as ProjectFile;
      loadProject(exampleProject);
      setSelectedNodeId(null);
    } catch (err) {
      console.error('Example project load failed:', err);
      alert(err instanceof Error ? err.message : 'Could not load example project.');
    }
  };

  // --- SAVE & LOAD PROJECT (.JSON) ---
  const handleSaveProject = () => {
    const fullProject: ProjectFile = {
      ...project,
      lastModified: new Date().toISOString(),
      nodes: nodes,
      edges: edges,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullProject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.projectName.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as ProjectFile;
          loadProject(parsed);
          setSelectedNodeId(null);
        } catch (err) {
          alert("Invalid project JSON file.");
        }
      };
    }
  };

  const saveSketchToNode = (strokes: SketchStroke[]) => {
    if (!selectedNode) return;

    const mediaItem = {
      id: 'sketch-' + Date.now(),
      type: 'sketch' as const,
      strokes,
      caption: 'Quick mechanical sketch',
    };

    const currentMedia = selectedNode.data.media || [];
    updateSelectedNodeData({ media: [...currentMedia, mediaItem] });
    setIsSketchOpen(false);
  };

  const totalBOMCost = nodes.reduce((sum, node) => {
    const partsSum = (node.data.parts || []).reduce((pSum, part) => pSum + (part.unitPrice * part.quantity), 0);
    const printCost = getPrintCost(node.data.cadAsset);
    return sum + partsSum + printCost;
  }, 0);

  return (
    <div className="flex flex-row w-full h-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans relative">

      {/* LEFT: Infinite Blueprint Canvas */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{
            style: { stroke: '#38bdf8', strokeWidth: 2 },
            labelStyle: { fill: '#a1a1aa', fontWeight: 500, fontSize: 11 },
            labelBgStyle: { fill: '#09090b', fillOpacity: 0.8 },
            zIndex: -1,
          }}
          fitView
        >
          <Background color="#27272a" gap={24} size={1} />
          <Controls className="!bg-zinc-900 !border-zinc-800 !text-zinc-100 !rounded-lg" />
          <MiniMap
            className="!bg-zinc-900 !border-zinc-800 !rounded-lg"
            nodeColor="#38bdf8"
            maskColor="rgba(9, 9, 11, 0.7)"
          />
        </ReactFlow>
      </div>

      {/* RIGHT: Dynamic Sidebar */}
      <div className="w-96 shrink-0 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 className="font-bold text-sm tracking-wide truncate max-w-[160px]">{project.projectName}</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {selectedNodeId ? 'Editor' : 'Basket'}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedNodeId || !selectedNode ? (
            /* --- BASKET MODE --- */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Bill of Materials
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Total: ${totalBOMCost.toFixed(2)}
                </span>
              </div>

              <p className="text-xs text-zinc-400">
                Aggregated components and 3D print costs across all nodes. Click any item to jump to its node.
              </p>

              <div className="space-y-2 mt-4">
                {nodes.map(n => {
                  const nodeParts = n.data.parts || [];
                  const printCost = getPrintCost(n.data.cadAsset);
                  return (
                    <React.Fragment key={n.id}>
                      {printCost > 0 && (
                        <div
                          onClick={() => setSelectedNodeId(n.id)}
                          className="p-2.5 rounded bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-medium text-cyan-300">3D Print: {n.data.title}</div>
                            <div className="text-[10px] text-zinc-500">Volume: {n.data.cadAsset?.calculatedVolumeCM3} cm³</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-cyan-400">${printCost.toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-500">{n.data.cadAsset?.infillPercent}% infill</div>
                          </div>
                        </div>
                      )}
                      {nodeParts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedNodeId(n.id)}
                          className="p-2.5 rounded bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-medium text-zinc-200">{p.name}</div>
                            <div className="text-[10px] text-zinc-500">Node: {n.data.title}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-cyan-400">${(p.unitPrice * p.quantity).toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-500">Qty: {p.quantity}</div>
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ) : (
            /* --- EDITOR MODE --- */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" /> Node Properties
                </h3>
                <span className="text-[10px] font-mono text-zinc-500">{selectedNode.id}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Node Title</label>
                <input
                  type="text"
                  value={selectedNode.data.title}
                  onChange={(e) => updateSelectedNodeData({ title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Engineering Notes</label>
                <textarea
                  rows={3}
                  value={selectedNode.data.notes}
                  onChange={(e) => updateSelectedNodeData({ notes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* CAD Asset Section */}
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                  <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-cyan-400" /> CAD File & Print Cost</span>
                  <span className="font-mono text-cyan-400 font-bold">${getPrintCost(selectedNode.data.cadAsset).toFixed(2)}</span>
                </div>

                {/* --- PASSING NODE ID TO CACHE CAD FILES LOCALLY --- */}
                <CADViewer
                  nodeId={selectedNode.id}
                />

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Volume (cm³)</span>
                    <input
                      type="number"
                      value={selectedNode.data.cadAsset?.calculatedVolumeCM3 || 0}
                      onChange={(e) => handleUpdateCADField('calculatedVolumeCM3', parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 font-mono text-zinc-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Infill (%)</span>
                    <input
                      type="number"
                      value={selectedNode.data.cadAsset?.infillPercent || 20}
                      onChange={(e) => handleUpdateCADField('infillPercent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 font-mono text-zinc-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Sketch Tool Trigger */}
              <div className="pt-2">
                <button
                  onClick={() => setIsSketchOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-cyan-300 font-medium transition-colors cursor-pointer border border-zinc-700"
                >
                  <Edit3 className="w-4 h-4" /> Open Quick Sketchpad ({selectedNode.data.media?.length || 0})
                </button>
              </div>

              {/* Node Parts / Components Section */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Purchased Parts / BOM</label>
                  <button
                    onClick={handleAddPart}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/40 border border-cyan-800/50 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Part
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(selectedNode.data.parts || []).map((part) => (
                    <div key={part.id} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={part.name}
                          onChange={(e) => handleUpdatePart(part.id, 'name', e.target.value)}
                          placeholder="Part name"
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          onClick={() => handleDeletePart(part.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Unit Price ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={part.unitPrice}
                            onChange={(e) => handleUpdatePart(part.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Quantity</span>
                          <input
                            type="number"
                            value={part.quantity}
                            onChange={(e) => handleUpdatePart(part.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedNode.data.parts || selectedNode.data.parts.length === 0) && (
                    <div className="text-center py-3 text-xs text-zinc-600 italic border border-dashed border-zinc-800 rounded">
                      No parts added yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer with Save/Load & Add Node */}
        <div className="p-3 border-t border-zinc-800 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleLoadExample}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer border border-zinc-700"
            >
              <Layers className="w-3.5 h-3.5" /> Example
            </button>
            <button
              onClick={handleSaveProject}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer border border-zinc-700"
            >
              <Download className="w-3.5 h-3.5" /> Save JSON
            </button>
            <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer border border-zinc-700">
              <Upload className="w-3.5 h-3.5" /> Load JSON
              <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
            </label>
          </div>
          <button
            onClick={handleCreateNode}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Node to Blueprint
          </button>
        </div>
      </div>
      <div>
        {isSketchOpen && selectedNode && (
          <Sketchpad
            title={selectedNode.data.title}
            onSave={saveSketchToNode}
            onClose={() => setIsSketchOpen(false)}
          />
        )}
      </div>
    </div>
  );
}