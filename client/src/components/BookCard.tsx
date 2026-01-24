import { ExternalLink, BookOpen, IndianRupee, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { SourceBadge } from "./SourceBadge";
import type { SearchResult } from "@shared/schema";

interface BookCardProps {
  result: SearchResult;
}

export function BookCard({ result }: BookCardProps) {
  const { book, relevanceScore, matchReason } = result;
  const priceIcon = book.currency === "INR" ? IndianRupee : DollarSign;
  const PriceIcon = priceIcon;

  return (
    <Card 
      className="group hover-elevate overflow-visible"
      data-testid={`card-book-${book.id}`}
    >
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Book Cover */}
          <div className="shrink-0">
            {book.imageUrl ? (
              <img 
                src={book.imageUrl} 
                alt={`Cover of ${book.title}`}
                className="w-24 h-32 object-cover rounded-md shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-24 h-32 bg-muted rounded-md flex items-center justify-center ${book.imageUrl ? 'hidden' : ''}`}>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Header with source and confidence */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <SourceBadge source={book.source} />
              <ConfidenceIndicator score={relevanceScore} />
            </div>

            {/* Title and Author */}
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground leading-tight line-clamp-2">
                {book.title}
              </h3>
              {book.author && (
                <p className="text-sm text-muted-foreground mt-1">
                  by {book.author}
                </p>
              )}
            </div>

            {/* AI-generated description */}
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {book.aiDescription || book.description}
            </p>

          {/* Match reason if available */}
          {matchReason && relevanceScore < 80 && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {matchReason}
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {book.language && (
              <Badge variant="outline" className="text-xs">
                {book.language}
              </Badge>
            )}
            {book.category && (
              <Badge variant="outline" className="text-xs">
                {book.category}
              </Badge>
            )}
            {!book.isAvailable && (
              <Badge variant="destructive" className="text-xs">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Price and Action */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              {book.price !== null ? (
                <>
                  <PriceIcon className="h-4 w-4 text-primary" />
                  <span className="text-lg font-semibold text-primary">
                    {book.price.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  Free
                </span>
              )}
            </div>
            <Button 
              asChild 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <a 
                href={book.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid={`link-book-${book.id}`}
              >
                <BookOpen className="h-4 w-4" />
                View on Source
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
