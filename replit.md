# Сказочник — AI Children's Fairy Tale Generator

## Overview
Russian-language children's fairy tale generator. Users upload a child's photo, configure story parameters (name, gender, age, theme, morals), and receive a unique AI-generated illustrated story with the child as the main character. Illustrations are created by editing the child's actual photo into fairy tale scenes.

## Tech Stack
- **Frontend**: React + Vite + TypeScript, TailwindCSS v4, wouter routing, TanStack Query
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver)
- **AI Text**: OpenAI GPT-4o-mini for story text generation
- **AI Images**: Nano Banana API (kie.ai) — google/nano-banana-edit model for photo-to-illustration editing
- **File Uploads**: Multer (stored in /uploads directory)

## Architecture
- `shared/schema.ts` — Drizzle schema (stories table) + StoryPage interface with type field
- `server/db.ts` — Database connection via neon-serverless
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface
- `server/openai.ts` — GPT-4o-mini text generation: story text + character description + image prompts
- `server/nanoBanana.ts` — Nano Banana API: photo editing into illustrations via kie.ai
- `server/pdf.ts` — Server-side PDF generation with jsPDF + Roboto font (Cyrillic support)
- `server/assets/Roboto-Regular.ttf` — Full Roboto font with Cyrillic glyphs for PDF
- `server/routes.ts` — API routes: POST /api/stories, GET /api/stories/:id, GET /api/stories/:id/pdf, POST /api/stories/:id/regenerate
- `client/src/pages/Home.tsx` — Main page with form → loading → viewer flow
- `client/src/pages/StoryPage.tsx` — Shared story viewer at /story/:id
- `client/src/components/StoryForm.tsx` — Story configuration form with photo upload
- `client/src/components/StoryViewer.tsx` — Book reader with cover/content/end page types
- `client/src/components/StoryLoading.tsx` — Animated loading screen (real-time, ~1-3 min)

## Story Structure
- Page types: "cover" (title page), "content" (story pages), "end" (finale with "Конец")
- Age 2-4: 5 content pages, simple sentences, 200-400 words
- Age 5-6: 6 content pages, 400-600 words
- Age 7-8: 7 content pages, 400-700 words
- Age 9-12: 8 content pages, 600-900 words
- Total pages = content + cover + end (max 10)
- Action buttons on last page: Share, Regenerate, New Story

## Pipeline Flow
1. User fills form → POST /api/stories (multipart/form-data with photo)
2. Server creates story record with status "generating", returns { id }
3. GPT-4o-mini generates story text + characterDescription + imagePrompts for each page
4. For each page: Nano Banana edits the uploaded photo into the scene illustration
5. Story updated to status "complete" with pages array
6. Frontend polls GET /api/stories/:id every 3s until complete

## Design
- Glassmorphism style with .glass-panel class
- Fonts: Outfit (sans) + Playfair Display (serif)
- Purple primary palette (HSL 270 70% 60%)
- Watercolor hero background from client/src/assets/images/hero-bg.png
- Theme card images imported as JS modules from client/src/assets/images/

## Environment Variables
- DATABASE_URL — PostgreSQL connection string (auto-provisioned)
- OPENAI_API_KEY — OpenAI API key for text generation
- KIE_API_KEY — Kie.ai API key for Nano Banana image editing

## Key Notes
- Общение с пользователем ведётся исключительно на русском языке
- Images in client/src/assets/ must be imported as JS variables
- CSS color tokens use `H S% L%` format (no hsl() wrapper) for Tailwind v4
- All UI text is in Russian
- Photo must be publicly accessible for Nano Banana API (uses REPLIT_DOMAINS for URL)
- **Logging**: Optimized minimal logging — only critical errors and completion events logged to reduce noise
  - routes.ts: Only POST/PDF errors
  - storage.ts: Removed all verbose logs (silent operations)
  - openai.ts: Only completion time + page count on success, errors only
  - nanoBanana.ts: No per-attempt logs, only final errors
  - generate: Single completion log per story with total time
