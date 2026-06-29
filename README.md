---
type: README
title: image-workbench
description: Minimal Next.js UI for Gemini image-to-image editing.
---

# Overview

`image-workbench` is a minimal Next.js App Router UI for image-to-image editing with Gemini 3 Pro Image.

The app keeps `GEMINI_API_KEY` on the server. Browser requests send multipart form data to `POST /api/image/edit`, and the route calls `@google/genai`.

# Schema

## Environment

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## API

`POST /api/image/edit`

Send `multipart/form-data` with:

- `image`: PNG, JPEG, or WEBP file, max 10MB
- `prompt`: edit instruction
- `size`: `1K`, `2K`, or `4K`

The API route calls `@google/genai` server-side and returns a JPEG data URL.

# Examples

## Local Development

```bash
yarn install
cp .env.example .env.local
yarn dev
```

Open http://localhost:3000.
