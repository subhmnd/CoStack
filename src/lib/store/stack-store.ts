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
  source: string;
  sourceUrl?: string;
  status: "Running" | "Configured" | "Healthy" | "Idle";
  port?: number;
  runtime?: "Native" | "Container" | "Binary";
  env?: Record<string, string>;
  command?: string;
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
    source: string;
    sourceUrl?: string;
  }) => void;
  addSoftwareStack: (itemNames: string[]) => void;
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

  addNodeFromSearch: (item) => {
    const slugId = item.name.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const nodeId = `node-${slugId}-${Date.now()}`;
    const count = get().nodes.length;
    const spacingX = 260;
    const startX = 240 + count * spacingX;
    const startY = 220;

    const newNode: StackNode = {
      id: nodeId,
      type: "stackCard",
      position: { x: startX, y: startY },
      data: {
        id: slugId,
        name: item.name,
        label: item.name,
        version: item.version || "latest",
        source: item.source || "",
        sourceUrl: item.sourceUrl || "",
        status: "Running",
        port: 80,
        runtime: "Native",
        env: {},
      },
    };

    const newEdges = [...get().edges];
    // Connect to previous node if available
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

    set({
      nodes: [...get().nodes, newNode],
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
          source: `${slugId}.org`,
          sourceUrl: "",
          status: "Running",
          port: 80,
          runtime: "Native",
          env: {},
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

    set({
      slug: newSlug,
      stackName: itemNames.join(" + "),
      nodes: newNodes,
      edges: newEdges,
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
