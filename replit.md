# Spiritual Literature Contextual Search & Aggregator

## Overview
A unified portal for discovering spiritual literature across the internet using AI-powered contextual search. Users can search for books on Vedanta, Yoga, Non-duality, Buddhism, and more with natural language queries. The app now searches Google Books to provide unlimited results from across the web.

## Recent Changes
- **Jan 2026**: Expanded search to include Google Books API - now shows results from across the entire internet, not just the curated catalog
- **Jan 2026**: Updated theme to "Mystical & Ancient" aesthetic - deep purple, gold accents, parchment backgrounds; poetic copy throughout
- **Jan 2026**: Implemented groundedness-based search with hallucination prevention - only returns books where topics are verified in metadata
- **Jan 2026**: Added confidence tiers (Strong/Good/Potential Match) and citation display showing WHERE keywords are found
- **Jan 2026**: Enriched book catalog with rich metadata: tableOfContents, theologicalTags, keyTopics, contextualSnippets
- **Jan 2026**: Expanded to 10 platforms including Google Books for internet-wide search

## Architecture

### Frontend (React + TypeScript)
- **Location**: `client/src/`
- **UI Framework**: Shadcn UI components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Routing**: Wouter
- **Theme**: Mystical & Ancient - deep purple (270° hue), gold accents (43° hue), parchment backgrounds

### Backend (Express + TypeScript)
- **Location**: `server/`
- **AI Integration**: Gemini 2.5 Flash via Replit AI Integrations
- **External API**: Google Books API for internet-wide search
- **Storage**: In-memory book catalog + live Google Books results

### Key Components
- `client/src/components/SearchBar.tsx` - Main search input with poetic prompts
- `client/src/components/BookCard.tsx` - Result card with confidence indicator and source attribution
- `client/src/components/SourceFilter.tsx` - Filter by source platform (including Google Books)
- `server/aiSearch.ts` - AI-powered search combining catalog + Google Books
- `server/googleBooks.ts` - Google Books API integration
- `server/bookCatalog.ts` - Curated book catalog data

## Data Sources
- **Google Books**: Internet-wide search for spiritual texts (NEW)
- **Exotic India**: Premium spiritual books
- **Gita Press**: Affordable Hindu texts
- **Chaukhamba**: Academic/Ayurvedic literature
- **Archive.org**: Public domain texts
- **Amazon**: Wide selection with fast delivery
- **Flipkart**: Popular Indian e-commerce
- **Bookish Santa**: Curated rare books
- **Vedic Books**: Specialized Vedic literature
- **MLBD**: Academic publisher since 1903

## API Endpoints
- `POST /api/search` - AI-powered contextual search (catalog + Google Books)
- `GET /api/books` - List all books from catalog (optional `?source=` filter)
- `GET /api/books/:id` - Get single book by ID

## Environment Variables
- `AI_INTEGRATIONS_GEMINI_API_KEY` - Auto-configured by Replit
- `AI_INTEGRATIONS_GEMINI_BASE_URL` - Auto-configured by Replit

## Running the Application
```bash
npm run dev
```
The application runs on port 5000 with frontend served through Vite.

## User Preferences
- Mystical & Ancient design aesthetic (deep purple, gold, parchment)
- Poetic, evocative copy throughout ("Seek the Ancient Wisdom", "Consulting the ancient scrolls")
- Elegant serif typography for spiritual content feel
- Card-based results with clear confidence indicators
- Internet-wide search for maximum book discovery
