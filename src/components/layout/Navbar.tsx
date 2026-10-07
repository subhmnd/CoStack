"use client";

import React from "react";
import Link from "next/link";
import { Github, Star } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-black/80 transition-colors">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Co.Stack logo + wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black font-semibold text-xs tracking-tighter transition-transform group-hover:scale-105">
            Co
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Co.Stack
          </span>
        </Link>

        {/* Right: GitHub Star */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/costack/costack"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 transition-all black-shine"
          >
            <Github className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span>Star on GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
