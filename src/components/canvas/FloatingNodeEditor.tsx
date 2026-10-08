"use client";

import React, { useState } from "react";
import { X, Trash2, Copy, Terminal, Cpu, Plus, Minus } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";

export function FloatingNodeEditor() {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNodeData, deleteNode, duplicateNode } =
    useStackStore();

  const [newVarKey, setNewVarKey] = useState("");
  const [newVarVal, setNewVarVal] = useState("");

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) return null;

  const data = selectedNode.data;
  const versionList = Array.from(
    new Set([data.version, ...(data.versions || []), "latest", "stable", "lts"].filter(Boolean) as string[])
  );

  const inputs = data.inputs || {};

  const handleAddVariable = () => {
    if (!newVarKey.trim()) return;
    const cleanKey = newVarKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    updateNodeData(selectedNode.id, {
      inputs: {
        ...inputs,
        [cleanKey]: newVarVal,
      },
    });
    setNewVarKey("");
    setNewVarVal("");
  };

  const handleRemoveVariable = (key: string) => {
    const updated = { ...inputs };
    delete updated[key];
    updateNodeData(selectedNode.id, { inputs: updated });
  };

  return (
    <div className="absolute top-20 right-6 z-40 w-80 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-black/95 transition-all animate-in fade-in zoom-in-95">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Process Configuration
          </span>
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Auto-defined Process Context Banner */}
      <div className="mt-3 rounded-xl border border-purple-200/60 bg-purple-50/70 p-2.5 text-xs text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300">
        <div className="flex items-center gap-1.5 font-semibold text-[11px]">
          <Cpu className="h-3.5 w-3.5 text-purple-600" />
          <span>
            {data.parentProcessName
              ? `Attached to Process: ${data.parentProcessName}`
              : "Root Process (Host System)"}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-purple-700/80 dark:text-purple-400 leading-tight">
          {data.parentProcessName
            ? `Runs sequentially in the context of [${data.parentProcessName}].`
            : "Runs directly on the host operating system."}
        </p>
      </div>

      <div className="mt-3.5 space-y-3.5 text-xs">
        {/* Name */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 mb-1">
            Process Name
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
              Source Domain
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

        {/* Official Script / Command */}
        <div>
          <label className="flex items-center justify-between text-[11px] font-medium text-zinc-500 mb-1">
            <span className="flex items-center gap-1">
              <Terminal className="h-3 w-3" /> Official Script / Command
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">bash</span>
          </label>
          <textarea
            rows={2}
            value={data.command || ""}
            placeholder="e.g. curl -fsSL ... | bash"
            onChange={(e) => updateNodeData(selectedNode.id, { command: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-[11px] text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Script Arguments & Auto-Confirm (Yes/No) */}
        <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              Auto-Confirm Prompts (Yes to all)
            </span>
            <input
              type="checkbox"
              checked={data.autoConfirm !== false}
              onChange={(e) => updateNodeData(selectedNode.id, { autoConfirm: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
          </label>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">
              Script Arguments / Flags (Optional)
            </label>
            <input
              type="text"
              value={data.args || ""}
              placeholder="e.g. -y, --silent"
              onChange={(e) => updateNodeData(selectedNode.id, { args: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs text-zinc-900 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Process Inputs / Environment Variables */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
          <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">
            Process Variables / Answers
          </label>
          {Object.entries(inputs).length > 0 && (
            <div className="space-y-1.5 mb-2">
              {Object.entries(inputs).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-zinc-600 dark:text-zinc-400 font-semibold">{k}=</span>
                  <span className="truncate flex-1 text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {v}
                  </span>
                  <button
                    onClick={() => handleRemoveVariable(k)}
                    className="p-1 text-zinc-400 hover:text-red-500"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newVarKey}
              placeholder="KEY"
              onChange={(e) => setNewVarKey(e.target.value)}
              className="w-1/3 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            />
            <input
              type="text"
              value={newVarVal}
              placeholder="Value"
              onChange={(e) => setNewVarVal(e.target.value)}
              className="flex-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={handleAddVariable}
              className="p-1 rounded bg-purple-600 text-white hover:bg-purple-700"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
        <button
          onClick={() => duplicateNode(selectedNode.id)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          <span>Duplicate</span>
        </button>
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete Node</span>
        </button>
      </div>
    </div>
  );
}
