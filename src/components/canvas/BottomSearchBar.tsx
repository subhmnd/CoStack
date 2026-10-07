"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Tag, Loader2 } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";
import { SearchResultItem } from "@/lib/stack-parser";

export function BottomSearchBar() {
  const { addNodeFromSearch, searchQuery, setSearchQuery } = useStackStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live web search fetching with debounce
  useEffect(() => {
    const clean = searchQuery.trim();
    if (!clean) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
        if (res.ok && isCurrent) {
          const data = await res.json();
          if (isCurrent) {
            setSuggestions(data.results || []);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.error("Live web search error:", err);
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

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

  const handleSelectSuggestion = (item: SearchResultItem) => {
    addNodeFromSearch(item);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (suggestions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % (suggestions.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else if (searchQuery.trim()) {
        handleSelectSuggestion({
          id: searchQuery.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
          name: searchQuery.trim(),
          version: "latest",
          source: `${searchQuery.toLowerCase().replace(/[^a-z0-9_-]/g, "")}.org`,
          sourceUrl: "",
        });
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4"
    >
      {/* Suggestions Floating Above Input showing ONLY Name, Version, Source */}
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div className="mb-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-zinc-800/90 dark:bg-black/95 transition-all animate-in fade-in slide-in-from-bottom-2">
          {isLoading && suggestions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
              <span>Searching web...</span>
            </div>
          ) : (
            suggestions.map((item, idx) => (
              <button
                key={`${item.id}-${idx}`}
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors ${
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
          )}
        </div>
      )}

      {/* Main Search Input: Clean, sleek, no awkward Enter box */}
      <div className="relative flex items-center rounded-2xl border border-zinc-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-zinc-800/80 dark:bg-black/95 transition-all focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search stack..."
          className="w-full bg-transparent px-5 py-3.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-600 font-normal tracking-tight"
        />

        {isLoading && (
          <div className="pr-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
          </div>
        )}
      </div>
    </div>
  );
}
