import { z } from "zod";

// Book sources - the platforms we aggregate from
export const bookSources = ["exotic_india", "gita_press", "chaukhamba", "archive_org"] as const;
export type BookSource = typeof bookSources[number];

// Book schema for spiritual literature
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
  imageUrl: z.string().optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
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

// Search result with AI-enhanced metadata
export const searchResultSchema = z.object({
  book: bookSchema,
  relevanceScore: z.number().min(0).max(100),
  matchReason: z.string().optional(),
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
