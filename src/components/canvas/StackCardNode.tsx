"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Copy, Trash2, Settings2 } from "lucide-react";
import { useStackStore, StackCardData } from "@/lib/store/stack-store";

export const StackCardNode = memo(({ id, data, selected }: NodeProps<StackCardData>) => {
  const { setSelectedNodeId, deleteNode, duplicateNode } = useStackStore();

  const statusColor =
    data.status === "Running" || data.status === "Healthy"
      ? "text-emerald-500 fill-emerald-500"
      : data.status === "Configured"
      ? "text-purple-500 fill-purple-500"
      : "text-zinc-400 fill-zinc-400";

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative group w-52 rounded-xl border bg-white p-3.5 shadow-sm transition-all dark:bg-black select-none cursor-pointer ${
        selected
          ? "border-purple-600 ring-2 ring-purple-600/20 shadow-md"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      {/* 4 Handles for universal user-controlled directional connections */}
      {/* TOP */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* RIGHT */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* BOTTOM */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* LEFT */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-2.5 !h-2.5 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* Card Header & Content */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
            {data.name}
          </div>
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            {data.version || "latest"}
          </div>
        </div>

        {/* Action icons on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            title="Duplicate node"
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            title="Delete node"
            className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Port & Runtime Details */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span className="font-mono">:{data.port || 80}</span>
        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-medium">
          {data.runtime || "Native"}
        </span>
      </div>

      {/* Status indicator */}
      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[11px] font-medium">{data.status || "Running"}</span>
      </div>
    </div>
  );
});

StackCardNode.displayName = "StackCardNode";
