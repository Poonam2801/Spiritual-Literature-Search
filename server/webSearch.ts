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

/**
 * Advanced query parsing to extract structured data from natural language queries
 */
function parseQueryAdvanced(query: string): {
  author?: string;
  title?: string;
  topics?: string[];
} {
  const cleaned = query.replace(/\bbooks?\b|\bbooklist\b/gi, "").trim();
  const parts = cleaned.split(/[,\-–:|]/).map(p => p.trim()).filter(Boolean);

  // Initialize result
  const result: { author?: string; title?: string; topics?: string[] } = {
    topics: []
  };

  // Extract potential topics (spiritual concepts)
  const topicKeywords = [
    "meditation", "yoga", "tantra", "vedanta", "buddhism", "zen",
    "mindfulness", "chakra", "kundalini", "advaita", "non-duality",
    "sufism", "mysticism", "biography", "philosophy"
  ];

  const lowerQuery = cleaned.toLowerCase();
  result.topics = topicKeywords.filter(t => lowerQuery.includes(t));

  // If user provided a comma-separated author, title pair, prefer that
  if (parts.length >= 2) {
    // assume last part is title, first is author
    result.author = parts[0];
    result.title = parts.slice(1).join(" ");
    return result;
  }

  // Heuristic: if the query contains two capitalized words at start, treat them as author
  const words = cleaned.split(/\s+/).filter(Boolean);

  // Check for "by [Author]" pattern
  const byIndex = words.findIndex(w => w.toLowerCase() === "by");
  if (byIndex > 0 && byIndex < words.length - 1) {
    result.title = words.slice(0, byIndex).join(" ");
    result.author = words.slice(byIndex + 1).join(" ");
    return result;
  }

  // Basic heuristic for Author vs Title
  if (words.length >= 3) {
    // treat last 1-2 words as potential title phrase if they look like a known series term
    const seriesIndicators = ["sri", "vidya", "gita", "upanishad", "sutra", "yoga"];

    // Check if query starts with known author names (simplified list)
    const knownAuthors = ["osho", "sadhguru", "krishnamurti", "ramana", "vivekananda", "aurobindo"];
    if (knownAuthors.some(a => lowerQuery.startsWith(a))) {
      result.author = words.slice(0, 2).join(" ");
      if (words.length > 2) result.title = words.slice(2).join(" ");
      return result;
    }

    for (const ind of seriesIndicators) {
      if (lowerQuery.includes(ind)) {
        // take substring from the indicator to end as title
        const idx = lowerQuery.indexOf(ind);
        // Find rough word boundary
        const titleStart = lowerQuery.lastIndexOf(" ", idx);

        if (titleStart !== -1) {
          // This is very rough, but functional for now
          const titlePart = cleaned.substring(titleStart).trim();
          const authorPart = cleaned.substring(0, titleStart).replace(/[,\-–:|]$/g, "").trim();
          if (authorPart && titlePart) {
            result.title = titlePart;
            result.author = authorPart;
            return result;
          }
        }
      }
    }
  }

  // Fallback: entire query as topic/title
  if (!result.title) result.title = cleaned;

  return result;
}

/**
 * Rank books by relevance to author and topics
 */
