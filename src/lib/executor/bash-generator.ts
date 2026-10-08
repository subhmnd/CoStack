import { CoStackManifest, ManifestNode } from "./manifest-generator";

/**
 * Generates clean, robust, multi-script pipeline bash installer.
 * Auto-defines execution hierarchy and context according to the process flow (DAG).
 * Executes sequentially, checking exit codes, exporting variables, and auto-confirming prompts.
 */
export function generateBashInstaller(manifest: CoStackManifest): string {
  const nodeMap = new Map<string, ManifestNode>(manifest.nodes.map((n) => [n.id, n]));
  const orderedNodes = manifest.executionOrder
    .map((id) => nodeMap.get(id))
    .filter((n): n is ManifestNode => n !== undefined);

  // Map incoming edges: targetId -> parentNode
  const parentMap = new Map<string, ManifestNode>();
  for (const edge of manifest.edges) {
    const parent = nodeMap.get(edge.source);
    if (parent) {
      parentMap.set(edge.target, parent);
    }
  }

  const stepsScript = orderedNodes
    .map((node, index) => {
      const data = node.data;
      const stepNum = index + 1;
      const rawName = data.name.trim();
      const slugName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const version = data.version || "latest";
      const customCommand = data.command?.trim();
      const customArgs = data.args?.trim() || "";
      const autoConfirm = data.autoConfirm !== false; // default true

      // Auto-defined process context from incoming DAG edge
      const parentNode = parentMap.get(node.id);
      const parentName = parentNode ? parentNode.data.name.trim() : null;
      const parentSlug = parentName ? parentName.toLowerCase().replace(/[^a-z0-9_-]/g, "") : null;
      const parentIsContainer = parentName
        ? /docker|podman|container/i.test(parentName) ||
          (parentNode?.data.command ? /docker|podman/i.test(parentNode.data.command) : false)
        : false;

      // User-defined variables / inputs for this step
      const envExports = data.inputs && Object.keys(data.inputs).length > 0
        ? Object.entries(data.inputs)
            .map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"`)
            .join("\n") + "\n"
        : "";

      // Determine base command
      let execCmd = customCommand || (
        `if [ -n "$PKG_INSTALL" ]; then $PKG_INSTALL "${slugName}"; fi`
      );

      if (customArgs) {
        execCmd = `${execCmd} ${customArgs}`;
      }

      // If parent is container runtime and command isn't already a docker command, auto-wrap or run
      if (parentIsContainer && parentSlug && !execCmd.startsWith("docker") && !execCmd.startsWith("podman")) {
        const escapedSubCmd = execCmd.replace(/"/g, '\\"');
        execCmd = `docker exec "${parentSlug}" sh -c "${escapedSubCmd}" 2>/dev/null || (${execCmd})`;
      }

      // If auto-confirm is enabled, pipe yes to answer interactive prompts
      const finalCmd = autoConfirm && !execCmd.includes("-y") && !execCmd.includes("yes")
        ? `yes 2>/dev/null | (${execCmd}) || (${execCmd})`
        : execCmd;

      const contextLabel = parentName
        ? `under [${parentName}]`
        : "System / Host";

      return `
# ------------------------------------------------------------------------------
# Process Step ${stepNum}/${orderedNodes.length}: [${rawName}] (${contextLabel})
# ------------------------------------------------------------------------------
echo -e "\${CYAN}[Process ${stepNum}/${orderedNodes.length}]\${NC} Running \${BOLD}${rawName}\${NC} (v${version}) ${contextLabel}..."

${envExports}${finalCmd}

if [ $? -ne 0 ]; then
  echo -e "\${RED}Error: Process Step ${stepNum} [${rawName}] failed with exit code $?. Aborting stack.\${NC}" >&2
  exit 1
fi

echo -e "\${GREEN}✓\${NC} Completed step ${stepNum}: ${rawName}"
`;
    })
    .join("\n");

  return `#!/usr/bin/env bash
# ==============================================================================
# Co.Stack — Deterministic Multi-Script Stack Runner
# Stack Slug : ${manifest.slug}
# Generated  : ${manifest.generatedAt}
# Target OS  : RHEL-family, CloudLinux, AlmaLinux, Rocky, CentOS, Debian, Ubuntu
# ==============================================================================

set -euo pipefail

# Visual styling
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
CYAN='\\033[0;36m'
BOLD='\\033[1m'
NC='\\033[0m'

echo -e "\${PURPLE}┌───────────────────────────────────────────────┐\${NC}"
echo -e "\${PURPLE}│\${NC}  \${BOLD}Co.Stack Multi-Script Runner\${NC}                 \${PURPLE}│\${NC}"
echo -e "\${PURPLE}│\${NC}  Stack: \${CYAN}${manifest.name}\${NC}                      \${PURPLE}│\${NC}"
echo -e "\${PURPLE}│\${NC}  Slug : \${YELLOW}${manifest.slug}\${NC}                  \${PURPLE}│\${NC}"
echo -e "\${PURPLE}└───────────────────────────────────────────────┘\${NC}"

# Check for root / administrative privileges
if [ "\$(id -u)" -ne 0 ]; then
  echo -e "\${RED}Error: This installer must be run as root (use sudo su).\${NC}" >&2
  exit 1
fi

# Detect Operating System and Distribution
echo -e "\${BLUE}==>\${NC} Inspecting host environment..."
OS_ID="unknown"
OS_NAME="Linux"

if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="\${ID:-unknown}"
  OS_NAME="\${PRETTY_NAME:-\$NAME}"
elif [ -f /etc/redhat-release ]; then
  OS_NAME="\$(cat /etc/redhat-release)"
  OS_ID="rhel"
fi

echo -e "    Operating System: \${BOLD}\$OS_NAME\${NC} (\$OS_ID)"

# Detect Native Package Manager
PKG_INSTALL=""
if command -v dnf &> /dev/null; then
  PKG_INSTALL="dnf install -y -q"
elif command -v yum &> /dev/null; then
  PKG_INSTALL="yum install -y -q"
elif command -v apt-get &> /dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq || true
  PKG_INSTALL="apt-get install -y -qq"
elif command -v pacman &> /dev/null; then
  PKG_INSTALL="pacman -Sy --noconfirm"
elif command -v zypper &> /dev/null; then
  PKG_INSTALL="zypper install -y"
fi

# Install essential CLI tools if missing
if command -v curl &> /dev/null; then
  :
elif [ -n "$PKG_INSTALL" ]; then
  $PKG_INSTALL curl wget tar || true
fi

# Execute Ordered Stack Services
${stepsScript}

# Summary Report
echo ""
echo -e "\${GREEN}=====================================================\${NC}"
echo -e "\${GREEN}✓ Co.Stack deployment completed successfully!\${NC}"
echo -e "\${GREEN}=====================================================\${NC}"
echo -e "Executed process pipeline:"
${orderedNodes.map((n, i) => `echo -e "  [${i + 1}] \${BOLD}${n.data.name}\${NC} (v${n.data.version || "latest"})"`).join("\n")}
echo ""
`;
}
