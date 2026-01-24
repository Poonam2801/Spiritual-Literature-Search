import { Loader2, BookOpen, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Loading header */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <p className="text-lg text-muted-foreground">
          Consulting the ancient scrolls...
        </p>
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      </div>

      {/* Skeleton cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div>
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="w-full max-w-2xl mx-auto text-center py-16">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="font-serif text-2xl font-semibold mb-3">
        The path remains hidden
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        No sacred texts match your query. Perhaps rephrase your question, or seek with different words to illuminate the way.
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="w-full max-w-2xl mx-auto text-center py-16">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
        <BookOpen className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="font-serif text-2xl font-semibold mb-3">
        Search failed
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {message || "We encountered an error while searching. Please try again."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-retry-search"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
