# Сказочник — AI Children's Fairy Tale Generator

## Overview
Russian-language children's fairy tale generator. Users upload a child's photo, configure story parameters (name, gender, age, theme, morals), and receive a unique AI-generated illustrated story with the child as the main character.

## Tech Stack
- **Frontend**: React + Vite + TypeScript, TailwindCSS v4, wouter routing, TanStack Query
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM (neon-serverless driver)
- **AI**: OpenAI GPT-4o for story text, DALL-E 3 for illustrations
- **File Uploads**: Multer (stored in /uploads directory)

## Architecture
- `shared/schema.ts` — Drizzle schema (stories table) + Zod insert schemas
- `server/db.ts` — Database connection via neon-serverless
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface
- `server/openai.ts` — OpenAI integration: generateStoryText() + generateStoryImage()
- `server/routes.ts` — API routes: POST /api/stories, GET /api/stories/:id
- `client/src/pages/Home.tsx` — Main page with form → loading → viewer flow
- `client/src/pages/StoryPage.tsx` — Shared story viewer at /story/:id
- `client/src/components/StoryForm.tsx` — Story configuration form with photo upload
- `client/src/components/StoryViewer.tsx` — Book-spread story reader
- `client/src/components/StoryLoading.tsx` — Animated loading screen

## Design
- Glassmorphism style with .glass-panel class
- Fonts: Outfit (sans) + Playfair Display (serif)
- Purple primary palette (HSL 270 70% 60%)
- Watercolor hero background from client/src/assets/images/hero-bg.png
- Theme card images imported as JS modules from client/src/assets/images/

## API Flow
1. User fills form → POST /api/stories (multipart/form-data with photo)
2. Server creates story record with status "generating", returns { id }
3. Background: GPT-4o generates 5 story pages with image prompts
4. Background: DALL-E 3 generates illustration for each page
5. Story updated to status "complete" with pages array
6. Frontend polls GET /api/stories/:id until complete

## Environment Variables
- DATABASE_URL — PostgreSQL connection string (auto-provisioned)
- OPENAI_API_KEY — OpenAI API key for text and image generation

## Key Notes
- Images in client/src/assets/ must be imported as JS variables
- CSS color tokens use `H S% L%` format (no hsl() wrapper) for Tailwind v4
- Story text uses `{name}` placeholder replaced with child's name at render time
- All UI text is in Russian
