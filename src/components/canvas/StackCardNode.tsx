"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Copy, Trash2, Globe } from "lucide-react";
import { useStackStore, StackNode } from "@/lib/store/stack-store";

export const StackCardNode = memo(({ id, data, selected }: NodeProps<StackNode>) => {
  const { setSelectedNodeId, deleteNode, duplicateNode } = useStackStore();

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative group w-52 rounded-xl border bg-white p-3.5 shadow-sm transition-all dark:bg-black select-none cursor-pointer ${
        data.hasConflict
          ? "border-red-500 ring-2 ring-red-500/30 bg-red-500/[0.04] shadow-md shadow-red-500/10"
          : selected
          ? "border-purple-600 ring-2 ring-purple-600/20 shadow-md"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      {/* 4 Handles for universal directional connections */}
      {/* TOP */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* RIGHT */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* BOTTOM */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* LEFT */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-2 !h-2 !bg-zinc-800 dark:!bg-zinc-200 !border-2 !border-white dark:!border-black transition-transform hover:!scale-125 hover:!bg-purple-600"
      />

      {/* Card Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-sm tracking-tight text-zinc-950 dark:text-zinc-50">
            {data.name}
          </div>
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
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

      {/* Source & Status - Clean, Minimal */}
      <div className="mt-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
        {data.source ? (
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[120px]">
            <Globe className="h-3 w-3 text-zinc-400 flex-shrink-0" />
            <span className="truncate">{data.source}</span>
          </div>
        ) : (
          <span />
        )}

        {data.hasConflict ? (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            <span>⚠ Conflict</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>{data.status || "Running"}</span>
          </div>
        )}
      </div>

      {/* Visible conflict alert below status */}
      {data.hasConflict && (
        <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded border border-red-200 dark:border-red-800 leading-tight">
          {data.conflictReason || "Conflict: Incompatible with existing services"}
        </div>
      )}
    </div>
  );
});

StackCardNode.displayName = "StackCardNode";
