"use client";
import React, { useMemo } from "react";
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
import { FileCode2, CheckCircle2, Code2, Sparkles, Layers } from "lucide-react";

export interface ImpactedFileItem {
  file_path: string;
  confidence: number;
  reasoning?: string;
  related_symbols: string[];
  related_tests: string[];
}

interface Props {
  requirementTitle?: string;
  impactedFiles: ImpactedFileItem[];
  rawNodes?: Array<{ id: string; label: string; impacted?: boolean }>;
  rawEdges?: Array<{ source: string; target: string }>;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 65;

function createLayoutFromImpactedFiles(
  requirementTitle: string,
  files: ImpactedFileItem[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 100 });

  const rawNodes: Array<{
    id: string;
    label: string;
    type: "req" | "file" | "symbol" | "test";
    confidence?: number;
    subtext?: string;
  }> = [];
  const rawEdges: Array<{ source: string; target: string; animated?: boolean; color?: string }> = [];

  // Root node: The Requirement
  const rootId = "root-requirement";
  rawNodes.push({
    id: rootId,
    label: requirementTitle || "Active Requirement",
    type: "req",
    subtext: "Requirement Scope",
  });
  g.setNode(rootId, { width: 240, height: 75 });

  files.forEach((file, fileIdx) => {
    const fileId = `file-${fileIdx}`;
    const fileName = file.file_path.split("/").pop() || file.file_path;
    const dirPath = file.file_path.includes("/") ? file.file_path.substring(0, file.file_path.lastIndexOf("/")) : "";

    rawNodes.push({
      id: fileId,
      label: fileName,
      subtext: dirPath || file.file_path,
      type: "file",
      confidence: file.confidence,
    });
    g.setNode(fileId, { width: NODE_WIDTH, height: NODE_HEIGHT });

    // Edge from Requirement -> File
    rawEdges.push({
      source: rootId,
      target: fileId,
      animated: true,
      color: file.confidence >= 0.6 ? "#e11d48" : "#f59e0b",
    });

    // Related Symbols (up to 3 per file)
    file.related_symbols.slice(0, 3).forEach((sym, symIdx) => {
      const symId = `sym-${fileIdx}-${symIdx}`;
      rawNodes.push({
        id: symId,
        label: `${sym}()`,
        subtext: "Symbol",
        type: "symbol",
      });
      g.setNode(symId, { width: 170, height: 48 });

      rawEdges.push({
        source: fileId,
        target: symId,
        animated: false,
        color: "#94a3b8",
      });
    });

    // Related Tests (up to 2 per file)
    file.related_tests.slice(0, 2).forEach((test, testIdx) => {
      const testId = `test-${fileIdx}-${testIdx}`;
      const testName = test.split("/").pop() || test;
      rawNodes.push({
        id: testId,
        label: testName,
        subtext: "Test Suite",
        type: "test",
      });
      g.setNode(testId, { width: 170, height: 48 });

      rawEdges.push({
        source: fileId,
        target: testId,
        animated: false,
        color: "#10b981",
      });
    });
  });

