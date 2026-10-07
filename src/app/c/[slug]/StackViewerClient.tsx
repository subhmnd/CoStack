"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Copy, Check, Terminal, FileCode, Layers, ArrowRight, ShieldCheck } from "lucide-react";
import { CoStackManifest } from "@/lib/executor/manifest-generator";

interface Props {
  slug: string;
  manifest: CoStackManifest;
  jsonString: string;
  yamlString: string;
  bashScript: string;
}

export function StackViewerClient({ slug, manifest, jsonString, yamlString, bashScript }: Props) {
  const [activeTab, setActiveTab] = useState<"bash" | "yaml" | "json">("bash");
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const curlCmd = `curl -fsSL https://costack.tech/c/${slug} | bash`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(curlCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCopyCode = () => {
    const textToCopy = activeTab === "bash" ? bashScript : activeTab === "yaml" ? yamlString : jsonString;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const queryItems = manifest.nodes.map((n) => n.data.name).join(" + ");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
              /c/{slug}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3 w-3" />
              Immutable
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {manifest.name}
          </h1>
        </div>

        <Link
          href={`/cmd?q=${encodeURIComponent(queryItems)}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-medium text-white hover:bg-purple-600 dark:bg-zinc-50 dark:text-black dark:hover:bg-purple-400 dark:hover:text-black transition-colors"
        >
          <span>Open in Canvas</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Primary Curl Command Box */}
      <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/70 p-4 dark:border-zinc-800/90 dark:bg-zinc-900/40 black-shine">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Executable Bash Command
          </span>
          <span className="text-[11px] text-zinc-400">Deterministic</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100">
          <span className="truncate">{curlCmd}</span>
          <button
            onClick={handleCopyCmd}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-purple-600 dark:bg-zinc-100 dark:text-black dark:hover:bg-purple-400 dark:hover:text-black transition-colors flex-shrink-0"
          >
            {copiedCmd ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Service Cards */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
          Architecture Services ({manifest.nodes.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {manifest.nodes.map((node) => (
            <div
              key={node.id}
              className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-black"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {node.data.name}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">
                    {node.data.version || "latest"}
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                  {node.data.runtime || "Native"}
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Port {node.data.port || 80}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">● Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Inspector Tabs */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("bash")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "bash"
                  ? "bg-white text-zinc-950 shadow-sm dark:bg-black dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Bash Installer
            </button>
            <button
              onClick={() => setActiveTab("yaml")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "yaml"
                  ? "bg-white text-zinc-950 shadow-sm dark:bg-black dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              YAML Manifest
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "json"
                  ? "bg-white text-zinc-950 shadow-sm dark:bg-black dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              JSON Manifest
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            {copiedCode ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>{copiedCode ? "Copied" : "Copy Code"}</span>
          </button>
        </div>

        <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-800 dark:text-zinc-200 max-h-96 leading-relaxed bg-white dark:bg-black">
          <code>
            {activeTab === "bash" ? bashScript : activeTab === "yaml" ? yamlString : jsonString}
          </code>
        </pre>
      </div>
    </div>
  );
}
