import { Scroll, Sparkles, BookMarked } from "lucide-react";

export function HeroSection() {
  return (
    <div className="text-center mb-10">
      <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
        Seek the Ancient Wisdom
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
        Journey through millennia of sacred knowledge. From the Vedas to the Tantras, 
        discover the texts that have illuminated seekers for ages.
      </p>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-md border border-card-border">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Wisdom-Guided Search</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-md border border-card-border">
          <Scroll className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">9 Sacred Archives</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-md border border-card-border">
          <BookMarked className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Verified Sources</span>
        </div>
      </div>
    </div>
  );
}
