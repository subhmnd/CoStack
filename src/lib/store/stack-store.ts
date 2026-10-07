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
import { ParsedSoftwareItem, createSoftwareNodeData } from "@/lib/stack-parser";
import { generateStackSlug } from "@/lib/utils";

export interface StackCardData extends ParsedSoftwareItem {
  label: string;
}

export type StackNode = Node<StackCardData>;

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

  addSoftwareStack: (itemNames: string[]) => void;
  addSingleNode: (name: string, position?: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Partial<StackCardData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  clearStack: () => void;
  loadFromManifest: (manifest: any) => void;
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
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
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
    set({
      edges: addEdge(newEdge, get().edges),
    });
  },

  addSoftwareStack: (itemNames: string[]) => {
    if (!itemNames || itemNames.length === 0) return;

    const baseSlug = itemNames.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, "")).join("-");
    const newSlug = generateStackSlug(baseSlug);
    const newNodes: StackNode[] = [];
    const newEdges: Edge[] = [];

    const spacingX = 260;
    const spacingY = 0;
    const startX = Math.max(80, (window?.innerWidth || 1000) / 2 - (itemNames.length * spacingX) / 2);
    const startY = 240;

    itemNames.forEach((name, i) => {
      const nodeData = createSoftwareNodeData(name);
      const nodeId = `node-${nodeData.id}-${i}`;

      newNodes.push({
        id: nodeId,
        type: "stackCard",
        position: {
          x: startX + i * spacingX,
          y: startY + i * spacingY,
        },
        data: {
          ...nodeData,
          label: nodeData.name,
        },
      });

      // User relationship: Link sequential items (e.g., App ──► DB)
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

    set({
      slug: newSlug,
      stackName: itemNames.join(" + "),
      nodes: newNodes,
      edges: newEdges,
      searchQuery: "",
    });
  },

  addSingleNode: (name: string, position) => {
    const nodeData = createSoftwareNodeData(name);
    const nodeId = `node-${nodeData.id}-${Date.now()}`;
    const defaultPos = position || {
      x: 300 + Math.random() * 80,
      y: 200 + Math.random() * 80,
    };

    const newNode: StackNode = {
      id: nodeId,
      type: "stackCard",
      position: defaultPos,
      data: {
        ...nodeData,
        label: nodeData.name,
      },
    };

    set({
      nodes: [...get().nodes, newNode],
      searchQuery: "",
    });
  },

  updateNodeData: (id: string, updatedData: Partial<StackCardData>) => {
    set({
      nodes: get().nodes.map((node) => {
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
      }),
    });
  },

  deleteNode: (id: string) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
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

    set({
      nodes: [...get().nodes, duplicate],
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
    set({
      slug: manifest.slug || generateStackSlug(),
      stackName: manifest.name || "Loaded Stack",
      nodes: manifest.nodes || [],
      edges: manifest.edges || [],
      selectedNodeId: null,
    });
  },
}));
