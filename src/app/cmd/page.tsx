"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { StackCanvas } from "@/components/canvas/StackCanvas";
import { useStackStore } from "@/lib/store/stack-store";

function CmdCanvasController() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q");
  const versionParam = searchParams.get("v");
  const sourceParam = searchParams.get("s");
  const cmdParam = searchParams.get("cmd");
  const { addNodeFromSearch, addSoftwareStack, clearStack } = useStackStore();
  const lastParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (!queryParam) return;

    const currentKey = `${queryParam}__${versionParam || ""}__${sourceParam || ""}__${cmdParam || ""}`;
    if (lastParamRef.current === currentKey) return;
    lastParamRef.current = currentKey;

    // Reset canvas when a new query is supplied via URL
    clearStack();

    if (versionParam || sourceParam || cmdParam) {
      addNodeFromSearch({
        name: queryParam,
        version: versionParam || "latest",
        source: sourceParam || "",
        command: cmdParam || "",
      });
    } else {
      const items = queryParam
        .split(/[+,&]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length > 0) {
        addSoftwareStack(items);
      }
    }
  }, [queryParam, versionParam, sourceParam, cmdParam, clearStack, addNodeFromSearch, addSoftwareStack]);

  return <StackCanvas />;
}

export default function CmdPage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white dark:bg-black selection:bg-purple-500/20">
      <Navbar />
      <Suspense fallback={<div className="h-screen w-screen bg-white dark:bg-black" />}>
        <CmdCanvasController />
      </Suspense>
    </main>
  );
}
