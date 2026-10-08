"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, RotateCcw, Terminal } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";

export function BashLinkBanner() {
  const { slug, stackName, nodes, edges, clearStack } = useStackStore();
  const [copied, setCopied] = useState(false);

  // Auto-persist stack to server so curl -fsSL ... | bash serves the exact configured scripts
  useEffect(() => {
    if (nodes.length === 0) return;

    const timeout = setTimeout(() => {
      fetch("/api/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: stackName, nodes, edges }),
      }).catch((e) => {
        console.warn("Background stack save error:", e);
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [slug, stackName, nodes, edges]);

  if (nodes.length === 0) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://costack.tech";
  const bashCmd = `curl -fsSL ${appUrl}/c/${slug} | bash`;

  const handleCopy = async () => {
    // Guarantee stack is saved before copying command
    try {
      await fetch("/api/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: stackName, nodes, edges }),
      });
    } catch (e) {
      console.warn("Immediate save on copy error:", e);
    }

    navigator.clipboard.writeText(bashCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-18 right-6 z-30 flex items-center gap-2 animate-in fade-in slide-from-top-2">
      <div className="flex items-center rounded-xl border border-zinc-200/90 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md dark:border-zinc-800/90 dark:bg-black/95 transition-all">
        <Terminal className="h-3.5 w-3.5 text-zinc-500 mr-2 flex-shrink-0" />
        <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 mr-3 truncate max-w-[280px] sm:max-w-[360px]">
          {bashCmd}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-purple-600 dark:bg-zinc-100 dark:text-black dark:hover:bg-purple-400 dark:hover:text-black transition-colors"
        >
          {copied ? (
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

        <Link
          href={`/c/${slug}`}
          className="ml-1.5 p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          title="Open immutable stack definition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <button
        onClick={clearStack}
        title="Reset canvas"
        className="rounded-xl border border-zinc-200 bg-white/90 p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-black/90 dark:hover:text-zinc-200 dark:hover:bg-zinc-900 transition-colors shadow-sm"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
