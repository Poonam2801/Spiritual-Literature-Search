import type { Book } from "@shared/schema";

interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    language?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    infoLink?: string;
    previewLink?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    publishedDate?: string;
    publisher?: string;
  };
  saleInfo?: {
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
    retailPrice?: {
      amount: number;
      currencyCode: string;
    };
    buyLink?: string;
    saleability?: string;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBookVolume[];
  totalItems: number;
}

// Spiritual/religious subject terms to enhance searches
const SPIRITUAL_SUBJECTS = [
  "religion",
  "spirituality", 
  "hinduism",
  "buddhism",
  "yoga",
  "vedanta",
  "philosophy",
  "meditation",
  "tantra",
  "upanishads",
  "bhagavad gita",
  "sanskrit",
];

export async function searchGoogleBooks(
  query: string,
  maxResults: number = 20
): Promise<Book[]> {
  try {
    // Enhance query with spiritual context for better results
    const enhancedQuery = buildSpiritualQuery(query);
    
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", enhancedQuery);
    url.searchParams.set("maxResults", String(Math.min(maxResults, 40)));
    url.searchParams.set("printType", "books");
    url.searchParams.set("orderBy", "relevance");
    // Focus on books that might have spiritual/religious content
    url.searchParams.set("langRestrict", "en");
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error("Google Books API error:", response.status);
      return [];
    }
    
    const data: GoogleBooksResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }
    
    // Convert Google Books format to our Book format
    const books: Book[] = data.items
      .filter((item) => {
        // Filter out books without meaningful descriptions
        const desc = item.volumeInfo.description;
        return desc && desc.length > 50;
      })
      .map((item) => convertToBook(item));
    
    return books;
  } catch (error) {
    console.error("Google Books search error:", error);
    return [];
  }
}

function buildSpiritualQuery(userQuery: string): string {
  // Check if query already has spiritual context
  const queryLower = userQuery.toLowerCase();
  const hasSpiritualContext = SPIRITUAL_SUBJECTS.some((subject) =>
    queryLower.includes(subject)
  );
  
  // If query doesn't have spiritual context, add relevant subject filters
  if (!hasSpiritualContext) {
    // Add subject filter to focus on spiritual/religious books
    return `${userQuery} subject:(religion OR spirituality OR philosophy OR hinduism OR buddhism OR yoga)`;
  }
  
  return userQuery;
}

function convertToBook(volume: GoogleBookVolume): Book {
  const info = volume.volumeInfo;
  const sale = volume.saleInfo;
  
  // Get the best available image
  let imageUrl = null;
  if (info.imageLinks) {
    imageUrl = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || null;
    // Upgrade to https and larger size
    if (imageUrl) {
      imageUrl = imageUrl.replace("http://", "https://");
      imageUrl = imageUrl.replace("zoom=1", "zoom=2");
    }
  }
  
  // Determine price
  let price: number | null = null;
  let currency: "INR" | "USD" = "USD";
  if (sale?.retailPrice) {
    price = sale.retailPrice.amount;
    currency = sale.retailPrice.currencyCode === "INR" ? "INR" : "USD";
  } else if (sale?.listPrice) {
    price = sale.listPrice.amount;
    currency = sale.listPrice.currencyCode === "INR" ? "INR" : "USD";
  }
  
  // Build source URL (prefer buy link, then preview, then info)
  const sourceUrl = sale?.buyLink || info.previewLink || info.infoLink || 
    `https://books.google.com/books?id=${volume.id}`;
  
  // Extract categories for better matching
  const categories = info.categories || [];
  
  // Get ISBN if available
  const isbn = info.industryIdentifiers?.find(
    (id) => id.type === "ISBN_13" || id.type === "ISBN_10"
  )?.identifier;
  
  return {
    id: `google_${volume.id}`,
    title: info.title,
    author: info.authors?.join(", "),
    description: info.description || "No description available",
    source: "google_books",
    sourceUrl,
    price,
    currency,
    isAvailable: sale?.saleability !== "NOT_FOR_SALE",
    language: mapLanguageCode(info.language || "en"),
    category: categories[0] || "Spirituality",
    imageUrl,
    // Extract key topics from categories for groundedness matching
    keyTopics: categories,
    theologicalTags: extractTheologicalTags(info.description || "", categories),
  };
}

function mapLanguageCode(code: string): string {
  const languageMap: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    sa: "Sanskrit",
    bn: "Bengali",
    ta: "Tamil",
    te: "Telugu",
    mr: "Marathi",
    gu: "Gujarati",
    pa: "Punjabi",
    de: "German",
    fr: "French",
  };
  return languageMap[code] || code.toUpperCase();
}

function extractTheologicalTags(description: string, categories: string[]): string[] {
  const tags: string[] = [];
  const descLower = description.toLowerCase();
  
  // Check for common spiritual/theological concepts
  const concepts = [
    "vedanta", "advaita", "yoga", "meditation", "tantra", "kundalini",
    "bhakti", "karma", "dharma", "moksha", "samadhi", "chakra",
    "mantra", "prana", "atman", "brahman", "shakti", "shiva",
    "vishnu", "krishna", "rama", "buddhism", "zen", "mindfulness",
    "upanishad", "gita", "veda", "sutra", "non-duality", "self-realization",
    "enlightenment", "liberation", "consciousness", "spiritual",
  ];
  
  for (const concept of concepts) {
    if (descLower.includes(concept)) {
      tags.push(concept.charAt(0).toUpperCase() + concept.slice(1));
    }
  }
  
  // Also add cleaned categories
  for (const cat of categories) {
    const cleanCat = cat.replace(/^[^/]+\/\s*/, "").trim();
    if (cleanCat && !tags.includes(cleanCat)) {
      tags.push(cleanCat);
    }
  }
  
  return tags.slice(0, 10); // Limit to 10 tags
}
