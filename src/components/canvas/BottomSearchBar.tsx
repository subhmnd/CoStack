"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Tag, Loader2, X, Layers } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";
import { SearchResultItem } from "@/lib/stack-parser";

export function BottomSearchBar() {
  const {
    addNodeFromSearch,
    searchQuery,
    setSearchQuery,
    nodes,
    selectedNodeId,
    setSelectedNodeId,
  } = useStackStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Active parent context: selected node or inline combo prefix like "cpanel + php"
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedParentName = selectedNode ? selectedNode.data.name : "";

  let activeParent = selectedParentName;
  let effectiveQuery = searchQuery.trim();

  if (effectiveQuery.includes("+")) {
    const parts = effectiveQuery.split("+");
    if (parts.length >= 2 && parts[0].trim()) {
      activeParent = parts[0].trim();
      effectiveQuery = parts.slice(1).join(" ").trim();
    }
  }

  // Live web search fetching with debounce
  useEffect(() => {
    if (!effectiveQuery) {
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
        const url =
          `/api/search?q=${encodeURIComponent(effectiveQuery)}` +
          (activeParent ? `&parent=${encodeURIComponent(activeParent)}` : "");
        const res = await fetch(url);
        if (res.ok && isCurrent) {
          const data = await res.json();
          if (isCurrent) {
            setSuggestions(data.results || []);
            setSelectedIndex(0);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Live web search error:", err);
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
  }, [effectiveQuery, activeParent]);

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
      } else if (effectiveQuery) {
        handleSelectSuggestion({
          id: effectiveQuery.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
          name: effectiveQuery,
          version: "latest",
          source: `${effectiveQuery.toLowerCase().replace(/[^a-z0-9_-]/g, "")}.com`,
          sourceUrl: "",
          command: `$PKG_INSTALL ${effectiveQuery.toLowerCase().replace(/[^a-z0-9_-]/g, "")}`,
        });
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
    >
      {/* Suggestions Floating Above Input */}
      {isOpen && searchQuery.trim().length > 0 && (
        <div className="mb-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-zinc-800/90 dark:bg-black/95 transition-all animate-in fade-in slide-in-from-bottom-2">
          {isLoading && suggestions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
              <span>Searching web...</span>
            </div>
          ) : suggestions.length > 0 ? (
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
                {/* Left: Name, Version, and Context Badges */}
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium text-sm text-zinc-950 dark:text-zinc-50 truncate">
                    {item.name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                    <Tag className="h-2.5 w-2.5 text-purple-500" />
                    {item.version}
                  </span>
                  {item.command?.startsWith("docker run") && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                      Container
                    </span>
                  )}
                  {item.name.includes("Module") && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900">
                      Panel Module
                    </span>
                  )}
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
          ) : !isLoading && (
            <div className="flex flex-col items-center justify-center py-3.5 px-4 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                No packages matched &quot;{effectiveQuery}&quot;
              </p>
              <button
                onClick={() =>
                  handleSelectSuggestion({
                    id: effectiveQuery.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                    name: effectiveQuery,
                    version: "latest",
                    source: `${effectiveQuery.toLowerCase().replace(/[^a-z0-9_-]/g, "")}.com`,
                    sourceUrl: "",
                    command: `$PKG_INSTALL ${effectiveQuery.toLowerCase().replace(/[^a-z0-9_-]/g, "")}`,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors shadow-sm"
              >
                + Add package &quot;{effectiveQuery}&quot; to stack
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Search Input */}
      <div className="relative flex items-center rounded-2xl border border-zinc-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-zinc-800/80 dark:bg-black/95 transition-all focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20">
        {/* Active Context Chip */}
        {activeParent && (
          <div className="flex items-center gap-1.5 ml-3 mr-1 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/80 text-[11px] font-medium text-purple-700 dark:text-purple-300 flex-shrink-0 animate-in fade-in">
            <Layers className="h-3 w-3 text-purple-500" />
            <span className="opacity-75">Inside:</span>
            <span className="font-semibold">{activeParent}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId(null);
                if (searchQuery.includes("+")) {
                  setSearchQuery(searchQuery.split("+").slice(1).join(" ").trim());
                }
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-purple-200/60 dark:hover:bg-purple-800/60 text-purple-600 dark:text-purple-400"
              title="Clear context to search Native / Host"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => {
            if (searchQuery.trim().length > 0) setIsOpen(true);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            activeParent
              ? `Search ${activeParent} modules (e.g. php, docker, mysql)...`
              : "Search stack (e.g. cPanel, aaPanel, Docker)..."
          }
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
