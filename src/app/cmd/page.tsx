"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { StackCanvas } from "@/components/canvas/StackCanvas";
import { useStackStore } from "@/lib/store/stack-store";

function CmdCanvasController() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q");
  const versionParam = searchParams.get("v");
  const sourceParam = searchParams.get("s");
  const { addNodeFromSearch, addSoftwareStack, nodes } = useStackStore();

  useEffect(() => {
    if (queryParam && nodes.length === 0) {
      if (versionParam || sourceParam) {
        addNodeFromSearch({
          name: queryParam,
          version: versionParam || "latest",
          source: sourceParam || "",
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
    }
  }, [queryParam, versionParam, sourceParam, nodes.length, addNodeFromSearch, addSoftwareStack]);

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
