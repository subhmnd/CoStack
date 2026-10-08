import { db, stacks } from "@/db";
import { eq } from "drizzle-orm";
import { generateStackManifest, ManifestNode, ManifestEdge } from "./executor/manifest-generator";
import { generateBashInstaller } from "./executor/bash-generator";

export interface SavedStackRecord {
  slug: string;
  name: string;
  manifestJson: any;
  manifestYaml: string;
  bashScript: string;
  createdAt?: string;
  updatedAt?: string;
}

// In-memory cache preserved across requests in server process
export const globalStackCache = new Map<string, SavedStackRecord>();

/**
 * Saves or updates stack in DB and in-memory cache
 */
export async function saveStack(
  slug: string,
  name: string,
  nodes: ManifestNode[],
  edges: ManifestEdge[]
): Promise<SavedStackRecord> {
  const { manifest, json, yaml } = generateStackManifest(slug, name || `Stack-${slug}`, nodes, edges || []);
  const bashScript = generateBashInstaller(manifest);

  const record: SavedStackRecord = {
    slug,
    name: manifest.name,
    manifestJson: manifest,
    manifestYaml: yaml,
    bashScript,
    updatedAt: new Date().toISOString(),
  };

  globalStackCache.set(slug, record);

  if (db) {
    try {
      await db
        .insert(stacks)
        .values({
          slug,
          name: manifest.name,
          description: `Stack pipeline for ${manifest.name}`,
          manifestJson: manifest,
          manifestYaml: yaml,
          bashScript,
        })
        .onConflictDoUpdate({
          target: stacks.slug,
          set: {
            name: manifest.name,
            manifestJson: manifest,
            manifestYaml: yaml,
            bashScript,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      console.warn("DB save warning, falling back to cache:", err);
    }
  }

  return record;
}

/**
 * Retrieves saved stack from in-memory cache or Postgres DB
 */
export async function getStackBySlug(slug: string): Promise<SavedStackRecord | null> {
  if (!slug) return null;

  // 1. Check in-memory cache first
  if (globalStackCache.has(slug)) {
    return globalStackCache.get(slug)!;
  }

  // 2. Check Neon DB
  if (db) {
    try {
      const rows = await db.select().from(stacks).where(eq(stacks.slug, slug)).limit(1);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const record: SavedStackRecord = {
          slug: row.slug,
          name: row.name,
          manifestJson: row.manifestJson,
          manifestYaml: row.manifestYaml,
          bashScript: row.bashScript,
          createdAt: row.createdAt?.toISOString(),
          updatedAt: row.updatedAt?.toISOString(),
        };
        globalStackCache.set(slug, record);
        return record;
      }
    } catch (err) {
      console.warn("DB query error for slug:", slug, err);
    }
  }

  return null;
}
