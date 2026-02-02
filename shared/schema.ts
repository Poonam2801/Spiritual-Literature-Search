import { z } from "zod";

// Book sources - the platforms we aggregate from
export const bookSources = ["exotic_india", "gita_press", "chaukhamba", "archive_org", "amazon", "flipkart", "bookish_santa", "vedic_books", "mlbd", "google_books", "web_search"] as const;
export type BookSource = typeof bookSources[number];

// Book schema for spiritual literature with enhanced metadata for groundedness
export const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  description: z.string(),
  aiDescription: z.string().optional(),
  source: z.enum(bookSources),
  sourceUrl: z.string().url(),
  price: z.number().nullable(),
  currency: z.enum(["INR", "USD"]).default("INR"),
  isAvailable: z.boolean().default(true),
  language: z.string().default("Sanskrit"),
  category: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  // Enhanced metadata for groundedness and accurate matching
  tableOfContents: z.array(z.string()).optional(), // Chapter/section titles
  theologicalTags: z.array(z.string()).optional(), // e.g., ["Advaita", "Kundalini", "Bhakti"]
  keyTopics: z.array(z.string()).optional(), // Specific topics covered in the book
  contextualSnippets: z.array(z.object({
    chapter: z.string().optional(),
    text: z.string(),
  })).optional(), // Relevant text excerpts that prove content
});

export type Book = z.infer<typeof bookSchema>;

// Search query schema
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  sources: z.array(z.enum(bookSources)).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  language: z.string().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// Match confidence tiers for UI display
export const matchConfidenceTiers = ["strong", "good", "potential", "weak"] as const;
export type MatchConfidenceTier = typeof matchConfidenceTiers[number];

// Search result with AI-enhanced metadata and groundedness info
export const searchResultSchema = z.object({
  book: bookSchema,
  relevanceScore: z.number().min(0).max(100),
  matchReason: z.string().optional(),
  // Enhanced groundedness fields
  confidenceTier: z.enum(matchConfidenceTiers).optional(), // strong (90+), good (70-89), potential (50-69), weak (<50)
  citationSnippet: z.string().optional(), // Excerpt showing where keyword was found
  citationLocation: z.string().optional(), // e.g., "Chapter 4: The Ten Mahavidyas"
  matchedTopics: z.array(z.string()).optional(), // Which topics matched the query
  isGrounded: z.boolean().optional(), // True if match is verified against content
});

export type SearchResult = z.infer<typeof searchResultSchema>;

// Search response
export const searchResponseSchema = z.object({
  results: z.array(searchResultSchema),
  query: z.string(),
  totalResults: z.number(),
  searchTime: z.number(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

// Source platform info
export const sourcePlatformSchema = z.object({
  id: z.enum(bookSources),
  name: z.string(),
  description: z.string(),
  baseUrl: z.string(),
  logoColor: z.string(),
});

export type SourcePlatform = z.infer<typeof sourcePlatformSchema>;

// Platform metadata
export const platforms: SourcePlatform[] = [
  {
    id: "exotic_india",
    name: "Exotic India",
    description: "Premier source for Indian art and spiritual literature",
    baseUrl: "https://www.exoticindiaart.com",
    logoColor: "#C45C26",
  },
  {
    id: "gita_press",
    name: "Gita Press",
    description: "Authentic Hindu religious texts at affordable prices",
    baseUrl: "https://gitapress.org",
    logoColor: "#D4A574",
  },
  {
    id: "chaukhamba",
    name: "Chaukhamba",
    description: "Academic Sanskrit and Ayurvedic literature",
    baseUrl: "https://chaukhamba.com",
    logoColor: "#8B4513",
  },
  {
    id: "archive_org",
    name: "Archive.org",
    description: "Public domain spiritual texts and manuscripts",
    baseUrl: "https://archive.org",
    logoColor: "#428BCA",
  },
  {
    id: "amazon",
    name: "Amazon",
    description: "Wide selection of spiritual books with fast delivery",
    baseUrl: "https://www.amazon.in",
    logoColor: "#FF9900",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    description: "Popular Indian e-commerce platform for books",
    baseUrl: "https://www.flipkart.com",
    logoColor: "#2874F0",
  },
  {
    id: "bookish_santa",
    name: "Bookish Santa",
    description: "Curated collection of rare and spiritual books",
    baseUrl: "https://www.bookishsanta.com",
    logoColor: "#E74C3C",
  },
  {
    id: "vedic_books",
    name: "Vedic Books",
    description: "Specialized in Vedic and Sanskrit literature",
    baseUrl: "https://www.vedicbooks.net",
    logoColor: "#8E44AD",
  },
  {
    id: "mlbd",
    name: "MLBD",
    description: "Motilal Banarsidass - academic publisher since 1903",
    baseUrl: "https://www.mlbd.com",
    logoColor: "#2C3E50",
  },
  {
    id: "google_books",
    name: "Google Books",
    description: "Discover spiritual texts from across the world",
    baseUrl: "https://books.google.com",
    logoColor: "#4285F4",
  },
  {
    id: "web_search",
    name: "Web Search",
    description: "Books discovered across the entire internet",
    baseUrl: "https://www.google.com",
    logoColor: "#34A853",
  },
];

// User schema (keeping existing)
export const users = {
  id: "varchar",
  username: "text",
  password: "text",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
