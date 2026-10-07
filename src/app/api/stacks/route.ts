import { NextRequest, NextResponse } from "next/server";
import { db, stacks } from "@/db";
import { generateStackManifest } from "@/lib/executor/manifest-generator";
import { generateBashInstaller } from "@/lib/executor/bash-generator";

// In-memory fallback map for preview deployments or when Neon DB is connecting
const inMemoryStacks = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, name, nodes, edges } = body;

    if (!slug || !nodes) {
      return NextResponse.json({ error: "Invalid stack data" }, { status: 400 });
    }

    const { manifest, json, yaml } = generateStackManifest(slug, name || `Stack-${slug}`, nodes, edges || []);
    const bashScript = generateBashInstaller(manifest);

    const record = {
      slug,
      name: manifest.name,
      manifestJson: manifest,
      manifestYaml: yaml,
      bashScript,
      createdAt: new Date().toISOString(),
    };

    // Store in-memory
    inMemoryStacks.set(slug, record);

    // Save to Neon DB if connected
    if (db) {
      try {
        await db.insert(stacks).values({
          slug,
          name: manifest.name,
          description: `Immutable manifest for ${manifest.name}`,
          manifestJson: manifest,
          manifestYaml: yaml,
          bashScript,
        });
      } catch (dbErr) {
        console.warn("Neon DB write fallback to memory:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      slug,
      bashUrl: `/c/${slug}`,
      manifest,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    count: inMemoryStacks.size,
  });
}
