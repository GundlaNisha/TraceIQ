"use client";
import { useEffect } from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

interface GraphNode {
  id: string;
  label: string;
  impacted: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;

function buildLayout(
  rawNodes: GraphNode[],
  rawEdges: GraphEdge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 80 });

  rawNodes.forEach((n) =>
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }),
  );
  rawEdges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const nodes: Node[] = rawNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "default",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { label: n.label },
      style: {
        background: n.impacted ? "#FEF2F2" : "#F9FAFB",
        border: n.impacted ? "1.5px solid #F87171" : "1px solid #E5E7EB",
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "monospace",
        color: n.impacted ? "#991B1B" : "#374151",
        width: NODE_WIDTH,
        padding: "8px 10px",
      },
    };
  });

  const edges: Edge[] = rawEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94A3B8" },
    style: { stroke: "#94A3B8", strokeWidth: 1.5 },
  }));

  return { nodes, edges };
}

export function DependencyGraph({ nodes: rawNodes, edges: rawEdges }: Props) {
  const { nodes: layoutNodes, edges: layoutEdges } = buildLayout(
    rawNodes,
    rawEdges,
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    const { nodes: ln, edges: le } = buildLayout(rawNodes, rawEdges);
    setNodes(ln);
    setEdges(le);
  }, [rawNodes, rawEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full rounded-lg border bg-white overflow-hidden relative">
      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white border rounded-lg px-3 py-2 flex gap-4 text-xs shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-red-400 bg-red-50" />
          <span className="text-gray-600">Impacted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-gray-300 bg-gray-50" />
          <span className="text-gray-600">Not impacted</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="#F1F5F9" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => (n.style?.background as string) ?? "#fff"}
          style={{ background: "#F8FAFC" }}
        />
      </ReactFlow>
    </div>
  );
}
