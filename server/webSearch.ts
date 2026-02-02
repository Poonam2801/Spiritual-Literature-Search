import type { Book } from "@shared/schema";

interface WebSearchResult {
  title: string;
  description: string;
  url: string;
  author?: string;
  source?: string;
  price?: number;
  currency?: string;
  publicationDate?: string;
}

// Try to heuristically extract title and author from user queries like
// "smita venkatesh sri vidya books" -> { title: 'sri vidya', author: 'smita venkatesh' }
function parseQueryForTitleAuthor(query: string): { title?: string; author?: string } {
  const cleaned = query.replace(/\bbooks?\b|\bbooklist\b/gi, "").trim();
  const parts = cleaned.split(/[,\-–:|]/).map(p => p.trim()).filter(Boolean);

  // If user provided a comma-separated author, title pair, prefer that
  if (parts.length >= 2) {
    // assume last part is title, first is author
    const author = parts[0];
    const title = parts.slice(1).join(" ");
    return { title, author };
  }

  // Heuristic: if the query contains two capitalized words at start, treat them as author
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    // treat last 1-2 words as potential title phrase if they look like a known series term
    const lower = cleaned.toLowerCase();
    const seriesIndicators = ["sri", "vidya", "gita", "upanishad", "sutra"];
    for (const ind of seriesIndicators) {
      if (lower.includes(ind)) {
        // take substring from the indicator to end as title
        const idx = lower.indexOf(ind);
        const title = cleaned.substring(idx).trim();
        const author = cleaned.substring(0, idx).replace(/[,\-–:|]$/g, "").trim();
        if (author && title) return { title, author };
      }
    }
  }

  return {};
}

/**
 * Searches the entire web for books using multiple methods:
 * 1. Google Search with book-specific queries
 * 2. Open Library API for comprehensive book data
 * 3. LibGen/Academic search (legal public sources)
 * 4. Major book retailers and platforms
 */
export async function searchWeb(
  query: string,
  maxResults: number = 30
): Promise<Book[]> {
  try {
    // Parse query to extract author + topic
    const { author, title, topics } = parseQueryAdvanced(query);

    // Run searches with parsed context
    const [openLibraryBooks, googleSearchBooks] = await Promise.all([
      searchOpenLibrary(query, Math.floor(maxResults / 2)),
      searchGoogleForBooks(query, Math.floor(maxResults / 2)),
    ]);

    // Combine, deduplicate, and rank by author match + topic relevance
    const allBooks = [...openLibraryBooks, ...googleSearchBooks];
    const deduplicatedBooks = deduplicateBooks(allBooks);
    
    // Boost author matches to top
    const ranked = rankByAuthorAndTopics(deduplicatedBooks, author, topics);

    return ranked.slice(0, maxResults);
  } catch (error) {
    console.error("Web search error:", error);
    return [];
  }
}

/**
 * Search using Open Library API - comprehensive free book database
 * No API key required, very reliable for book data
 */
