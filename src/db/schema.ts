import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const technologies = pgTable("technologies", {
  id: text("id").primaryKey(), // e.g. "cpanel", "nginx", "postgresql"
  name: text("name").notNull(),
  category: text("category").notNull(), // "panel", "runtime", "database", "cache", "application"
  description: text("description").notNull(),
  defaultVersion: text("default_version").notNull(),
  officialDocsUrl: text("official_docs_url").notNull(),
  officialRepoUrl: text("official_repo_url").notNull(),
  installType: text("install_type").notNull().default("system"), // "system", "binary"
  defaultPort: integer("default_port"),
  healthCheckCmd: text("health_check_cmd"),
  envTemplate: jsonb("env_template").$type<Record<string, string>>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const versions = pgTable("versions", {
  id: serial("id").primaryKey(),
  techId: text("tech_id").references(() => technologies.id).notNull(),
  version: text("version").notNull(),
  releaseDate: text("release_date"),
  isLts: boolean("is_lts").default(false).notNull(),
  checksum: text("checksum"),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
});

export const compatibilityRules = pgTable("compatibility_rules", {
  id: serial("id").primaryKey(),
  sourceTechId: text("source_tech_id").references(() => technologies.id).notNull(),
  targetTechId: text("target_tech_id").references(() => technologies.id).notNull(),
  relationship: text("relationship").notNull(), // "requires" | "recommends" | "compatible" | "conflicts"
  minVersion: text("min_version"),
  notes: text("notes").notNull(),
  direction: text("direction").notNull().default("source_needs_target"),
});

export const stacks = pgTable("stacks", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  manifestJson: jsonb("manifest_json").notNull(),
  manifestYaml: text("manifest_yaml").notNull(),
  bashScript: text("bash_script").notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stackRevisions = pgTable("stack_revisions", {
  id: serial("id").primaryKey(),
  stackId: integer("stack_id").references(() => stacks.id).notNull(),
  revision: integer("revision").notNull(),
  manifestJson: jsonb("manifest_json").notNull(),
  bashScript: text("bash_script").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const searchSuggestions = pgTable("search_suggestions", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  title: text("title").notNull(),
  techIds: jsonb("tech_ids").$type<string[]>().notNull(),
  popularity: integer("popularity").default(0).notNull(),
});
