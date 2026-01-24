import { Library, Sparkles, Globe } from "lucide-react";

export function HeroSection() {
  return (
    <div className="text-center mb-10">
      <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
        Spiritual Literature Search
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
        Discover sacred texts across multiple platforms with AI-powered contextual understanding. 
        Find books on Vedanta, Yoga, Non-duality, and more.
      </p>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-md border border-card-border">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI-Powered Search</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-md border border-card-border">
          <Library className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">4 Major Sources</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-md border border-card-border">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Unified Pricing</span>
        </div>
      </div>
    </div>
  );
}