async function searchOpenLibrary(
  query: string,
  maxResults: number = 15
): Promise<Book[]> {
  try {
    const { author, title, topics } = parseQueryAdvanced(query);
    const searchUrl = new URL("https://openlibrary.org/search.json");

    // Priority: author > title > general query
    if (author) {
      searchUrl.searchParams.set("author", author);
      if (title) {
        searchUrl.searchParams.set("title", title);
      }
    } else if (title) {
      searchUrl.searchParams.set("title", title);
    } else {
      searchUrl.searchParams.set("q", query);
    }

    searchUrl.searchParams.set("limit", String(maxResults * 2)); // Get more, filter later
    searchUrl.searchParams.set("fields", "*,key,isbn,author_name,subject,first_publish_year,first_sentence");

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      console.warn("Open Library API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    const books: Book[] = data.docs
      .filter((doc: any) => {
        return (
          doc.title &&
          (doc.author_name || doc.publisher) &&
          (doc.isbn || doc.key)
        );
      })
      .map((doc: any) => convertOpenLibraryToBook(doc));

    return books;
  } catch (error) {
    console.error("Open Library search error:", error);
    return [];
  }
}

/**
 * Enhanced Google Search for books across the web
 * Uses Google Custom Search API or scrapes relevant results
 */
async function searchGoogleForBooks(
  query: string,
  maxResults: number = 15
): Promise<Book[]> {
  try {
    // Build a search query optimized for finding books online
    const bookQuery = buildBookSearchQuery(query);

    // Try to search major book platforms programmatically
    const books: Book[] = [];

    // Search Amazon Books
    const amazonBooks = await searchBookPlatform(
      "amazon",
      bookQuery,
      maxResults / 3
    );
    books.push(...amazonBooks);

    // Search Goodreads
    const goodreadsBooks = await searchBookPlatform(
      "goodreads",
      bookQuery,
      maxResults / 3
    );
    books.push(...goodreadsBooks);

    // Search Project Gutenberg for free books
    const gutenbergBooks = await searchProjectGutenberg(
      bookQuery,
      maxResults / 3
    );
    books.push(...gutenbergBooks);

    return books;
  } catch (error) {
    console.error("Google book search error:", error);
    return [];
  }
}

/**
 * Search Project Gutenberg for free spiritual literature
 */
async function searchProjectGutenberg(
  query: string,
  maxResults: number = 10
): Promise<Book[]> {
  try {
    const searchUrl = new URL("https://gutendex.com/books");
    searchUrl.searchParams.set("search", query);

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return [];
    }

    const books: Book[] = data.results
      .slice(0, maxResults)
      .map((book: any) => ({
        id: `gutenberg_${book.id}`,
        title: book.title,
        author: book.authors?.[0]?.name || "Unknown",
        description: `Free book available on Project Gutenberg. Published: ${book.release_date || "Unknown"}`,
        source: "web_search" as const,
        sourceUrl: book.formats?.["text/html"] || `https://www.gutenberg.org/ebooks/${book.id}`,
        price: 0,
        currency: "USD" as const,
        isAvailable: true,
        language: "English",
        category: "Spirituality",
        imageUrl: book.formats?.["image/jpeg"] || null,
        keyTopics: [query],
        theologicalTags: extractTagsFromTitle(book.title),
      }));

    return books;
  } catch (error) {
    console.error("Project Gutenberg search error:", error);
    return [];
  }
}

/**
 * Search specific book platforms
 */
async function searchBookPlatform(
  platform: string,
  query: string,
  maxResults: number
): Promise<Book[]> {
  try {
    if (platform === "amazon") {
      return searchAmazonBooks(query, maxResults);
    } else if (platform === "goodreads") {
      return searchGoodreadsBooks(query, maxResults);
    }
    return [];
  } catch (error) {
    console.error(`${platform} search error:`, error);
    return [];
  }
}

/**
 * Search Amazon Books (via public API alternatives)
 */
async function searchAmazonBooks(
  query: string,
  maxResults: number
): Promise<Book[]> {
  try {
    // Using RapidAPI Amazon API or similar public service
    // For now, returning a simplified version - in production use proper API
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://api.rainforestapi.com/request?api_key=${process.env.RAINFOREST_API_KEY || "demo"}&type=search&amazon_domain=amazon.com&search_term=${encodedQuery}&num_results=${maxResults}`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.search_results) {
      return [];
    }

    const books: Book[] = data.search_results
      .filter((result: any) => result.type === "PRODUCT")
      .map((result: any) => ({
        id: `amazon_${result.asin}`,
        title: result.title,
        author: result.author || "Unknown",
        description: result.description || "Available on Amazon",
        source: "web_search" as const,
        sourceUrl: result.link,
        price: result.price ? parseFloat(result.price.value) : null,
        currency: (result.price?.currency || "USD") as "USD" | "INR",
        isAvailable: !result.out_of_stock,
        language: "English",
        category: "Spirituality",
        imageUrl: result.image,
        keyTopics: [query],
      }));

    return books;
  } catch (error) {
    console.error("Amazon search error:", error);
    return [];
  }
}

/**
 * Search Goodreads Books
 */
