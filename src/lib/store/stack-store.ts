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
  category?: string;
  hasConflict?: boolean;
  conflictReason?: string;
  status: "Running" | "Configured" | "Healthy" | "Idle" | string;
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
    versions?: string[];
    source: string;
    sourceUrl?: string;
    category?: string;
  }) => void;
  addSoftwareStack: (itemNames: string[]) => void;
  updateNodeData: (id: string, data: Partial<StackCardData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  clearStack: () => void;
  loadFromManifest: (manifest: any) => void;
}

/**
 * Helper to evaluate and flag conflicts across active nodes
 */
function flagNodeConflicts(nodes: StackNode[]): StackNode[] {
  // Generic conflict check for panels (cPanel, aaPanel, etc. all contain "panel" or have category "panel")
  const panelNodes = nodes.filter(
    (n) =>
      n.data.category === "panel" ||
      n.data.name.toLowerCase().includes("panel")
  );

  const hasMultiplePanels = panelNodes.length > 1;

  return nodes.map((node) => {
    const isPanel = panelNodes.some((p) => p.id === node.id);

    if (hasMultiplePanels && isPanel) {
      const otherPanelNames = panelNodes
        .filter((p) => p.id !== node.id)
        .map((p) => p.data.name)
        .join(", ");
      return {
        ...node,
        data: {
          ...node.data,
          hasConflict: true,
          conflictReason: `Conflicting control panel: cannot run alongside ${otherPanelNames}`,
        },
      };
    }

    return {
      ...node,
      data: {
        ...node.data,
        hasConflict: false,
        conflictReason: undefined,
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
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    // RULE: Exactly one connection = one relationship between the same two nodes!
    // Disallow multiple duplicate lines between node A and node B
    const alreadyConnected = get().edges.some(
      (e) =>
        (e.source === connection.source && e.target === connection.target) ||
        (e.source === connection.target && e.target === connection.source)
    );

    if (alreadyConnected) {
      // Do not allow multiple lines between the same 2 nodes
      return;
    }

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
        category: item.category || (slugId.includes("panel") ? "panel" : "application"),
        status: "Running",
      },
    };

    const newEdges = [...get().edges];
    // Automatically link to previous node ONLY if they do NOT conflict
    if (count > 0) {
      const prevNode = get().nodes[count - 1];
      const prevIsPanel = prevNode.data.category === "panel" || prevNode.data.name.toLowerCase().includes("panel");
      const newIsPanel = newNode.data.category === "panel" || newNode.data.name.toLowerCase().includes("panel");
      const isConflict = prevIsPanel && newIsPanel;

      if (!isConflict) {
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
    }

    const updatedNodes = flagNodeConflicts([...get().nodes, newNode]);

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
          category: slugId.includes("panel") ? "panel" : "application",
          status: "Running",
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

    const flaggedNodes = flagNodeConflicts(newNodes);

    set({
      slug: newSlug,
      stackName: itemNames.join(" + "),
      nodes: flaggedNodes,
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
      nodes: flagNodeConflicts(updated),
    });
  },

  deleteNode: (id: string) => {
    const remaining = get().nodes.filter((node) => node.id !== id);
    set({
      nodes: flagNodeConflicts(remaining),
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

    const updated = flagNodeConflicts([...get().nodes, duplicate]);

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
    set({
      slug: manifest.slug || generateStackSlug(),
      stackName: manifest.name || "Loaded Stack",
      nodes: flagNodeConflicts(manifest.nodes || []),
      edges: manifest.edges || [],
      selectedNodeId: null,
    });
  },
}));
