# Focus Mode with Highlighting - Design

**Date:** 2026-01-17
**Status:** Approved

## Overview

A study-focused reading mode for Convex content with text highlighting capabilities. Users can select text and highlight it in 4 colors, with highlights persisted locally and synced to Convex.

## Requirements

- **Focus mode type:** Study mode - reading view with active annotation tools
- **Content scope:** Convex content only (drafts and published)
- **Highlighting:** Mode-based with keyboard shortcuts (1-4)
- **Colors:** 4 fixed colors (yellow, green, blue, pink)
- **Storage:** Hybrid - local storage for immediate feedback, syncs to Convex
- **Search:** Dedicated page (`/highlights`) + sidebar in focus mode
- **Entry point:** "Focus" button in drafts list
- **Content rendering:** Formatted markdown

## Architecture

### New Routes

- `/focus?id={contentId}` - Focus mode view for a single content item
- `/highlights` - Dedicated page listing all highlights across content

### New Components

```
src/components/
├── FocusMode/
│   ├── index.tsx              # Main focus mode container
│   ├── HighlightToolbar.tsx   # Color picker + active color indicator
│   ├── HighlightableProse.tsx # Content renderer with selection handling
│   ├── HighlightsSidebar.tsx  # Collapsible sidebar showing current highlights
│   └── styles.module.css
├── HighlightsPage/
│   ├── index.tsx              # Dedicated highlights search page
│   └── styles.module.css
```

### New Hooks

```
src/hooks/
└── useHighlights.ts           # Local storage + Convex sync logic
```

### Convex Schema Addition

```ts
highlights: defineTable({
  userId: v.id('users'),
  contentId: v.id('content'),
  text: v.string(),
  color: v.union(
    v.literal('yellow'),
    v.literal('green'),
    v.literal('blue'),
    v.literal('pink')
  ),
  startOffset: v.number(),
  endOffset: v.number(),
  createdAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_content', ['contentId'])
  .index('by_user_color', ['userId', 'color'])
```

## Focus Mode UI

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]              Title                    [Sidebar ☰]  │
├─────────────────────────────────────────────────────────────┤
│                                                │            │
│  ┌─────────────────────────────────────┐      │ Highlights │
│  │                                     │      │ ──────────│
│  │   Rendered Markdown Content         │      │ 🟡 "text1" │
│  │   with highlighted passages         │      │ 🟢 "text2" │
│  │                                     │      │ 🔵 "text3" │
│  │   [selected text]                   │      │            │
│  │        ↓                            │      │ [Search]   │
│  │   ┌──────────────┐                  │      │            │
│  │   │ 🟡 🟢 🔵 🩷  │  ← popup         │      │            │
│  │   └──────────────┘                  │      │            │
│  └─────────────────────────────────────┘      │            │
│                                                │            │
├─────────────────────────────────────────────────────────────┤
│  🟡 Yellow (1)  🟢 Green (2)  🔵 Blue (3)  🩷 Pink (4)      │
│  ─────────────  ← active color indicator                    │
└─────────────────────────────────────────────────────────────┘
```

### Interaction Flow

1. **Select text** → Color picker popup appears near selection
2. **Click color** (or press 1-4) → Text highlighted, popup closes, saved to local storage
3. **Background sync** → Highlights sync to Convex within ~1 second
4. **Click existing highlight** → Option to remove it
5. **Active color mode** → Click color in bottom bar to set default; subsequent selections auto-highlight

### Keyboard Shortcuts

- `1` = Yellow, `2` = Green, `3` = Blue, `4` = Pink
- `Esc` = Close popup / exit color mode
- `]` = Toggle sidebar

## Hybrid Storage & Sync

### Local Storage Schema

```ts
// Key: `highlights:${contentId}`
{
  id: string,          // Local UUID, replaced by Convex ID after sync
  text: string,
  color: 'yellow' | 'green' | 'blue' | 'pink',
  startOffset: number,
  endOffset: number,
  createdAt: number,
  synced: boolean
}
```

### Sync Strategy

1. **On highlight create** → Save to local storage immediately (synced: false)
2. **Debounced sync** → After 1 second of no activity, push unsynced highlights to Convex
3. **On sync success** → Update local record with Convex ID, set synced: true
4. **On page load** → Load from local storage first (instant), then fetch from Convex to reconcile
5. **Conflict resolution** → Convex is source of truth; merge missing highlights locally

### Convex Functions

```ts
// convex/highlights.ts
createHighlight({ contentId, text, color, startOffset, endOffset })
deleteHighlight({ highlightId })
listByContent({ contentId })
listByUser({ color?: string })
searchHighlights({ query: string })
```

## Highlights Page

**Route:** `/highlights`

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Drafts]           My Highlights                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 Search highlights...                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Filter: [All] [🟡] [🟢] [🔵] [🩷]                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟡 "API rate limiting is important for..."          │   │
│  │    From: Building REST APIs  •  Jan 15              │   │
│  │    [View in context]                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🟢 "Use dependency injection to decouple..."        │   │
│  │    From: Clean Architecture  •  Jan 14              │   │
│  │    [View in context]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Features

- Text search filters highlights containing the search term
- Color filter shows only highlights of selected color(s)
- "View in context" opens focus mode and scrolls to highlight
- Hover reveals delete button

## Entry Point Changes

### DraftsContent Modifications

Add "Focus" button to each content card:

```
┌─────────────────────────────────────────────────────────────┐
│  Building REST APIs                            [Blog]       │
│  How to design scalable REST APIs...                        │
│  Updated Jan 15                                             │
│                                          [Focus]  [Edit]    │
└─────────────────────────────────────────────────────────────┘
```

### Header Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Drafts                                                     │
│  Your private work-in-progress content.                     │
│                                                             │
│  [📄 Import PDF]  [🔗 Import URL]  [📚 Highlights]  [+ New] │
└─────────────────────────────────────────────────────────────┘
```

## File Changes

### New Files

```
src/pages/focus.tsx
src/pages/highlights.tsx
src/components/FocusMode/index.tsx
src/components/FocusMode/HighlightToolbar.tsx
src/components/FocusMode/HighlightableProse.tsx
src/components/FocusMode/HighlightsSidebar.tsx
src/components/FocusMode/styles.module.css
src/components/HighlightsPage/index.tsx
src/components/HighlightsPage/styles.module.css
src/hooks/useHighlights.ts
convex/highlights.ts
```

### Modified Files

```
convex/schema.ts                        # Add highlights table
src/components/DraftsContent/index.tsx  # Add Focus button + Highlights link
src/pages/drafts/styles.module.css      # Style for Focus button
```

## Dependencies

No new npm packages required. Uses existing: React, Convex, Docusaurus routing.

## Out of Scope

- Zen mode / Reader mode (cleaner UI variants)
- Export highlights to markdown/PDF
- Highlight notes/annotations
- Sharing highlights
