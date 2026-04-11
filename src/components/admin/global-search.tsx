"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Zap, FileText, Users, ToggleLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchResultItem } from "./search-result-item";

interface SearchResult {
  id: string;
  category: "users" | "posts" | "templates" | "feature-flags";
  icon: React.ElementType;
  title: string;
  description?: string;
  metadata?: string;
  href: string;
}

export function GlobalAdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Fetch search results
  useEffect(() => {
    if (!query.trim()) {
      setResults([]); // eslint-disable-line react-hooks/set-state-in-effect
      setSelectedIndex(0);
      return;
    }

    setLoading(true);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 5000);

    fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
      signal: abortController.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        setResults(
          json.data?.map((item: any) => ({
            id: item.id,
            category: item.category,
            icon: getIconForCategory(item.category),
            title: item.title,
            description: item.description,
            metadata: item.metadata,
            href: item.href,
          })) ?? []
        );
        setSelectedIndex(0);
      })
      .catch(() => setResults([]))
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(results.length, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1)
        );
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
    setQuery("");
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="group text-muted-foreground hover:text-foreground transition-colors"
        title="Search (Ctrl+K)"
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20">
      <div className="bg-background mx-4 w-full max-w-2xl overflow-hidden rounded-lg border shadow-lg">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search users, posts, templates, flags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:outline-none"
            autoComplete="off"
          />
          <button
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto px-2 py-2">
          {loading && query.trim() && (
            <div className="text-muted-foreground py-8 text-center text-sm">Searching...</div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No results found for "{query}"
            </div>
          )}

          {!query.trim() && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              Start typing to search...
            </div>
          )}

          {results.map((result, index) => (
            <SearchResultItem
              key={result.id}
              icon={<result.icon className="h-4 w-4" />}
              title={result.title}
              description={result.description}
              metadata={result.metadata}
              isHighlighted={index === selectedIndex}
              onClick={() => handleSelectResult(result)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="bg-muted/30 text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <div className="flex gap-4">
            <span>
              <span className="font-semibold">↑↓</span> Navigate
            </span>
            <span>
              <span className="font-semibold">Enter</span> Select
            </span>
            <span>
              <span className="font-semibold">Esc</span> Close
            </span>
          </div>
          <span>
            <span className="font-semibold">Ctrl+K</span> Toggle
          </span>
        </div>
      </div>
    </div>
  );
}

function getIconForCategory(category: string): React.ElementType {
  switch (category) {
    case "users":
      return Users;
    case "posts":
      return FileText;
    case "templates":
      return Zap;
    case "feature-flags":
      return ToggleLeft;
    default:
      return Search;
  }
}
