"use client";

import React, { useState, useRef, useEffect } from "react";
import { CornerDownLeft, Sparkles, Layers } from "lucide-react";
import { useStackStore } from "@/lib/store/stack-store";
import { generateSearchSuggestions, SearchSuggestion } from "@/lib/stack-parser";

export function BottomSearchBar() {
  const { addSoftwareStack, searchQuery, setSearchQuery } = useStackStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions: SearchSuggestion[] = generateSearchSuggestions(searchQuery);

  useEffect(() => {
    setSelectedIndex(0);
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

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    addSoftwareStack(suggestion.items);
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
        const directItems = searchQuery
          .split(/[+,&]/)
          .map((s) => s.trim())
          .filter(Boolean);
        addSoftwareStack(directItems);
        setSearchQuery("");
        setIsOpen(false);
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
      {/* Suggestions Floating Above Input */}
      {isOpen && suggestions.length > 0 && (
        <div className="mb-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-zinc-800/90 dark:bg-black/95 transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Suggested Stacks
          </div>
          {suggestions.map((suggestion, idx) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                selectedIndex === idx
                  ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Layers className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {suggestion.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">
                    {suggestion.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                <span>Add</span>
                <CornerDownLeft className="h-2.5 w-2.5" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Search Input */}
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
          placeholder="Search stack (e.g. Nextcloud, WordPress + MariaDB)..."
          className="w-full bg-transparent px-4 py-3.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-600 font-normal"
        />

        <div className="flex items-center gap-2 pr-3">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Enter ↵
          </kbd>
        </div>
      </div>
    </div>
  );
}
