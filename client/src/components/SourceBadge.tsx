import { Badge } from "@/components/ui/badge";
import type { BookSource } from "@shared/schema";

interface SourceBadgeProps {
  source: BookSource;
  className?: string;
}

const sourceConfig: Record<BookSource, { name: string; color: string }> = {
  exotic_india: { name: "Exotic India", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  gita_press: { name: "Gita Press", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  chaukhamba: { name: "Chaukhamba", color: "bg-stone-100 text-stone-800 dark:bg-stone-800/30 dark:text-stone-300" },
  archive_org: { name: "Archive.org", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
};

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config = sourceConfig[source];

  return (
    <Badge 
      variant="secondary" 
      className={`${config.color} border-0 ${className || ""}`}
      data-testid={`badge-source-${source}`}
    >
      {config.name}
    </Badge>
  );
}