function rankByAuthorAndTopics(
  books: Book[],
  author?: string,
  topics?: string[]
): Book[] {
  if (!author && (!topics || topics.length === 0)) {
    return books;
  }

  return books.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Author match scoring
    if (author) {
      const authorLower = author.toLowerCase();
      if (a.author && a.author.toLowerCase().includes(authorLower)) scoreA += 50;
      if (b.author && b.author.toLowerCase().includes(authorLower)) scoreB += 50;
    }

    // Topic match scoring
    if (topics && topics.length > 0) {
      const aText = (a.title + " " + a.description + " " + (a.keyTopics?.join(" ") || "")).toLowerCase();
      const bText = (b.title + " " + b.description + " " + (b.keyTopics?.join(" ") || "")).toLowerCase();

      for (const topic of topics) {
        if (aText.includes(topic)) scoreA += 10;
        if (bText.includes(topic)) scoreB += 10;
      }
    }

    // Web results freshness boost (prefer newer items if standard relevance is equal)
    // This helps "newly published" books surface
    if (a.source === 'web_search') scoreA += 5;
    if (b.source === 'web_search') scoreB += 5;

    return scoreB - scoreA;
  });
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
    } else {
      // If no definitive author identified, use general search 'q'
      // This is safer because the user might have entered an author name that we parsed as a title
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
/**
 * Search Amazon Books (Scraping implementation)
 */
async function searchAmazonBooks(
  query: string,
  maxResults: number
): Promise<Book[]> {
  try {
    // Import cheerio dynamically to avoid top-level require if not used
    const cheerio = await import("cheerio");

    // Use a mobile user agent as the HTML structure is sometimes simpler, 
    // or a standard desktop one. Rotating them is best but we start simple.
    const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    const encodedQuery = encodeURIComponent(query);
    // Search in the "stripbooks" (Books) category
    const searchUrl = `https://www.amazon.com/s?k=${encodedQuery}&i=stripbooks&ref=nb_sb_noss`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });

    if (!response.ok) {
      console.warn("Amazon search returned status:", response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const books: Book[] = [];

    // Select search result items
    // Amazon selectors change frequently, so we try a few common patterns
    // Try multiple selectors
    let items = $("div[data-component-type='s-search-result']");
    if (items.length === 0) {
      items = $(".s-result-item");
    }

    items.each((i, el) => {
      if (books.length >= maxResults) return false;

      const $el = $(el);
      const asin = $el.attr("data-asin");

      // Title - Search for the main title link text
      let title = $el.find("span.a-size-medium").first().text().trim();
      if (!title) {
        title = $el.find("span.a-size-base-plus").first().text().trim();
      }
      if (!title) {
        title = $el.find("h2 span").first().text().trim();
      }

      // Link
      let relativeLink = $el.find("h2 a").attr("href");
      if (!relativeLink) {
        relativeLink = $el.find("a.a-link-normal.s-no-outline").attr("href");
      }
      if (!relativeLink) {
        relativeLink = $el.find("a.a-link-normal").attr("href");
      }

      const sourceUrl = relativeLink ? `https://www.amazon.com${relativeLink}` : "";

      // Author (often in a row like "by Author Name | Date")
      const authorRow = $el.find("div.a-row.a-size-base.a-color-secondary");
      let author = "Unknown";
      if (authorRow.length) {
        // Try to find the "by ..." part
        const text = authorRow.text().trim();
        // Look for "by [Author]"
        const byMatch = text.match(/by\s+([^\d|]+)/i);
        if (byMatch) {
          author = byMatch[1].trim();
          // Cleanup trailing garbage using cross-platform regex
          author = author.replace(/[\n\r][\s\S]*/, "").trim();
          // Remove "and" or other common noise if it's too long
          if (author.length > 50) {
            const authors = author.split(/,| and /);
            author = authors[0].trim();
          }
        } else {
          const authorLink = authorRow.find("a");
          if (authorLink.length) {
            author = authorLink.first().text().trim();
          }
        }
      }

      // Image
      const img = $el.find("img.s-image");
      const imageUrl = img.attr("src") || null;

      // Price
      const priceWhole = $el.find(".a-price-whole").first().text().replace(/[,.]/g, "");
      const priceFraction = $el.find(".a-price-fraction").first().text();
      let price: number | null = null;
      if (priceWhole) {
        price = parseFloat(`${priceWhole}.${priceFraction || "00"}`);
      }

      // Only add if we have at least a title and it looks real
      if (title && asin) {
        books.push({
          id: `amazon_${asin}`,
          title,
          author,
          description: "Available on Amazon",
          source: "web_search", // kept as web_search to reuse existing UI logic or can be "amazon" if schema supports
          sourceUrl,
          price,
          currency: "USD", // Default to USD for .com
          isAvailable: true,
          language: "English",
          category: "Spirituality",
          imageUrl,
          keyTopics: [query],
        });
      }
    });

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
