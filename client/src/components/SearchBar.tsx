import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function SearchBar({ onSearch, isLoading, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || "Search for spiritual texts..."}
            className="pl-12 pr-4 h-14 text-lg bg-card border-card-border rounded-md"
            data-testid="input-search"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isLoading || !query.trim()}
          className="h-14 px-8 gap-2"
          data-testid="button-search"
        >
          <Sparkles className="h-4 w-4" />
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-3 text-center">
        Seek: "The path of devotion" or "Secrets of the Mahavidyas" or "Understanding Brahman"
      </p>
    </form>
  );
}
