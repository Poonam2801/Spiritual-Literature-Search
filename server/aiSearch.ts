import { GoogleGenAI } from "@google/genai";
import { bookCatalog } from "./bookCatalog";
import type { Book, SearchResult, BookSource } from "@shared/schema";

// Initialize Gemini AI using Replit AI Integrations
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// System prompt for the AI librarian
const SYSTEM_PROMPT = `You are an expert librarian specializing in Indian spiritual literature, including Vedanta, Yoga, Buddhism, Tantra, and related philosophical traditions.

Your task is to analyze a user's search query and match it to books from a catalog. You should:

1. Understand the user's intent - are they looking for beginner texts, advanced philosophy, specific traditions, or practical guides?
2. Match books based on conceptual relevance, not just keyword matching
3. Consider the user's implied level of understanding
4. Provide a relevance score (0-100) for each matching book
5. Generate a brief, insightful description (max 200 chars) highlighting why the book is relevant
6. If confidence is below 80%, explain why the match might not be perfect

Respond in valid JSON format only.`;

interface AIMatchResult {
  bookId: string;
  relevanceScore: number;
  aiDescription: string;
  matchReason?: string;
}

interface AIResponse {
  matches: AIMatchResult[];
  interpretation: string;
}

export async function searchBooksWithAI(
  query: string,
  sources?: BookSource[]
): Promise<{ results: SearchResult[]; searchTime: number }> {
  const startTime = Date.now();

  // Filter catalog by sources if specified
  let filteredCatalog = sources?.length
    ? bookCatalog.filter((book) => sources.includes(book.source))
    : bookCatalog;

  // Create a simplified catalog for the AI to process
  const catalogSummary = filteredCatalog.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    category: book.category,
    language: book.language,
    source: book.source,
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}

User's search query: "${query}"

Available books catalog:
${JSON.stringify(catalogSummary, null, 2)}

Analyze the query and return the top 10 most relevant books. Return JSON in this exact format:
{
  "matches": [
    {
      "bookId": "book-id",
      "relevanceScore": 85,
      "aiDescription": "Brief description of why this book matches (max 200 chars)",
      "matchReason": "Optional: reason if score is below 80%"
    }
  ],
  "interpretation": "Brief interpretation of what the user is looking for"
}

Only return valid JSON, no additional text.`,
            },
          ],
        },
      ],
    });

    const responseText = response.text || "";
    
    // Parse JSON from response (handle potential markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0];
      }
    }

    const aiResponse: AIResponse = JSON.parse(jsonText);

    // Map AI results to full book data
    const results: SearchResult[] = aiResponse.matches
      .filter((match) => match.relevanceScore > 20) // Filter very low matches
      .map((match) => {
        const book = filteredCatalog.find((b) => b.id === match.bookId);
        if (!book) return null;

        return {
          book: {
            ...book,
            aiDescription: match.aiDescription,
          },
          relevanceScore: match.relevanceScore,
          matchReason: match.matchReason,
        };
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    const searchTime = (Date.now() - startTime) / 1000;

    return { results, searchTime };
  } catch (error) {
    console.error("AI search error:", error);
    
    // Fallback to basic keyword search if AI fails
    return fallbackSearch(query, filteredCatalog, startTime);
  }
}

// Fallback keyword-based search
function fallbackSearch(
  query: string,
  catalog: Book[],
  startTime: number
): { results: SearchResult[]; searchTime: number } {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scored = catalog
    .map((book) => {
      const searchableText = `${book.title} ${book.author || ""} ${book.description} ${book.category || ""}`.toLowerCase();
      
      let score = 0;
      for (const word of queryWords) {
        if (word.length < 3) continue;
        if (searchableText.includes(word)) {
          score += 20;
          if (book.title.toLowerCase().includes(word)) score += 15;
          if (book.category?.toLowerCase().includes(word)) score += 10;
        }
      }

      return {
        book,
        relevanceScore: Math.min(score, 95),
        matchReason: "Matched using keyword search (AI temporarily unavailable)",
      };
    })
    .filter((result) => result.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);

  const searchTime = (Date.now() - startTime) / 1000;

  return { results: scored, searchTime };
}
