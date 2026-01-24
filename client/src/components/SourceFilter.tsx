import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { platforms, type BookSource } from "@shared/schema";

interface SourceFilterProps {
  selectedSources: BookSource[];
  onChange: (sources: BookSource[]) => void;
}

export function SourceFilter({ selectedSources, onChange }: SourceFilterProps) {
  const toggleSource = (sourceId: BookSource) => {
    if (selectedSources.includes(sourceId)) {
      onChange(selectedSources.filter((s) => s !== sourceId));
    } else {
      onChange([...selectedSources, sourceId]);
    }
  };

  const allSelected = selectedSources.length === 0 || selectedSources.length === platforms.length;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <Button
        variant={allSelected ? "default" : "outline"}
        size="sm"
        onClick={() => onChange([])}
        className="gap-2"
        data-testid="button-filter-all"
      >
        {allSelected && <Check className="h-3.5 w-3.5" />}
        All Sources
      </Button>
      {platforms.map((platform) => {
        const isSelected = selectedSources.includes(platform.id);
        return (
          <Button
            key={platform.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSource(platform.id)}
            className="gap-2"
            data-testid={`button-filter-${platform.id}`}
          >
            {isSelected && <Check className="h-3.5 w-3.5" />}
            {platform.name}
          </Button>
        );
      })}
    </div>
  );
}
