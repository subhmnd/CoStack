import React from "react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { getStackBySlug } from "@/lib/stack-service";
import { generateStackManifest } from "@/lib/executor/manifest-generator";
import { generateBashInstaller } from "@/lib/executor/bash-generator";
import { createSoftwareNodeData, parseSlugToSoftware } from "@/lib/stack-parser";
import { resolveSoftware } from "@/lib/search-resolver";
import { StackViewerClient } from "./StackViewerClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StackDefinitionPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  // 1. Try to load exact saved stack from DB / in-memory cache
  const saved = await getStackBySlug(slug);

  let manifest;
  let jsonString = "";
  let yamlString = "";
  let bashScript = "";

  if (saved) {
    if (saved.manifestJson?.nodes?.length) {
      await Promise.all(
        saved.manifestJson.nodes.map(async (n: any) => {
          if (!n.data.command || n.data.command.startsWith("$PKG_INSTALL")) {
            try {
              const res = await resolveSoftware(n.data.name);
              if (res.length > 0 && res[0].command && !res[0].command.startsWith("$PKG_INSTALL")) {
                n.data.command = res[0].command;
                n.data.source = res[0].source || n.data.source;
                n.data.sourceUrl = res[0].sourceUrl || n.data.sourceUrl;
              }
            } catch {}
          }
        })
      );
    }
    manifest = saved.manifestJson;
    jsonString = JSON.stringify(saved.manifestJson, null, 2);
    yamlString = saved.manifestYaml;
    bashScript = saved.manifestJson?.nodes?.length
      ? generateBashInstaller(saved.manifestJson)
      : saved.bashScript;
  } else {
    // 2. Dynamic fallback
    const parsedItems = parseSlugToSoftware(slug);

    const nodes = await Promise.all(
      parsedItems.map(async (item, i) => {
        const data = createSoftwareNodeData(item.name, item.version || "latest");
        try {
          const res = await resolveSoftware(item.name);
          if (res.length > 0 && res[0].command) {
            data.command = res[0].command;
            data.source = res[0].source || data.source;
            data.sourceUrl = res[0].sourceUrl || data.sourceUrl;
            if (!item.version && res[0].version) {
              data.version = res[0].version;
            }
            if (res[0].versions) {
              data.versions = res[0].versions;
            }
          }
        } catch {}

        return {
          id: `node-${i}`,
          position: { x: i * 260, y: 150 },
          data: {
            ...data,
            label: data.name,
          },
        };
      })
    );

    const edges = nodes.slice(1).map((node, i) => ({
      id: `edge-${i}-${i + 1}`,
      source: nodes[i].id,
      target: node.id,
      label: "linked",
    }));

    const gen = generateStackManifest(slug, `Stack-${slug}`, nodes, edges);
    manifest = gen.manifest;
    jsonString = gen.json;
    yamlString = gen.yaml;
    bashScript = generateBashInstaller(manifest);
  }

  return (
    <main className="min-h-screen w-full bg-white dark:bg-black text-zinc-950 dark:text-zinc-50 selection:bg-purple-500/20">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16">
        <StackViewerClient
          slug={slug}
          manifest={manifest}
          jsonString={jsonString}
          yamlString={yamlString}
          bashScript={bashScript}
        />
      </div>
    </main>
  );
}
