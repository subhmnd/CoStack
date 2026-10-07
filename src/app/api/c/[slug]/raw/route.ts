import { NextRequest, NextResponse } from "next/server";
import { generateStackManifest } from "@/lib/executor/manifest-generator";
import { generateBashInstaller } from "@/lib/executor/bash-generator";
import { createSoftwareNodeData } from "@/lib/stack-parser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Extract items from slug (e.g., "nextcloud-postgres-7x2k" or "wordpress-mysql")
  // Extract tokens by removing the trailing nanoid hash
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
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
