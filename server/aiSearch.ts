import { GoogleGenAI } from "@google/genai";
import { bookCatalog } from "./bookCatalog";
import type { Book, SearchResult, BookSource, MatchConfidenceTier } from "@shared/schema";

// Initialize Gemini AI using Replit AI Integrations
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// System prompt for grounded AI search with hallucination prevention
const SYSTEM_PROMPT = `You are an expert librarian specializing in Indian spiritual literature. Your PRIMARY DUTY is GROUNDEDNESS - you must ONLY return books where you can VERIFY the search topic is actually discussed in the book.

CRITICAL RULES FOR GROUNDEDNESS:
1. NEVER assume a book covers a topic just because it sounds related
2. ONLY match books if you can find SPECIFIC EVIDENCE in the provided metadata (description, tableOfContents, keyTopics, theologicalTags)
3. If a user searches for "Chinnamasta" or "Mahavidyas" - only return books that EXPLICITLY mention these in their metadata
4. When in doubt, EXCLUDE the book rather than hallucinate a connection
5. For each match, you MUST cite WHERE in the book the topic is covered (chapter, section, or content snippet)

SCORING CRITERIA:
- 90-100 (Strong Match): Topic explicitly named in title, table of contents, or keyTopics
- 70-89 (Good Match): Topic clearly covered based on description and theologicalTags
- 50-69 (Potential Match): Related content exists but topic not explicitly named
- Below 50: DO NOT INCLUDE - insufficient evidence of coverage

HALLUCINATION PREVENTION:
- If you cannot find direct textual evidence linking the book to the query, mark isGrounded: false
- Books with isGrounded: false should have relevanceScore below 50 and will be filtered out

Respond in valid JSON format only.`;

interface AIMatchResult {
  bookId: string;
  relevanceScore: number;
  aiDescription: string;
  matchReason?: string;
  citationSnippet?: string; // Text excerpt showing relevance
  citationLocation?: string; // Where in the book (chapter, section)
  matchedTopics?: string[]; // Which keyTopics/tags matched
  isGrounded: boolean; // True only if verified against metadata
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

  // Filter catalog by sources if specified
  let filteredCatalog = sources?.length
    ? bookCatalog.filter((book) => sources.includes(book.source))
    : bookCatalog;

  // Create enriched catalog summary with groundedness metadata for AI
  const catalogSummary = filteredCatalog.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    category: book.category,
    language: book.language,
    source: book.source,
    // Enhanced metadata for grounded matching
    tableOfContents: book.tableOfContents || [],
    theologicalTags: book.theologicalTags || [],
    keyTopics: book.keyTopics || [],
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

Analyze the query and return ONLY books where you can VERIFY the topic is covered based on the metadata provided. Return JSON in this exact format:
{
  "matches": [
    {
      "bookId": "book-id",
      "relevanceScore": 85,
      "aiDescription": "Brief description of why this book matches (max 200 chars)",
      "matchReason": "Reason for the match score",
      "citationSnippet": "Exact text from description/keyTopics that proves relevance",
      "citationLocation": "Where the topic is covered (e.g., 'Chapter 4: Mahavidyas' or 'Key Topics')",
      "matchedTopics": ["topic1", "topic2"],
      "isGrounded": true
    }
  ],
  "interpretation": "Brief interpretation of what the user is looking for"
}

IMPORTANT: 
- Set isGrounded: true ONLY if you found specific textual evidence in the metadata
- Set isGrounded: false if you're inferring relevance without direct evidence
- Books with isGrounded: false will be filtered out to prevent hallucination
- Provide citationSnippet and citationLocation to show WHERE the topic is mentioned

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

    // Map AI results to full book data - only include grounded matches
    const results: SearchResult[] = aiResponse.matches
      .filter((match) => {
        // Only include grounded matches with relevance >= 50
        // This prevents hallucinated results from appearing
        if (!match.isGrounded) return false;
        if (match.relevanceScore < 50) return false;
        return true;
      })
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
          // Enhanced groundedness fields
          confidenceTier: getConfidenceTier(match.relevanceScore),
          citationSnippet: match.citationSnippet,
          citationLocation: match.citationLocation,
          matchedTopics: match.matchedTopics,
          isGrounded: match.isGrounded,
        };
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

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
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const searchTime = (Date.now() - startTime) / 1000;

  return { results: scored, searchTime };
}
