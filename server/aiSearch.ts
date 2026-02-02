import { GoogleGenerativeAI } from "@google/generative-ai";
import { bookCatalog } from "./bookCatalog";
import { searchGoogleBooks } from "./googleBooks";
import { searchWeb } from "./webSearch";
import type { Book, SearchResult, BookSource, MatchConfidenceTier } from "@shared/schema";

// Initialize Gemini AI using Replit AI Integrations
const ai = new GoogleGenerativeAI(
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY || ""
);

// System prompt for AI-powered spiritual book search with internet results
const SYSTEM_PROMPT = `You are an expert librarian specializing in spiritual and religious literature from various traditions. Your task is to evaluate and rank books based on their relevance to the user's spiritual/philosophical query.

EVALUATION CRITERIA:
1. RELEVANCE: How directly does the book address the user's query?
2. AUTHENTICITY: Is this a genuine spiritual/philosophical text (not just mentioning keywords)?
3. QUALITY: Consider author reputation, publisher, and depth of content

SCORING GUIDELINES:
- 90-100 (Strong Match): Topic is central to the book; author is a recognized expert
- 70-89 (Good Match): Topic is clearly covered; book is relevant to the spiritual path
- 50-69 (Potential Match): Related content but topic may be secondary
- Below 50: Exclude from results - not sufficiently relevant

For each book, provide:
1. relevanceScore: Numerical score 0-100
2. aiDescription: Brief (max 200 chars) explanation of why this book matches the query
3. matchReason: Key reason for the relevance score
4. matchedTopics: Topics from the book that match the query

Respond in valid JSON format only.`;

interface AIMatchResult {
  bookId: string;
  relevanceScore: number;
  aiDescription: string;
  matchReason?: string;
  matchedTopics?: string[];
}

interface AIResponse {
  matches: AIMatchResult[];
  interpretation: string;
}

// Helper to determine confidence tier from score
function getConfidenceTier(score: number): MatchConfidenceTier {
  if (score >= 90) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "potential";
  return "weak";
}

export async function searchBooksWithAI(
  query: string,
  sources?: BookSource[]
): Promise<{ results: SearchResult[]; searchTime: number }> {
  const startTime = Date.now();

  // Determine which sources to search
  const searchCatalog = !sources || sources.length === 0 || 
    sources.some(s => s !== "google_books" && s !== "web_search");
  const searchInternet = !sources || sources.length === 0 || 
    sources.includes("google_books");
  const searchEntireWeb = !sources || sources.length === 0 || 
    sources.includes("web_search");

  // Search catalog, Google Books, and entire web in parallel for comprehensive results
  const [catalogBooks, googleBooksResults, webSearchResults] = await Promise.all([
    searchCatalog ? getCatalogBooks(sources) : Promise.resolve([]),
    searchInternet ? searchGoogleBooks(query, 25) : Promise.resolve([]),
    searchEntireWeb ? searchWeb(query, 40) : Promise.resolve([]), // More web results for broader discovery
  ]);

  // Combine all books for AI evaluation - prioritize web results for the broadest discovery
  // Take proportional samples to balance coverage: more web books since user wants "entire web"
  const maxCatalogBooks = Math.min(catalogBooks.length, 15);
  const maxGoogleBooks = Math.min(googleBooksResults.length, 25);
  const maxWebBooks = Math.min(webSearchResults.length, 50); // Significantly more web results
  
  const sampledCatalog = catalogBooks.slice(0, maxCatalogBooks);
  const sampledGoogle = googleBooksResults.slice(0, maxGoogleBooks);
  const sampledWeb = webSearchResults.slice(0, maxWebBooks);
  
  // Order: web search first (most comprehensive), then Google Books, then catalog
  const allBooks = [...sampledWeb, ...sampledGoogle, ...sampledCatalog];

  if (allBooks.length === 0) {
    return { results: [], searchTime: (Date.now() - startTime) / 1000 };
  }

  // Create book summary for AI (limit to prevent token overflow)
  const bookSummaries = allBooks.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description?.substring(0, 500),
    category: book.category,
    language: book.language,
    source: book.source,
    keyTopics: book.keyTopics || [],
    theologicalTags: book.theologicalTags || [],
  }));

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}

User's search query: "${query}"

Available books to evaluate:
${JSON.stringify(bookSummaries, null, 2)}

Evaluate each book's relevance to the spiritual/philosophical query. Return JSON in this format:
{
  "matches": [
    {
      "bookId": "book-id",
      "relevanceScore": 85,
      "aiDescription": "Brief description of why this book matches (max 200 chars)",
      "matchReason": "Key reason for the score",
      "matchedTopics": ["topic1", "topic2"]
    }
  ],
  "interpretation": "Brief interpretation of what the user is seeking"
}

IMPORTANT:
- Only include books with relevanceScore >= 50
- Order by relevanceScore descending
- Be selective - prioritize genuinely relevant spiritual texts
- Only return valid JSON, no additional text.`,
            },
          ],
        },
      ],
    });

    const responseText = response.response.text() || "";
    
    // Parse JSON from response
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0];
      }
    }

    const aiResponse: AIResponse = JSON.parse(jsonText);

    // Map AI results to full book data
    const bookMap = new Map(allBooks.map(b => [b.id, b]));
    
    const results: SearchResult[] = aiResponse.matches
      .filter((match) => match.relevanceScore >= 50)
      .reduce<SearchResult[]>((acc, match) => {
        const book = bookMap.get(match.bookId);
        if (!book) return acc;

        // Mark catalog books as grounded, internet books as verified by AI but not grounded to source
        const isFromCatalog = book.source !== "google_books";
        
        acc.push({
          book: {
            ...book,
            aiDescription: match.aiDescription,
          },
          relevanceScore: match.relevanceScore,
          matchReason: match.matchReason,
          confidenceTier: getConfidenceTier(match.relevanceScore),
          matchedTopics: match.matchedTopics,
          isGrounded: isFromCatalog, // Only catalog books have verified metadata
        });
        return acc;
      }, [])
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const searchTime = (Date.now() - startTime) / 1000;

    return { results, searchTime };
  } catch (error) {
    console.error("AI search error:", error);
    
    // Fallback to basic keyword search
    return fallbackSearch(query, allBooks, startTime);
  }
}

function getCatalogBooks(sources?: BookSource[]): Book[] {
  if (!sources || sources.length === 0) {
    return bookCatalog;
  }
  
  // Filter out google_books and web_search since those are handled separately
  const catalogSources = sources.filter(s => s !== "google_books" && s !== "web_search");
  if (catalogSources.length === 0) {
    return [];
  }
  
  return bookCatalog.filter((book) => {
    // Type assertion since book.source is from the catalog (not google_books or web_search)
    return (catalogSources as readonly string[]).includes(book.source);
  });
}

// Fallback keyword-based search
function fallbackSearch(
  query: string,
  books: Book[],
  startTime: number
): { results: SearchResult[]; searchTime: number } {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scored = books
    .map((book) => {
      const searchableText = `${book.title} ${book.author || ""} ${book.description} ${book.category || ""} ${(book.keyTopics || []).join(" ")}`.toLowerCase();
      
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
        matchReason: "Matched using keyword search",
        confidenceTier: getConfidenceTier(Math.min(score, 95)),
        isGrounded: true,
      } as SearchResult;
    })
    .filter((result) => result.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 30);

  const searchTime = (Date.now() - startTime) / 1000;

  return { results: scored, searchTime };
}
