---
type: README
title: image-workbench
description: Minimal Next.js UI for Gemini image-to-image editing.
timestamp: 2026-06-29
---

# Overview

`image-workbench` is a minimal Next.js App Router UI for image-to-image editing with Gemini 3 Pro Image.

The app keeps `GEMINI_API_KEY` on the server. Browser requests send multipart form data to `POST /api/image/edit`, and the route calls `@google/genai`.

# Schema

## Environment

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_COMMON_PROMPT=optional_text_sent_before_every_edit_prompt
```

`GEMINI_COMMON_PROMPT` is optional. When set, the API route sends it to Gemini before the browser-submitted edit prompt on every request. Use it for shared editing rules, preferred tone, fixed output constraints, or other common instructions that should not be typed into the UI each time.

## Billing

This app uses the Gemini Developer API, so usage is billed through Google AI Studio, not a ChatGPT subscription.

For production usage or higher rate limits:

- Review the Gemini Developer API pricing page: https://ai.google.dev/gemini-api/docs/pricing?hl=ja
- Upgrade the API key's Google AI Studio project to a paid account from the pricing page.
- Keep `GEMINI_API_KEY` configured in `.env.local` or the deployment environment after upgrading.

The pricing page describes the free, paid, and enterprise tiers. The paid tier is intended for production apps that need higher rate limits, access to advanced features, and content that is not used for product improvement.

## API

`POST /api/image/edit`

Send `multipart/form-data` with:

- `image`: PNG, JPEG, or WEBP file, max 10MB
- `prompt`: edit instruction
- `size`: `1K`, `2K`, or `4K`

The API route calls `@google/genai` server-side and returns a JPEG data URL.

If `GEMINI_COMMON_PROMPT` is configured, the route sends both text inputs to Gemini in this order:

- `GEMINI_COMMON_PROMPT`
- `prompt`

# Examples

## Local Development

```bash
yarn install
cp .env.example .env.local
yarn dev
```

Open http://localhost:3000.

# Citations

- Gemini Developer API pricing, referenced on 2026-06-29: https://ai.google.dev/gemini-api/docs/pricing?hl=ja
