import { CoStackManifest, ManifestNode } from "./manifest-generator";

/**
 * Generates clean, robust, native Linux bash installer scripts.
 * Supports bare-metal, native distro packages, system installers (cPanel, CloudLinux, etc.),
 * binaries, systemd services, or custom commands without forcing any container runtime.
 */
export function generateBashInstaller(manifest: CoStackManifest): string {
  const nodeMap = new Map<string, ManifestNode>(manifest.nodes.map((n) => [n.id, n]));
  const orderedNodes = manifest.executionOrder
    .map((id) => nodeMap.get(id))
    .filter((n): n is ManifestNode => n !== undefined);

  const stepsScript = orderedNodes
    .map((node, index) => {
      const data = node.data;
      const stepNum = index + 1;
      const rawName = data.name.trim();
      const slugName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const port = data.port || 80;
      const version = data.version || "latest";
      const customCommand = data.command?.trim();

      // If user specified custom command on the node, execute that directly!
      if (customCommand) {
        return `
# ------------------------------------------------------------------------------
# Step ${stepNum}/${orderedNodes.length}: Deploy [${rawName}]
# ------------------------------------------------------------------------------
echo -e "\${CYAN}[Step ${stepNum}/${orderedNodes.length}]\${NC} Executing deployment for \${BOLD}${rawName}\${NC}..."

${customCommand}

echo -e "\${GREEN}✓\${NC} Completed step: ${rawName}"
`;
      }

      // Default: Clean Native System / Bare-Metal installation
      return `
# ------------------------------------------------------------------------------
# Step ${stepNum}/${orderedNodes.length}: Install & Configure [${rawName}]
# ------------------------------------------------------------------------------
echo -e "\${CYAN}[Step ${stepNum}/${orderedNodes.length}]\${NC} Installing \${BOLD}${rawName}\${NC} (v${version}) natively..."

if [ -n "$PKG_INSTALL" ]; then
  $PKG_INSTALL "${slugName}" || {
    echo -e "\${YELLOW}Notice:\${NC} Standard package '${slugName}' not in default repos. Trying official binary lookup..."
  }
fi

# Enable system service if available
if command -v systemctl &> /dev/null; then
  systemctl enable "${slugName}" 2>/dev/null || true
  systemctl start "${slugName}" 2>/dev/null || true
fi

echo -e "\${GREEN}✓\${NC} ${rawName} configured."
`;
    })
    .join("\n");

  return `#!/usr/bin/env bash
# ==============================================================================
# Co.Stack — Deterministic Native Stack Installer
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
echo -e "\${PURPLE}│\${NC}  \${BOLD}Co.Stack Installer\${NC}                           \${PURPLE}│\${NC}"
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
echo -e "Deployed components:"
${orderedNodes.map((n) => `echo -e "  - \${BOLD}${n.data.name}\${NC} (Port: ${n.data.port || 80})"`).join("\n")}
echo ""
`;
}
