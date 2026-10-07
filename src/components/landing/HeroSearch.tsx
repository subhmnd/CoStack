"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tag, Globe, Loader2 } from "lucide-react";
import { SearchResultItem } from "@/lib/stack-parser";

const ROTATING_EXAMPLES = [
  "Search what you want to install...",
  "WordPress",
  "Nginx",
  "PostgreSQL",
  "Node.js",
];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_EXAMPLES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Fetch live web suggestions on typing
  useEffect(() => {
    const clean = query.trim();
    if (!clean) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setIsOpen(true);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
        if (res.ok && isCurrent) {
          const data = await res.json();
          if (isCurrent) {
            setSuggestions(data.results || []);
            setSelectedIndex(0);
          }
        } else if (isCurrent) {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Search fetch error:", err);
        if (isCurrent) {
          setSuggestions([]);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    router.push(
      `/cmd?q=${encodeURIComponent(item.name)}&v=${encodeURIComponent(item.version)}&s=${encodeURIComponent(item.source)}`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0 && suggestions[selectedIndex]) {
      handleSelect(suggestions[selectedIndex]);
    } else if (query.trim()) {
      router.push(`/cmd?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/cmd");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (suggestions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % (suggestions.length || 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 bg-white dark:bg-black transition-colors">
      <div ref={containerRef} className="relative w-full max-w-xl">
        <form onSubmit={handleSubmit} className="w-full">
          {/* Main Search Input */}
          <div className="relative flex items-center rounded-2xl border border-zinc-200/90 bg-white/95 shadow-xl backdrop-blur-md dark:border-zinc-800/90 dark:bg-black/95 transition-all focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20 black-shine">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpen(true);
              }}
              placeholder={ROTATING_EXAMPLES[placeholderIndex]}
              className="w-full bg-transparent px-6 py-4 text-base text-zinc-950 placeholder-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder-zinc-600 font-normal tracking-tight transition-all"
              autoFocus
            />

            {isLoading && (
              <div className="pr-5">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              </div>
            )}
          </div>

          {/* Under the search bar: "Press Enter to build" */}
          <div className="mt-3 text-center">
            <span className="text-xs text-zinc-400 dark:text-zinc-600 tracking-tight select-none">
              Press Enter to build
            </span>
          </div>
        </form>

        {/* Live Search Suggestions Dropdown showing Name, Version, Source */}
        {isOpen && query.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-72 w-full overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-zinc-800/90 dark:bg-black/95 transition-all animate-in fade-in slide-in-from-top-2">
            {isLoading && suggestions.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                <span>Searching web...</span>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    selectedIndex === idx
                      ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  {/* Left: Name and Version */}
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-medium text-sm text-zinc-950 dark:text-zinc-50 truncate">
                      {item.name}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                      <Tag className="h-2.5 w-2.5 text-purple-500" />
                      {item.version}
                    </span>
                  </div>

                  {/* Right: Official Source */}
                  {item.source && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      <Globe className="h-3 w-3 text-zinc-400" />
                      <span className="truncate max-w-[150px]">{item.source}</span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              !isLoading && (
                <div className="flex flex-col items-center justify-center py-3.5 px-4 text-center">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    No official packages matched &quot;{query.trim()}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelect({
                        id: query.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                        name: query.trim(),
                        version: "latest",
                        source: `${query.toLowerCase().replace(/[^a-z0-9_-]/g, "")}.com`,
                        sourceUrl: "",
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    + Add package &quot;{query.trim()}&quot; to stack
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
