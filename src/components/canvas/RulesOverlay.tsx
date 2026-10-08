"use client";

import React from "react";
import { ArrowRight, Cpu } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";

export function RulesOverlay() {
  const { nodes, edges } = useStackStore();

  if (nodes.length === 0) return null;

  // Build sequential process chain from DAG edges
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Set(edges.map((e) => e.target));

  // Find root node (no incoming edge) or default to first
  const rootNode = nodes.find((n) => !incoming.has(n.id)) || nodes[0];
  const chain: string[] = [rootNode.data.name];

  let currentId = rootNode.id;
  const visited = new Set<string>([currentId]);

  while (true) {
    const nextEdge = edges.find((e) => e.source === currentId && !visited.has(e.target));
    if (!nextEdge) break;
    const nextNode = nodeMap.get(nextEdge.target);
    if (!nextNode) break;
    chain.push(nextNode.data.name);
    visited.add(nextEdge.target);
    currentId = nextEdge.target;
  }

  // Include any remaining disconnected nodes
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      chain.push(n.data.name);
      visited.add(n.id);
    }
  }

  return (
    <div className="absolute top-18 left-6 z-30 flex flex-col gap-1.5 pointer-events-none max-w-lg">
      <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto rounded-full border border-zinc-200/90 bg-white/90 px-3.5 py-1.5 text-[11px] font-medium text-zinc-800 shadow-sm backdrop-blur-md dark:border-zinc-800/90 dark:bg-black/90 dark:text-zinc-200">
        <Cpu className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
        <span className="text-zinc-400 font-mono text-[10px] mr-0.5">Pipeline:</span>
        {chain.map((name, i) => (
          <React.Fragment key={`${name}-${i}`}>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
              {i + 1}. {name}
            </span>
            {i < chain.length - 1 && (
              <ArrowRight className="h-2.5 w-2.5 text-zinc-400 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
