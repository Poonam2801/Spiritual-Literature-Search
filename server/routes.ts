import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchBooksWithAI } from "./aiSearch";
import { searchQuerySchema, type SearchResponse } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // AI-powered contextual search endpoint
  app.post("/api/search", async (req, res) => {
    try {
      // Validate request body
      const validatedQuery = searchQuerySchema.parse(req.body);
      
      // Perform AI-powered search
      const { results, searchTime } = await searchBooksWithAI(
        validatedQuery.query,
        validatedQuery.sources
      );

      const response: SearchResponse = {
        results,
        query: validatedQuery.query,
        totalResults: results.length,
        searchTime,
      };

      res.json(response);
    } catch (error) {
      console.error("Search error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid search query",
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: "Search failed. Please try again." 
      });
    }
  });

  // Get all books (for browsing)
  app.get("/api/books", async (req, res) => {
    try {
      const source = req.query.source as string | undefined;
      
      let books;
      if (source && ["exotic_india", "gita_press", "chaukhamba", "archive_org"].includes(source)) {
        books = await storage.getBooksBySource(source as any);
      } else {
        books = await storage.getAllBooks();
      }
      
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  // Get single book by ID
  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBookById(req.params.id);
      
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      res.json(book);
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  return httpServer;
}