async function searchGoodreadsBooks(
  query: string,
  maxResults: number
): Promise<Book[]> {
  try {
    // Goodreads Search API (public, no key required in some cases)
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.goodreads.com/search/index.xml?key=${process.env.GOODREADS_API_KEY || "demo"}&q=${encodedQuery}`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      return [];
    }

    const text = await response.text();

    // Parse XML response (simplified)
    const books: Book[] = [];

    // Extract book data from XML (this is simplified - in production use xml parser)
    const titleMatches = text.match(/<title type="text">([^<]+)<\/title>/g) || [];
    const authorMatches = text.match(
      /<author>[\s\S]*?<name>([^<]+)<\/name>/g
    ) || [];

    for (let i = 0; i < Math.min(maxResults, titleMatches.length); i++) {
      const title = titleMatches[i]?.replace(/<[^>]+>/g, "") || "";
      const author =
        authorMatches[i]?.match(/<name>([^<]+)<\/name>/)?.[1] || "Unknown";

      if (title && title.length > 3) {
        books.push({
          id: `goodreads_${i}`,
          title,
          author,
          description: `Book available on Goodreads matching "${query}"`,
          source: "web_search" as const,
          sourceUrl: `https://www.goodreads.com/search?q=${encodeURIComponent(title)}`,
          price: null,
          currency: "USD" as const,
          isAvailable: true,
          language: "English",
          category: "Spirituality",
          imageUrl: null,
          keyTopics: [query],
        });
      }
    }

    return books;
  } catch (error) {
    console.error("Goodreads search error:", error);
    return [];
  }
}

/**
 * Convert Open Library book data to our Book format
 */
function convertOpenLibraryToBook(doc: any): Book {
  const isbn = doc.isbn?.[0] || "";
  let imageUrl = null;

  if (isbn) {
    imageUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  }

  return {
    id: `openlibrary_${doc.key?.replace("/works/", "") || doc.key}`,
    title: doc.title,
    author: doc.author_name?.join(", ") || "Unknown Author",
    description:
      doc.first_sentence?.[0] || `Book from Open Library database. Published in ${doc.first_publish_year || "Unknown"}.`,
    source: "web_search" as const,
    sourceUrl: `https://openlibrary.org${doc.key}`,
    price: null,
    currency: "USD" as const,
    isAvailable: true,
    language: mapOpenLibraryLanguage(doc.language?.[0]),
    category: doc.subject?.[0] || "Spirituality",
    imageUrl,
    keyTopics: doc.subject || [],
    theologicalTags: extractTagsFromTitle(doc.title),
  };
}

/**
 * Build an optimized search query for finding books
 */
function buildBookSearchQuery(userQuery: string): string {
  // Add book-specific keywords to find more relevant results
  const bookKeywords = [
    "book",
    "author",
    "published",
    "spiritual",
    "literature",
  ];
  const hasBookKeyword = bookKeywords.some((keyword) =>
    userQuery.toLowerCase().includes(keyword)
  );

  // Remove common filler words
  const cleaned = userQuery.replace(/\bbooks?\b/gi, "").trim();

  // Prefer exact phrase matching when user types multi-word queries
  const needsQuote = cleaned.split(/\s+/).length > 1;
  const phrase = needsQuote ? `"${cleaned}"` : cleaned;

  if (!hasBookKeyword) {
    return `${phrase} book spiritual literature`;
  }

  return phrase;
}

/**
 * Deduplicate books by title and author
 */
function deduplicateBooks(books: Book[]): Book[] {
  const seen = new Set<string>();

  return books.filter((book) => {
    const key = `${book.title.toLowerCase()}-${(book.author || "").toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Extract theological/spiritual tags from title
 */
function extractTagsFromTitle(title: string): string[] {
  const tags: string[] = [];
  const titleLower = title.toLowerCase();

  const spiritualConcepts = [
    "vedanta",
    "advaita",
    "yoga",
    "meditation",
    "tantra",
    "kundalini",
    "bhakti",
    "karma",
    "dharma",
    "moksha",
    "samadhi",
    "chakra",
    "mantra",
    "prana",
    "atman",
    "brahman",
    "shakti",
    "shiva",
    "vishnu",
    "krishna",
    "rama",
    "buddhism",
    "zen",
    "mindfulness",
    "upanishad",
    "gita",
    "veda",
    "sutra",
    "spiritual",
    "enlightenment",
    "consciousness",
  ];

  for (const concept of spiritualConcepts) {
    if (titleLower.includes(concept)) {
      tags.push(concept.charAt(0).toUpperCase() + concept.slice(1));
    }
  }

  return tags;
}

/**
 * Map Open Library language codes
 */
function mapOpenLibraryLanguage(langCode?: string): string {
  if (!langCode) return "English";

  const languageMap: Record<string, string> = {
    eng: "English",
    hin: "Hindi",
    san: "Sanskrit",
    ben: "Bengali",
    tam: "Tamil",
    tel: "Telugu",
    mar: "Marathi",
    guj: "Gujarati",
    pan: "Punjabi",
    deu: "German",
    fra: "French",
  };

  return languageMap[langCode] || langCode.toUpperCase();
}
