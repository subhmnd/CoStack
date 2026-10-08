import { create } from "zustand";
import {
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import { generateStackSlug } from "@/lib/utils";

export interface StackCardData extends Record<string, unknown> {
  id: string;
  name: string;
  label: string;
  version: string;
  versions: string[];
  source: string;
  sourceUrl?: string;
  command?: string;
  args?: string;
  inputs?: Record<string, string>;
  autoConfirm?: boolean;
  // Process hierarchy (auto-defined according to process graph)
  parentProcessName?: string;
  parentProcessId?: string;
  isRootProcess?: boolean;
  stepNumber?: number;
}

export type StackNode = Node<StackCardData, "stackCard">;

export interface StackStore {
  slug: string;
  stackName: string;
  nodes: StackNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  searchQuery: string;
  isSaving: boolean;
  copiedBash: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setStackName: (name: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setCopiedBash: (copied: boolean) => void;

  onNodesChange: OnNodesChange<StackNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addNodeFromSearch: (item: {
    name: string;
    version: string;
    versions?: string[];
    source: string;
    sourceUrl?: string;
    command?: string;
    args?: string;
    inputs?: Record<string, string>;
    autoConfirm?: boolean;
  }) => void;
  addSoftwareStack: (itemNames: string[]) => void;
  updateNodeData: (id: string, data: Partial<StackCardData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  clearStack: () => void;
  loadFromManifest: (manifest: any) => void;
}

/**
 * Automatically defines process hierarchy based on the process flow (DAG edges).
 * No hardcoded rules, categories, or conflicts.
 */
function syncProcessHierarchy(nodes: StackNode[], edges: Edge[]): StackNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const incomingMap = new Map<string, string>(); // target -> source

  for (const edge of edges) {
    incomingMap.set(edge.target, edge.source);
  }

  return nodes.map((node, index) => {
    const parentId = incomingMap.get(node.id);
    const parentNode = parentId ? nodeMap.get(parentId) : undefined;

    return {
      ...node,
      data: {
        ...node.data,
        isRootProcess: !parentNode,
        parentProcessId: parentId,
        parentProcessName: parentNode ? parentNode.data.name : undefined,
        stepNumber: index + 1,
      },
    };
  });
}

export const useStackStore = create<StackStore>((set, get) => ({
  slug: generateStackSlug(),
  stackName: "My Stack",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  searchQuery: "",
  isSaving: false,
  copiedBash: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStackName: (name) => set({ stackName: name }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setCopiedBash: (copied) => set({ copiedBash: copied }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    const newEdges = applyEdgeChanges(changes, get().edges);
    const updatedNodes = syncProcessHierarchy(get().nodes, newEdges);
    set({
      edges: newEdges,
      nodes: updatedNodes,
    });
  },

  onConnect: (connection: Connection) => {
    // Exactly one connection between two nodes
    const alreadyConnected = get().edges.some(
      (e) =>
        (e.source === connection.source && e.target === connection.target) ||
        (e.source === connection.target && e.target === connection.source)
    );

    if (alreadyConnected) return;

    const newEdge: Edge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: "#7c3aed",
      },
      style: {
        strokeWidth: 2,
        stroke: "#7c3aed",
      },
    };

    const newEdges = addEdge(newEdge, get().edges);
    const updatedNodes = syncProcessHierarchy(get().nodes, newEdges);

    set({
      edges: newEdges,
      nodes: updatedNodes,
    });
  },

  addNodeFromSearch: (item) => {
    const slugId = item.name.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const nodeId = `node-${slugId}-${Date.now()}`;
    const count = get().nodes.length;
    const spacingX = 260;
    const startX = 240 + count * spacingX;
    const startY = 220;

    const availableVersions =
      item.versions && item.versions.length > 0
        ? item.versions
        : [item.version || "latest"];

    const newNode: StackNode = {
      id: nodeId,
      type: "stackCard",
      position: { x: startX, y: startY },
      data: {
        id: slugId,
        name: item.name,
        label: item.name,
        version: item.version || availableVersions[0] || "latest",
        versions: availableVersions,
        source: item.source || "",
        sourceUrl: item.sourceUrl || "",
        command: item.command || "",
        args: item.args || "",
        inputs: item.inputs || {},
        autoConfirm: item.autoConfirm !== false,
      },
    };

    const newEdges = [...get().edges];
    // Automatically link to previous process node in the pipeline
    if (count > 0) {
      const prevNode = get().nodes[count - 1];
      newEdges.push({
        id: `edge-${prevNode.id}-${nodeId}`,
        source: prevNode.id,
        target: nodeId,
        sourceHandle: "right",
        targetHandle: "left",
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: "#7c3aed",
        },
        style: {
          strokeWidth: 2,
          stroke: "#7c3aed",
        },
      });
    }

    const updatedNodes = syncProcessHierarchy([...get().nodes, newNode], newEdges);

    set({
      nodes: updatedNodes,
      edges: newEdges,
      searchQuery: "",
    });
  },

  addSoftwareStack: (itemNames: string[]) => {
    if (!itemNames || itemNames.length === 0) return;

    const baseSlug = itemNames.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, "")).join("-");
    const newSlug = generateStackSlug(baseSlug);
    const newNodes: StackNode[] = [];
    const newEdges: Edge[] = [];

    const spacingX = 260;
    const startX = Math.max(
      80,
      (typeof window !== "undefined" ? window.innerWidth : 1000) / 2 - (itemNames.length * spacingX) / 2
    );
    const startY = 240;

    itemNames.forEach((name, i) => {
      const cleanName = name.trim();
      const slugId = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const nodeId = `node-${slugId}-${i}`;

      newNodes.push({
        id: nodeId,
        type: "stackCard",
        position: {
          x: startX + i * spacingX,
          y: startY,
        },
        data: {
          id: slugId,
          name: cleanName,
          label: cleanName,
          version: "latest",
          versions: ["latest"],
          source: `${slugId}.com`,
          sourceUrl: "",
          command: "",
          args: "",
          inputs: {},
          autoConfirm: true,
        },
      });

      if (i > 0) {
        const prevNodeId = newNodes[i - 1].id;
        newEdges.push({
          id: `edge-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
          sourceHandle: "right",
          targetHandle: "left",
          type: "smoothstep",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: "#7c3aed",
          },
          style: {
            strokeWidth: 2,
            stroke: "#7c3aed",
          },
        });
      }
    });

    const syncedNodes = syncProcessHierarchy(newNodes, newEdges);

    set({
      slug: newSlug,
      stackName: itemNames.join(" + "),
      nodes: syncedNodes,
      edges: newEdges,
      searchQuery: "",
    });
  },

  updateNodeData: (id: string, updatedData: Partial<StackCardData>) => {
    const updated = get().nodes.map((node) => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            ...updatedData,
            label: updatedData.name || node.data.name,
          },
        };
      }
      return node;
    });

    set({
      nodes: syncProcessHierarchy(updated, get().edges),
    });
  },

  deleteNode: (id: string) => {
    const remaining = get().nodes.filter((node) => node.id !== id);
    const remainingEdges = get().edges.filter((edge) => edge.source !== id && edge.target !== id);

    set({
      nodes: syncProcessHierarchy(remaining, remainingEdges),
      edges: remainingEdges,
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  duplicateNode: (id: string) => {
    const existing = get().nodes.find((n) => n.id === id);
    if (!existing) return;

    const newId = `node-${existing.data.id}-${Date.now()}`;
    const duplicate: StackNode = {
      ...existing,
      id: newId,
      position: {
        x: existing.position.x + 40,
        y: existing.position.y + 40,
      },
      data: {
        ...existing.data,
        name: `${existing.data.name} (Copy)`,
        label: `${existing.data.name} (Copy)`,
      },
    };

    const updated = syncProcessHierarchy([...get().nodes, duplicate], get().edges);

    set({
      nodes: updated,
      selectedNodeId: newId,
    });
  },

  clearStack: () => {
    set({
      slug: generateStackSlug(),
      stackName: "My Stack",
      nodes: [],
      edges: [],
      selectedNodeId: null,
      searchQuery: "",
    });
  },

  loadFromManifest: (manifest: any) => {
    if (!manifest) return;
    const rawNodes = manifest.nodes || [];
    const rawEdges = manifest.edges || [];
    set({
      slug: manifest.slug || generateStackSlug(),
      stackName: manifest.name || "Loaded Stack",
      nodes: syncProcessHierarchy(rawNodes, rawEdges),
      edges: rawEdges,
      selectedNodeId: null,
    });
  },
}));
