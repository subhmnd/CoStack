"use client";

import React from "react";
import { X, Trash2, Copy, Terminal, AlertTriangle } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";

export function FloatingNodeEditor() {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNodeData, deleteNode, duplicateNode } =
    useStackStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) return null;

  const data = selectedNode.data;
  const versionList = Array.from(
    new Set([data.version, ...(data.versions || []), "latest", "stable", "lts"].filter(Boolean) as string[])
  );

  return (
    <div className="absolute top-20 right-6 z-40 w-80 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-black/95 transition-all animate-in fade-in zoom-in-95">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Node Configuration
          </span>
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Conflict Warning Banner if active */}
      {data.hasConflict && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <span>Conflict Detected</span>
          </div>
          <p className="mt-1 text-[10px] text-red-600/90 dark:text-red-400">
            {data.conflictReason || "This service conflicts with another service in your stack."}
          </p>
        </div>
      )}

      <div className="mt-3.5 space-y-3.5 text-xs">
        {/* Name */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 mb-1">
            Service Name
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateNodeData(selectedNode.id, { name: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-medium text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Version Editable Input & Source */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">
              Version
            </label>
            <input
              type="text"
              list={`versions-${selectedNode.id}`}
              value={data.version || ""}
              placeholder="e.g. latest, 24.0"
              onChange={(e) => updateNodeData(selectedNode.id, { version: e.target.value })}
              className="w-full rounded-lg border border-purple-500/40 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <datalist id={`versions-${selectedNode.id}`}>
              {versionList.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            {/* Quick Version Chips */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {["latest", "stable", "lts"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateNodeData(selectedNode.id, { version: preset })}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    data.version === preset
                      ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 font-semibold"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">
              Source
            </label>
            <input
              type="text"
              value={data.source || ""}
              placeholder="e.g. domain.com"
              onChange={(e) => updateNodeData(selectedNode.id, { source: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Custom Shell Command */}
        <div>
          <label className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 mb-1">
            <Terminal className="h-3 w-3" /> Custom Install Command (Optional)
          </label>
          <textarea
            rows={2}
            value={data.command || ""}
            placeholder="e.g. curl -fsSL ... | sh"
            onChange={(e) => updateNodeData(selectedNode.id, { command: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-[11px] text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
        <button
          onClick={() => duplicateNode(selectedNode.id)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
        >
          <Copy className="h-3 w-3" /> Duplicate
        </button>
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}
