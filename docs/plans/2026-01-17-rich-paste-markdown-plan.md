# Rich Paste (HTML → Markdown) Implementation Plan

> **For Codex/Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** When users paste content from other sites into the drafts editor, preserve rich formatting (headings, links, lists, blockquotes, code blocks, tables) and hotlinked images by converting clipboard HTML into Markdown.

**Architecture:** Keep the drafts content format as Markdown (so it continues to sync/publish as MDX). Intercept `paste` events on the editor textarea, read `text/html` from the clipboard, convert HTML → Markdown in the browser using a small DOM-based converter, and insert the resulting Markdown at the cursor.

**Tech Stack:** React + TypeScript, `@uiw/react-md-editor` (Markdown editor), Docusaurus/MDX publishing pipeline.

---

### Task 1: Add a small HTML → Markdown converter

**Files:**
- Create: `src/utils/htmlToMarkdown.ts`

**Step 1: Implement URL sanitization**
- Accept: `http:`, `https:`, protocol-relative (`//`), and relative URLs.
- Reject: `javascript:`, `vbscript:`, and `data:` (avoid XSS + huge inline payloads).

**Step 2: Implement DOM-based conversion**
- Parse HTML with `DOMParser` and walk the DOM.
- Convert key structures:
  - Headings → `#`…`######`
  - Paragraphs/line breaks
  - Bold/italic/strike
  - Links → `[text](href)`
  - Images → `![alt](src)` (keep hotlinks)
  - Blockquotes → `> `
  - Lists → `-` and `1.` with indentation
  - Code blocks → fenced triple-backticks
  - Tables → pipe table (GFM)

**Step 3: Normalize output**
- Collapse excessive blank lines.
- Trim trailing whitespace/newlines.

---

### Task 2: Wire rich paste into the drafts editor

**Files:**
- Modify: `src/components/FullPageEditor/index.tsx`

**Step 1: Add `onPaste` handler**
- Prefer clipboard `text/html` when present.
- Convert HTML → Markdown and only call `preventDefault()` when conversion yields content.
- Insert Markdown at the current selection in the underlying textarea.

**Step 2: Keep normal paste fallback**
- If no HTML is present (or conversion yields empty), allow default paste behavior.

---

### Task 3: Verify

**Step 1: Typecheck**
- Run: `npm run typecheck`
- Expected: `tsc` exits 0.

**Step 2: Manual paste verification**
- Run: `npm start`
- Open: `/drafts/new`
- Paste content from a page containing:
  - images, headings, lists, links, blockquotes, code blocks, tables
- Expected: Markdown shows equivalent structure + images in preview and persists after save/refresh.

