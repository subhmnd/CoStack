import { NextRequest } from "next/server";
import { getStackBySlug } from "@/lib/stack-service";
import { generateStackManifest } from "@/lib/executor/manifest-generator";
import { generateBashInstaller } from "@/lib/executor/bash-generator";
import { createSoftwareNodeData } from "@/lib/stack-parser";
import { resolveSoftware } from "@/lib/search-resolver";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Retrieve exact saved stack configured on the canvas
  const saved = await getStackBySlug(slug);
  if (saved) {
    if (saved.manifestJson?.nodes?.length) {
      // Ensure any node without command or with generic fallback is resolved dynamically
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

      const script = generateBashInstaller(saved.manifestJson);
      return new Response(script, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        },
      });
    } else if (saved.bashScript) {
      return new Response(saved.bashScript, {
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

  const nodes = await Promise.all(
    rawNames.map(async (name, i) => {
      const data = createSoftwareNodeData(name);
      try {
        const res = await resolveSoftware(name);
        if (res.length > 0 && res[0].command) {
          data.command = res[0].command;
          data.source = res[0].source || data.source;
          data.sourceUrl = res[0].sourceUrl || data.sourceUrl;
        }
      } catch {}

      return {
        id: `node-${i}`,
        position: { x: i * 250, y: 100 },
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