  rawEdges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const nodes: Node[] = rawNodes.map((n) => {
    const pos = g.node(n.id) || { x: 0, y: 0 };
    const isRoot = n.type === "req";
    const isFile = n.type === "file";
    const isSymbol = n.type === "symbol";
    const isTest = n.type === "test";

    let bg = "#ffffff";
    let border = "1px solid #e2e8f0";
    let text = "#1e293b";
    const width = isRoot ? 240 : isFile ? NODE_WIDTH : 170;
    const height = isRoot ? 75 : isFile ? NODE_HEIGHT : 48;

    if (isRoot) {
      bg = "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)";
      border = "1px solid #4338ca";
      text = "#ffffff";
    } else if (isFile) {
      const pct = Math.round((n.confidence ?? 0) * 100);
      if (pct >= 60) {
        bg = "#fff1f2";
        border = "1.5px solid #fecdd3";
        text = "#9f1239";
      } else {
        bg = "#fffbeb";
        border = "1.5px solid #fef3c7";
        text = "#92400e";
      }
    } else if (isSymbol) {
      bg = "#f8fafc";
      border = "1px solid #e2e8f0";
      text = "#334155";
    } else if (isTest) {
      bg = "#f0fdf4";
      border = "1px solid #bbf7d0";
      text = "#166534";
    }

    return {
      id: n.id,
      type: "default",
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
      data: {
        label: (
          <div className="flex flex-col text-left w-full overflow-hidden select-none">
            {isRoot && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-indigo-200 mb-0.5">
                <Sparkles className="w-3 h-3 text-indigo-300" />
                Requirement
              </div>
            )}
            {isFile && (
              <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                <span className="flex items-center gap-1 truncate text-slate-500 font-mono">
                  <FileCode2 className="w-3 h-3 text-slate-400 shrink-0" />
                  {n.subtext}
                </span>
                <span className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                  (n.confidence ?? 0) >= 0.6 ? "bg-rose-200/60 text-rose-800" : "bg-amber-200/60 text-amber-800"
                }`}>
                  {Math.round((n.confidence ?? 0) * 100)}%
                </span>
              </div>
            )}
            {isSymbol && (
              <div className="flex items-center gap-1 text-[9px] uppercase font-semibold text-slate-400">
                <Code2 className="w-2.5 h-2.5 text-slate-400" />
                Function / Symbol
              </div>
            )}
            {isTest && (
              <div className="flex items-center gap-1 text-[9px] uppercase font-semibold text-emerald-600">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                Test Suite
              </div>
            )}
            <div className={`font-semibold truncate text-xs ${isRoot ? "text-white font-serif text-sm" : isFile ? "font-mono font-bold" : "font-mono"}`}>
              {n.label}
            </div>
          </div>
        ),
      },
      style: {
        background: bg,
        border,
        color: text,
        borderRadius: isRoot ? "14px" : isFile ? "10px" : "8px",
        padding: isRoot ? "12px 14px" : isFile ? "8px 12px" : "6px 10px",
        boxShadow: isRoot
          ? "0 10px 25px -5px rgba(49, 46, 129, 0.3)"
          : "0 2px 8px -2px rgba(0,0,0,0.05)",
        width,
      },
    };
  });

  const edges: Edge[] = rawEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: e.animated,
    markerEnd: { type: MarkerType.ArrowClosed, color: e.color || "#94a3b8" },
    style: { stroke: e.color || "#94a3b8", strokeWidth: e.animated ? 2 : 1.5 },
  }));

  return { nodes, edges };
}

export function DependencyGraph({
  requirementTitle = "Requirement",
  impactedFiles,
}: Props) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return createLayoutFromImpactedFiles(requirementTitle, impactedFiles);
  }, [requirementTitle, impactedFiles]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (!impactedFiles || impactedFiles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-white/80 backdrop-blur-md p-12 text-center">
        <Layers className="w-10 h-10 text-muted mb-3" />
        <h4 className="text-base font-semibold font-serif text-foreground">No Dependency Graph Data</h4>
        <p className="text-sm text-muted mt-1 max-w-sm">No impacted files identified to construct graph.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl border border-border/50 bg-white/80 backdrop-blur-md shadow-sm overflow-hidden relative">
      {/* Floating Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md border border-border/60 rounded-xl px-4 py-2.5 flex items-center gap-5 text-xs shadow-md select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-900 border border-indigo-700" />
          <span className="font-medium text-foreground">Requirement</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
          <span className="font-medium text-foreground">High Impact File</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          <span className="font-medium text-foreground">Medium Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
          <span className="font-medium text-foreground">Symbol</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span className="font-medium text-foreground">Test Suite</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls
          showInteractive={false}
          className="bg-white/90 border border-border/60 shadow-sm rounded-xl overflow-hidden"
        />
        <MiniMap
          nodeColor={(n) => {
            const bg = (n.style?.background as string) || "";
            if (bg.includes("indigo") || bg.includes("1e1b4b")) return "#312e81";
            if (bg.includes("fff1f2") || bg.includes("red")) return "#f43f5e";
            if (bg.includes("fffbeb") || bg.includes("amber")) return "#f59e0b";
            if (bg.includes("f0fdf4") || bg.includes("emerald")) return "#10b981";
            return "#94a3b8";
          }}
          style={{
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        />
      </ReactFlow>
    </div>
  );
}
