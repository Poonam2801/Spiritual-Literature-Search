# Spiritual Literature Contextual Search & Aggregator

## Overview
A unified portal for discovering spiritual literature across multiple platforms using AI-powered contextual search. Users can search for books on Vedanta, Yoga, Non-duality, Buddhism, and more with natural language queries.

## Recent Changes
- **Jan 2026**: Initial MVP implementation with Gemini AI integration for contextual search

## Architecture

### Frontend (React + TypeScript)
- **Location**: `client/src/`
- **UI Framework**: Shadcn UI components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Routing**: Wouter
- **Theme**: Warm, scholarly earth tones with Lora/Playfair Display fonts

### Backend (Express + TypeScript)
- **Location**: `server/`
- **AI Integration**: Gemini 2.5 Flash via Replit AI Integrations
- **Storage**: In-memory book catalog (no database for MVP)

### Key Components
- `client/src/components/SearchBar.tsx` - Main search input
- `client/src/components/BookCard.tsx` - Result card with confidence indicator
- `client/src/components/SourceFilter.tsx` - Filter by source platform
- `server/aiSearch.ts` - AI-powered contextual search logic
- `server/bookCatalog.ts` - Sample book catalog data

## Data Sources (Simulated)
- **Exotic India**: Premium spiritual books
- **Gita Press**: Affordable Hindu texts
- **Chaukhamba**: Academic/Ayurvedic literature
- **Archive.org**: Public domain texts

## API Endpoints
- `POST /api/search` - AI-powered contextual search
- `GET /api/books` - List all books (optional `?source=` filter)
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
- Scholarly, warm earth-tone design aesthetic
- Elegant serif typography for spiritual content feel
- Card-based results with clear confidence indicators
