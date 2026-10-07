"use client";

import React from "react";
import { CheckCircle2, Link2, Info } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";
import { evaluateStackRules } from "@/lib/catalog";

export function RulesOverlay() {
  const { nodes, edges } = useStackStore();

  if (nodes.length === 0) return null;

  const rules = evaluateStackRules(
    nodes.map((n) => ({ id: n.id, label: n.data.name, data: n.data })),
    edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
  );

  if (rules.length === 0) return null;

  return (
    <div className="absolute top-18 left-6 z-30 flex flex-col gap-1.5 pointer-events-none max-w-sm">
      {rules.slice(0, 4).map((rule) => (
        <div
          key={rule.id}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/90 px-3 py-1 text-[11px] font-medium text-zinc-800 shadow-sm backdrop-blur-md dark:border-zinc-800/90 dark:bg-black/90 dark:text-zinc-200 transition-all hover:scale-[1.02]"
        >
          {rule.isValid ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
          ) : (
            <Info className="h-3 w-3 text-purple-500 flex-shrink-0" />
          )}
          <span className="truncate">{rule.message}</span>
        </div>
      ))}
    </div>
  );
}
