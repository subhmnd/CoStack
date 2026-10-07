"use client";

import React, { useState } from "react";
import { X, Trash2, Copy, Plus, Terminal, Globe } from "lucide-react";
import { useStackStore, StackCardData } from "@/lib/store/stack-store";

export function FloatingNodeEditor() {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNodeData, deleteNode, duplicateNode } =
    useStackStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvVal, setNewEnvVal] = useState("");

  if (!selectedNode) return null;

  const data = selectedNode.data;

  const handleAddEnv = () => {
    if (!newEnvKey.trim()) return;
    const currentEnv = data.env || {};
    updateNodeData(selectedNode.id, {
      env: {
        ...currentEnv,
        [newEnvKey.trim().toUpperCase()]: newEnvVal.trim(),
      },
    });
    setNewEnvKey("");
    setNewEnvVal("");
  };

  const handleRemoveEnv = (key: string) => {
    const currentEnv = { ...(data.env || {}) };
    delete currentEnv[key];
    updateNodeData(selectedNode.id, { env: currentEnv });
  };

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

        {/* Version & Source */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">
              Version
            </label>
            <input
              type="text"
              value={data.version || ""}
              onChange={(e) => updateNodeData(selectedNode.id, { version: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">
              Source
            </label>
            <input
              type="text"
              value={data.source || ""}
              placeholder="e.g. aapanel.com"
              onChange={(e) => updateNodeData(selectedNode.id, { source: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 mb-1">
            Status
          </label>
          <select
            value={data.status}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                status: e.target.value as StackCardData["status"],
              })
            }
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-medium text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="Running">● Running</option>
            <option value="Configured">● Configured</option>
            <option value="Healthy">● Healthy</option>
            <option value="Idle">● Idle</option>
          </select>
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

        {/* Environment Variables */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 mb-1">
            Environment Variables
          </label>
          <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
            {data.env && Object.keys(data.env).length > 0 ? (
              Object.entries(data.env).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded bg-zinc-100 px-2 py-1 font-mono text-[10px] dark:bg-zinc-900"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {k}={v}
                  </span>
                  <button
                    onClick={() => handleRemoveEnv(k)}
                    className="text-zinc-400 hover:text-red-500 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <span className="text-[10px] text-zinc-400 italic">No variables set</span>
            )}
          </div>

          <div className="flex gap-1">
            <input
              type="text"
              placeholder="KEY"
              value={newEnvKey}
              onChange={(e) => setNewEnvKey(e.target.value)}
              className="w-1/2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-900"
            />
            <input
              type="text"
              placeholder="VALUE"
              value={newEnvVal}
              onChange={(e) => setNewEnvVal(e.target.value)}
              className="w-1/2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-900"
            />
            <button
              onClick={handleAddEnv}
              className="rounded bg-zinc-900 px-2 py-1 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
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
