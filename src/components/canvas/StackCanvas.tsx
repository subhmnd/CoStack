"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useStackStore } from "@/lib/store/stack-store";
import { StackCardNode } from "./StackCardNode";
import { FloatingNodeEditor } from "./FloatingNodeEditor";
import { RulesOverlay } from "./RulesOverlay";
import { BottomSearchBar } from "./BottomSearchBar";
import { BashLinkBanner } from "./BashLinkBanner";

export function StackCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
  } = useStackStore();

  const nodeTypes = useMemo(
    () => ({
      stackCard: StackCardNode,
    }),
    []
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white dark:bg-black">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onPaneClick={() => setSelectedNodeId(null)}
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="currentColor"
          className="text-zinc-200 dark:text-zinc-800"
        />

        <Controls
          showInteractive={false}
          className="!bottom-24 !left-6 !rounded-xl !border !border-zinc-200 !bg-white/90 !shadow-sm dark:!border-zinc-800 dark:!bg-black/90 dark:!fill-white"
        />
      </ReactFlow>

      {/* Empty State Watermark: "Search to build a stack" */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-zinc-400 dark:text-zinc-600 tracking-tight">
            Search to build a stack
          </p>
        </div>
      )}

      {/* Rules Overlay */}
      <RulesOverlay />

      {/* Bash Slug & Copy Banner */}
      <BashLinkBanner />

      {/* Floating Node Property Editor */}
      <FloatingNodeEditor />

      {/* Fixed Bottom Search Bar */}
      <BottomSearchBar />
    </div>
  );
}
