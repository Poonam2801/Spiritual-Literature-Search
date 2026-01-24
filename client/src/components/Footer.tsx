import { Heart, ExternalLink } from "lucide-react";
import { platforms } from "@shared/schema";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6">
          {/* Source platforms */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Aggregating spiritual literature from
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {platforms.map((platform) => (
                <a
                  key={platform.id}
                  href={platform.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`link-footer-${platform.id}`}
                >
                  {platform.name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center max-w-lg">
            This is a search aggregator. All prices and availability are sourced from the respective platforms. 
            Click through to verify before purchase.
          </p>

          {/* Made with love */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <span>for seekers of wisdom</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
