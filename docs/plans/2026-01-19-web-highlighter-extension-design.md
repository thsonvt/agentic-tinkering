# Web Highlighter Chrome Extension - Design

**Date:** 2026-01-19
**Status:** Approved

## Overview

A standalone Chrome extension that allows capturing web page content with text highlights, syncing to the same Convex backend as the main website. Users can highlight text on any webpage, and the full article content (converted to Markdown) along with highlights are saved to their personal library, accessible via the website's Drafts section.

## Requirements

- **Separate codebase** from main website; shares only Convex backend
- **Full page capture** as clean Markdown (via Readability + Turndown)
- **4-color highlighting** matching Focus Mode (yellow, green, blue, pink)
- **OAuth authentication** via Convex Auth (Google)
- **Hybrid image storage** - remote URLs by default, manual archive option
- **Auto-sync** with debounce (local-first, sync after 5s inactivity)
- **Auto-load highlights** when revisiting previously captured pages
- **Website integration** via filter tabs in Drafts page

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Web Page                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Content Script                                      │    │
│  │  - Injects floating toolbar                          │    │
│  │  - Handles text selection & highlighting             │    │
│  │  - Renders existing highlights on page               │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────│───────────────────────────────────┘
                          │ Chrome messaging
┌─────────────────────────▼───────────────────────────────────┐
│  Background Service Worker                                   │
│  - Manages Convex client & auth state                        │
│  - Handles sync with debounce                                │
│  - Caches URL → content mappings                             │
│  - Coordinates image archiving                               │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Convex Backend (shared with website)                        │
│  - webCaptures table (content, source URL, highlights)       │
│  - File storage for archived images                          │
└──────────────────────────────────────────────────────────────┘
```

## Extension Structure

```text
web-highlighter-extension/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── index.ts          # Service worker entry
│   │   ├── convex-client.ts  # Convex connection & auth
│   │   └── sync-manager.ts   # Debounced sync logic
│   ├── content/
│   │   ├── index.ts          # Content script entry
│   │   ├── highlighter.ts    # Text selection & highlight rendering
│   │   └── toolbar.tsx       # Floating toolbar component
│   ├── popup/
│   │   ├── index.html
│   │   ├── App.tsx           # Popup UI
│   │   └── styles.css
│   ├── shared/
│   │   ├── types.ts          # Shared TypeScript types
│   │   └── constants.ts      # Colors, keyboard shortcuts
│   └── lib/
│       └── readability.ts    # Article extraction (Mozilla Readability)
├── convex/                   # Convex functions (symlinked or shared)
│   ├── webCaptures.ts
│   └── schema.ts
├── package.json
├── tsconfig.json
└── vite.config.ts            # Build config for extension
```

## Convex Schema

### New Table: webCaptures

```ts
webCaptures: defineTable({
  userId: v.id('users'),
  url: v.string(),                    // Original page URL
  canonicalUrl: v.optional(v.string()), // Normalized URL for deduplication
  title: v.string(),
  content: v.string(),                // Markdown content
  excerpt: v.optional(v.string()),    // First ~200 chars for preview
  siteName: v.optional(v.string()),   // "New York Times", "GitHub", etc.
  capturedAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_user_url', ['userId', 'canonicalUrl'])
  .index('by_user_updated', ['userId', 'updatedAt'])
```

### Extended highlights Table

```ts
highlights: defineTable({
  userId: v.id('users'),
  contentId: v.optional(v.id('content')),      // Existing: for drafts
  webCaptureId: v.optional(v.id('webCaptures')), // New: for web captures
  text: v.string(),
  color: v.union(v.literal('yellow'), v.literal('green'),
                 v.literal('blue'), v.literal('pink')),
  startOffset: v.number(),
  endOffset: v.number(),
  createdAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_content', ['contentId'])
  .index('by_web_capture', ['webCaptureId'])    // New index
  .index('by_user_color', ['userId', 'color'])
```

### Convex Functions

```ts
// convex/webCaptures.ts
upsert({ url, title, content, excerpt?, siteName? })
get({ id })
listByUser()
delete({ id })
archiveImages({ id })  // Downloads images, updates markdown URLs
```

## Floating Toolbar UI

```text
     Selected text on the page
            ↓
    ┌──────────────────┐
    │ 🟡 🟢 🔵 🩷  ✕  │  ← Appears near selection
    └──────────────────┘
      1  2  3  4   close
```

- Positioned near selection with viewport boundary detection
- Click color or press 1-4 to highlight
- `Esc` or `✕` dismisses without highlighting
- Auto-dismisses if selection is lost

## Extension Popup UI

```text
┌─ Signed In, Has Highlights ────────┐
│                                     │
│   sonle@email.com           [⚙️]   │
│   ─────────────────────────────     │
│   medium.com/article...             │
│                                     │
│   3 highlights                      │
│   ┌─────────────────────────────┐   │
│   │ 🟡 "API rate limiting..."   │ ✕ │
│   │ 🟢 "Use dependency inject..." │ ✕ │
│   │ 🔵 "The key insight is..."  │ ✕ │
│   └─────────────────────────────┘   │
│                                     │
│   [📦 Archive images]               │
│   [Open My Library →]               │
│                                     │
└─────────────────────────────────────┘
```

**Features:**

- Shows current page URL (truncated)
- Lists all highlights with color indicators
- Click ✕ to delete individual highlight
- "Archive images" downloads and stores images to Convex
- "Open My Library" links to website's Drafts page
- Settings gear: sign out, clear local cache

## Article Extraction Pipeline

```text
Web Page DOM
    ↓
Mozilla Readability (extracts article)
    ↓
Clean HTML (title, content, byline, siteName)
    ↓
Turndown (HTML → Markdown)
    ↓
Stored Markdown
```

**Libraries:**

- **@mozilla/readability** - Firefox Reader View engine
- **turndown** - HTML to Markdown with custom rules for code blocks

## Sync Strategy

1. **On highlight create** → Save to local storage immediately
2. **Debounced sync** → After 5 seconds of no activity, push to Convex
3. **On page load** → Check if URL exists in Convex, load existing highlights
4. **Conflict resolution** → Convex is source of truth

## Website Integration

### Drafts Page Filter Tabs

```text
┌─────────────────────────────────────────────────────────────┐
│  Drafts                                                     │
│  Your private work-in-progress content.                     │
│                                                             │
│  [All] [My Drafts] [Web Captures]                           │
│                                                             │
│  [📄 Import PDF]  [🔗 Import URL]  [📚 Highlights]  [+ New] │
└─────────────────────────────────────────────────────────────┘
```

### Web Capture Card

```text
┌─────────────────────────────────────────────────────────────┐
│  🌐 Understanding React Server Components       [Article]   │
│  The key to understanding RSC is thinking about...          │
│  from: medium.com  •  Captured Jan 18                       │
│                                          [3 highlights]     │
│                                          [Focus]  [Delete]  │
└─────────────────────────────────────────────────────────────┘
```

### Focus Mode Route

```text
/focus?id={contentId}              # Existing: drafts/published content
/focus?capture={webCaptureId}      # New: web captures
```

**Web capture Focus Mode shows:**

- Source domain and capture date in header
- "🔗 Original" button to open source URL
- Same highlighting tools as regular Focus Mode

## Dependencies

### Extension

```json
{
  "dependencies": {
    "convex": "^1.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "@mozilla/readability": "^0.5.x",
    "turndown": "^7.x"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.x",
    "@types/chrome": "^0.x",
    "typescript": "^5.x",
    "vite": "^5.x"
  }
}
```

### Website Changes

No new npm packages. Uses existing Convex setup.

## File Changes Summary

### New Extension Files (~15 files)

```text
web-highlighter-extension/
├── manifest.json
├── src/background/{index,convex-client,sync-manager}.ts
├── src/content/{index,highlighter,toolbar}.ts
├── src/popup/{index.html,App.tsx,styles.css}
├── src/shared/{types,constants}.ts
├── src/lib/readability.ts
├── package.json, tsconfig.json, vite.config.ts
```

### Website Modifications

```text
convex/schema.ts                        # Add webCaptures table, extend highlights
convex/webCaptures.ts                   # New: CRUD for web captures
src/components/DraftsContent/index.tsx  # Add filter tabs, web capture cards
src/pages/focus.tsx                     # Support webCaptureId param
```

## Out of Scope

- Browser extensions for Firefox/Safari (Chrome only for v1)
- Offline mode with full local database
- Collaborative highlighting / sharing
- Annotation notes on highlights
- PDF capture
- Mobile app
