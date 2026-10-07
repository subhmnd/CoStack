"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";

const ROTATING_EXAMPLES = [
  "Search what you want to install...",
  "WordPress",
  "Docker",
  "Nextcloud",
  "PostgreSQL",
];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_EXAMPLES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      router.push("/cmd");
    } else {
      router.push(`/cmd?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 bg-white dark:bg-black transition-colors">
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        {/* Main Search Input */}
        <div className="relative flex items-center rounded-2xl border border-zinc-200/90 bg-white/95 shadow-xl backdrop-blur-md dark:border-zinc-800/90 dark:bg-black/95 transition-all focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20 black-shine">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ROTATING_EXAMPLES[placeholderIndex]}
            className="w-full bg-transparent px-5 py-4 text-base text-zinc-950 placeholder-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder-zinc-600 font-normal tracking-tight transition-all"
            autoFocus
          />

          <button
            type="submit"
            className="mr-3 flex items-center gap-1 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-purple-600 dark:bg-zinc-50 dark:text-black dark:hover:bg-purple-400 dark:hover:text-black transition-all"
          >
            <span>Build</span>
            <CornerDownLeft className="h-3 w-3" />
          </button>
        </div>

        {/* Under the search bar: "Press Enter to build" */}
        <div className="mt-3 text-center">
          <span className="text-xs text-zinc-400 dark:text-zinc-600 tracking-tight select-none">
            Press Enter to build
          </span>
        </div>
      </form>
    </div>
  );
}
