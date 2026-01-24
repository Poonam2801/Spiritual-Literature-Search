import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { HeroSection } from "@/components/HeroSection";
import { SearchBar } from "@/components/SearchBar";
import { SourceFilter } from "@/components/SourceFilter";
import { SearchResults } from "@/components/SearchResults";
import { LoadingState, EmptyState, ErrorState } from "@/components/LoadingState";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import type { SearchResponse, BookSource } from "@shared/schema";

export default function Home() {
  const [selectedSources, setSelectedSources] = useState<BookSource[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/search", {
        query,
      });
      const data = await response.json();
      return data as SearchResponse;
    },
    onSuccess: (data) => {
      setSearchResponse(data);
      setSearchError(null);
      setHasSearched(true);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while searching";
      setSearchError(errorMessage);
      setHasSearched(true);
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter results on the client side based on selected sources
  const filteredResponse = useMemo(() => {
    if (!searchResponse) return null;
    if (selectedSources.length === 0) return searchResponse;
    
    const filteredResults = searchResponse.results.filter(
      (result) => selectedSources.includes(result.book.source)
    );
    
    return {
      ...searchResponse,
      results: filteredResults,
      totalResults: filteredResults.length,
    };
  }, [searchResponse, selectedSources]);

  const handleSearch = (query: string) => {
    setLastQuery(query);
    setSearchError(null);
    searchMutation.mutate(query);
  };

  const handleRetry = () => {
    if (lastQuery) {
      handleSearch(lastQuery);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-semibold text-foreground">
              The Seeker's Library
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Hero and Search */}
        <HeroSection />
        
        <div className="mb-8">
          <SearchBar 
            onSearch={handleSearch} 
            isLoading={searchMutation.isPending}
            placeholder="What wisdom do you seek? (e.g., 'teachings on liberation')"
          />
        </div>

        {/* Source filters */}
        <div className="mb-10">
          <SourceFilter 
            selectedSources={selectedSources}
            onChange={setSelectedSources}
          />
        </div>

        {/* Results section */}
        <div className="min-h-[400px]">
          {searchMutation.isPending && <LoadingState />}
          
          {!searchMutation.isPending && searchError && (
            <ErrorState message={searchError} onRetry={handleRetry} />
          )}
          
          {!searchMutation.isPending && !searchError && filteredResponse && filteredResponse.results && filteredResponse.results.length > 0 && (
            <SearchResults response={filteredResponse} />
          )}
          
          {!searchMutation.isPending && !searchError && hasSearched && filteredResponse && (!filteredResponse.results || filteredResponse.results.length === 0) && (
            <EmptyState />
          )}

          {/* Initial state - show sample queries */}
          {!hasSearched && !searchMutation.isPending && !searchError && (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-6">
                Begin your quest for eternal truth in the sacred scriptures
              </p>
              <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                {[
                  "Path to self-realization",
                  "Song of the Divine",
                  "Secrets of Kundalini",
                  "The nature of consciousness",
                  "Tantric wisdom",
                  "Paths of meditation",
                ].map((query) => (
                  <button
                    key={query}
                    onClick={() => handleSearch(query)}
                    className="px-4 py-2 text-sm bg-card hover-elevate rounded-md border border-card-border text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-sample-${query.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
