import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { generateStackManifest } from "@/lib/executor/manifest-generator";
import { generateBashInstaller } from "@/lib/executor/bash-generator";
import { createSoftwareNodeData } from "@/lib/stack-parser";
import { StackViewerClient } from "./StackViewerClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StackDefinitionPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  // Parse items from slug
  const parts = slug.split("-");
  const rawNames = parts.length > 1 ? parts.slice(0, -1) : parts;

  const nodes = rawNames.map((name, i) => {
    const data = createSoftwareNodeData(name);
    return {
      id: `node-${i}`,
      position: { x: i * 260, y: 150 },
      data: {
        ...data,
        label: data.name,
      },
    };
  });

  const edges = nodes.slice(1).map((node, i) => ({
    id: `edge-${i}-${i + 1}`,
    source: nodes[i].id,
    target: node.id,
    label: "linked",
  }));

  const { manifest, json, yaml } = generateStackManifest(slug, `Stack-${slug}`, nodes, edges);
  const bashScript = generateBashInstaller(manifest);

  return (
    <main className="min-h-screen w-full bg-white dark:bg-black text-zinc-950 dark:text-zinc-50 selection:bg-purple-500/20">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16">
        <StackViewerClient
          slug={slug}
          manifest={manifest}
          jsonString={json}
          yamlString={yaml}
          bashScript={bashScript}
        />
      </div>
    </main>
  );
}
