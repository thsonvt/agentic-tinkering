# Content Management: Delete/Unpublish Feature

**Date:** 2026-01-17
**Status:** Approved

## Overview

Add delete and unpublish functionality for all content types in the drafts admin UI, supporting both Convex CMS entries and static markdown files.

## Content Types & Actions

### Convex CMS Entries (database-stored)

| Action | Behavior |
|--------|----------|
| **Unpublish** | Change `status: 'published'` → `status: 'draft'` |
| **Delete** | Permanently remove from Convex database |

### Static Files (docs/blog markdown)

| Action | Behavior |
|--------|----------|
| **Unpublish** | Add `draft: true` to frontmatter (hidden from site) |
| **Delete** | Add `draft: true` + move to `/archive/` folder (soft delete, recoverable) |

## UI Design

### Drafts List Page (`/drafts`)

```
┌─────────────────────────────────────────────────────┐
│ Drafts                          [+ New Draft]       │
├─────────────────────────────────────────────────────┤
│ ┌─ CMS ─────────────────────────────────────────┐   │
│ │ My Blog Post              [Blog] [Edit] [🗑️]  │   │
│ │ Updated Jan 15, 2026                          │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ ▶ Published (3)                                     │
│ ┌───────────────────────────────────────────────┐   │
│ │ Published Post    [Published] [Edit] [↩ Unpub]│   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ ▶ Static Files (5)                                  │
│ ┌───────────────────────────────────────────────┐   │
│ │ 📄 docs/intro.md           [Doc] [↩] [🗑️]     │   │
│ │ 📄 docs/hello.md           [Doc] [↩] [🗑️]     │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Inline actions:**
- 🗑️ = Delete (with confirmation modal)
- ↩ = Unpublish (instant, no confirmation needed)

### Editor UI - Convex CMS Entries

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Drafts                                    │
├─────────────────────────────────────────────────────┤
│ Title: [My Blog Post                            ]   │
│ Type:  (•) Blog  ( ) Doc                            │
│ Description: [A post about...                   ]   │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │              Markdown Editor                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Save Draft]  [Publish]         [Unpublish] [Delete]│
│     ↑ primary actions              ↑ danger zone   │
└─────────────────────────────────────────────────────┘
```

### Editor UI - Static Files (read-only viewer)

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Drafts           📄 docs/intro.md         │
├─────────────────────────────────────────────────────┤
│ Status: ● Published  |  Type: Doc                   │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │         Rendered Markdown Preview               │ │
│ │            (read-only display)                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ⚠️ Static files are edited in your code editor.     │
│ File path: /docs/intro.md                           │
│                                                     │
│                      [Unpublish]  [Delete]          │
└─────────────────────────────────────────────────────┘
```

## Technical Implementation

### Components to Create/Modify

| Component | Purpose |
|-----------|---------|
| `scripts/generate-content-manifest.js` | Scans `/docs` and `/blog`, outputs `static/content-manifest.json` |
| `convex/content.ts` | Add `deleteContent` and `unpublish` mutations |
| `src/components/DraftsContent/` | Add Static Files section + inline actions |
| `src/pages/drafts/view.tsx` | New page for viewing/managing static files |
| `src/components/DeleteConfirmModal/` | Reusable confirmation dialog |
| `netlify/functions/update-static-file.ts` | Serverless function to modify frontmatter via GitHub API |

### Static File Loading

Build-time manifest approach:
- Script generates `static/content-manifest.json` listing all docs/blog files
- Includes file path, title, description, draft status from frontmatter
- Regenerates on each build
- Admin UI reads this JSON to display static files

### Modifying Static Files in Production

Netlify function calls GitHub API to:
1. Receive file path + action (unpublish/delete)
2. Update frontmatter or move file to `/archive/`
3. Commit change triggers automatic redeploy

### Action Flows

```
Unpublish (CMS):
  Click ↩ → Instant status change → Toast "Unpublished"

Unpublish (Static):
  Click ↩ → Call Netlify function → GitHub adds draft:true
         → Toast "Unpublished (redeploy triggered)"

Delete (CMS):
  Click 🗑️ → Modal "Delete permanently?" → Confirm
          → Remove from Convex → Toast "Deleted"

Delete (Static):
  Click 🗑️ → Modal "Move to archive?" → Confirm
          → GitHub adds draft:true + moves to /archive/
          → Toast "Archived (redeploy triggered)"
```

### Confirmation Modal

```
┌────────────────────────────────────────┐
│  🗑️ Delete "My Blog Post"?             │
├────────────────────────────────────────┤
│  This will permanently remove the      │
│  content from the database.            │
│                                        │
│  [Cancel]              [Delete]        │
└────────────────────────────────────────┘
```

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Personal access token with repo write access |
| `GITHUB_REPO` | Repository in format `owner/repo` |

## Implementation Order

1. Add Convex mutations (`deleteContent`, `unpublish`)
2. Create `DeleteConfirmModal` component
3. Add delete/unpublish to CMS editor (`/drafts/edit`)
4. Add inline actions to CMS entries in drafts list
5. Create content manifest generation script
6. Add npm script to run manifest generation before build
7. Add Static Files section to drafts list
8. Create static file viewer page (`/drafts/view`)
9. Create Netlify function for GitHub API operations
10. Add environment variables to Netlify
