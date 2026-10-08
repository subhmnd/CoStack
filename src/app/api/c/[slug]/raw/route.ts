import { NextRequest } from "next/server";
import { getStackBySlug } from "@/lib/stack-service";
import { generateStackManifest } from "@/lib/executor/manifest-generator";
import { generateBashInstaller } from "@/lib/executor/bash-generator";
import { createSoftwareNodeData } from "@/lib/stack-parser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Retrieve exact saved stack configured on the canvas
  const saved = await getStackBySlug(slug);
  if (saved) {
    const script = saved.manifestJson?.nodes?.length
      ? generateBashInstaller(saved.manifestJson)
      : saved.bashScript;
    if (script) {
      return new Response(script, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        },
      });
    }
  }

  // 2. Dynamic fallback if accessed directly from slug without saving
  const parts = slug.split("-");
  const rawNames = parts.length > 1 ? parts.slice(0, -1) : parts;

  const nodes = rawNames.map((name, i) => {
    const data = createSoftwareNodeData(name);
    return {
      id: `node-${i}`,
      position: { x: i * 250, y: 100 },
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
  }));

  const { manifest } = generateStackManifest(slug, `Stack-${slug}`, nodes, edges);
  const bashScript = generateBashInstaller(manifest);

  return new Response(bashScript, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}
