#!/usr/bin/env python3
"""
GitHub Deployment Script for CoStack
Deploys directly to git@github.com:subhmnd/CoStack.git

Usage:
  python3 deploy.py [optional commit message]
"""

import os
from pathlib import Path
import subprocess
import sys
import time

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPO_DIR = Path(__file__).resolve().parent

REMOTE_URL = "git@github.com:subhmnd/CoStack.git"
BRANCH = "main"
GIT_NAME = "Subh Mondal"
GIT_EMAIL = "subh@CoStack.com"

# Terminal Formatting
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"


def run_git(args, cwd=REPO_DIR, check=True):
    """Run a git command and return the completed process."""
    cmd = ["git"] + args
    return subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, check=check)


def deploy_github(commit_msg: str):
    """Stage, commit, and push to GitHub."""
    print(f"\n{BOLD}{MAGENTA}===================================================={RESET}")
    print(f"{BOLD}{MAGENTA}         CoStack GitHub Deployment              {RESET}")
    print(f"{BOLD}{MAGENTA}===================================================={RESET}")
    print(f"{BOLD}Repository:{RESET}  {REMOTE_URL}")
    print(f"{BOLD}Branch:{RESET}      {BRANCH}\n")

    # 1. Ensure git repository
    if not (REPO_DIR / ".git").exists():
        print(f"{CYAN}→ Initializing git repository...{RESET}")
        run_git(["init", "-b", BRANCH])
        print(f"{GREEN}  ✓ Initialized git repo on branch '{BRANCH}'.{RESET}")
    else:
        print(f"{GREEN}  ✓ Git repository detected.{RESET}")

    # 2. Configure git identity
    print(f"{CYAN}→ Configuring git user info...{RESET}")
    run_git(["config", "user.name", GIT_NAME])
    run_git(["config", "user.email", GIT_EMAIL])
    print(f"{GREEN}  ✓ user.name = '{GIT_NAME}'{RESET}")
    print(f"{GREEN}  ✓ user.email = '{GIT_EMAIL}'{RESET}")

    # 3. Configure remote
    try:
        remotes = run_git(["remote", "-v"]).stdout
        if "origin" in remotes:
            run_git(["remote", "set-url", "origin", REMOTE_URL])
            print(f"{GREEN}  ✓ Remote 'origin' updated -> {REMOTE_URL}{RESET}")
        else:
            run_git(["remote", "add", "origin", REMOTE_URL])
            print(f"{GREEN}  ✓ Remote 'origin' added -> {REMOTE_URL}{RESET}")
    except subprocess.CalledProcessError as e:
        print(f"{RED}[✗] Failed to configure remote: {e.stderr.strip()}{RESET}")
        return False

    # 4. Stage files
    print(f"{CYAN}→ Staging files (respecting .gitignore)...{RESET}")
    try:
        run_git(["add", "-A"])
        print(f"{GREEN}  ✓ All files staged.{RESET}")
    except subprocess.CalledProcessError as e:
        print(f"{RED}[✗] Failed to stage files: {e.stderr.strip()}{RESET}")
        return False

    # 5. Check if changes exist
    status_proc = run_git(["status", "--porcelain"])
    has_changes = bool(status_proc.stdout.strip())

    if has_changes:
        print(f"{CYAN}→ Committing changes: \"{commit_msg}\"...{RESET}")
        try:
            commit_proc = run_git(["commit", "-m", commit_msg])
            print(commit_proc.stdout.strip())
            print(f"{GREEN}  ✓ Changes committed successfully.{RESET}")
        except subprocess.CalledProcessError as e:
            print(f"{RED}[✗] Commit failed: {e.stderr.strip()}{RESET}")
            return False
    else:
        print(f"{YELLOW}  ℹ Working tree clean (no new changes to commit).{RESET}")

    # 6. Push to GitHub
    print(f"\n{CYAN}→ Pushing to GitHub ({REMOTE_URL}) on branch '{BRANCH}'...{RESET}")
    try:
        push_proc = run_git(["push", "-u", "origin", BRANCH])
        if push_proc.stdout.strip():
            print(push_proc.stdout.strip())
        if push_proc.stderr.strip():
            print(push_proc.stderr.strip())
    except subprocess.CalledProcessError as e:
        # If rejected because remote contains work not present locally, try pulling with rebase
        if "fetch first" in e.stderr or "non-fast-forward" in e.stderr:
            print(f"{YELLOW}  ℹ Remote has newer commits. Pulling with rebase...{RESET}")
            try:
                run_git(["pull", "--rebase", "origin", BRANCH])
                push_proc = run_git(["push", "-u", "origin", BRANCH])
                if push_proc.stdout.strip():
                    print(push_proc.stdout.strip())
            except subprocess.CalledProcessError as e2:
                print(f"{RED}[✗] Push failed after rebase: {e2.stderr.strip()}{RESET}")
                return False
        else:
            print(f"{RED}[✗] Push failed: {e.stderr.strip()}{RESET}")
            return False

    print(f"\n{BOLD}{GREEN}✓ GitHub Deployment Complete!{RESET}")
    print(f"  Repository: https://github.com/subhmnd/CoStack\n")
    return True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    commit_msg = (
        args[0]
        if args
        else f"deploy(web): updates {time.strftime('%Y-%m-%d %H:%M:%S')}"
    )

    success = deploy_github(commit_msg)
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
