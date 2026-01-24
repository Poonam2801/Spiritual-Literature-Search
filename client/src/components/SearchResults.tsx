import { Clock, BookMarked } from "lucide-react";
import { BookCard } from "./BookCard";
import type { SearchResponse } from "@shared/schema";

interface SearchResultsProps {
  response: SearchResponse;
}

export function SearchResults({ response }: SearchResultsProps) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Results header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <BookMarked className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-semibold">
            {response.totalResults} {response.totalResults === 1 ? "result" : "results"} for "{response.query}"
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{response.searchTime.toFixed(2)}s</span>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {response.results.map((result) => (
          <BookCard key={result.book.id} result={result} />
        ))}
      </div>
    </div>
  );
}
