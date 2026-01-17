# Full-Page Drafts Editor Design

## Overview
Replace the modal-based draft editor with a full-page, distraction-free writing experience.

## Tasks

### Task 1: Create shared FullPageEditor component
Create `/src/components/FullPageEditor/index.tsx` with:
- Slim header (48px): Back link, save status, content type dropdown, focus toggle, delete button
- Title input: 32px, font-weight 600, no border, auto-focus
- Full-height `@uiw/react-md-editor` with live preview
- Styles in `styles.module.css`

**Verification:** Component renders without errors when imported

### Task 2: Implement auto-save with debounce
In FullPageEditor:
- 2-second debounce timer on title/content changes
- Save status states: hidden → "Unsaved changes" → "Saving..." → "Saved" (fades)
- `Cmd+S` / `Ctrl+S` forces immediate save
- `beforeunload` warning when unsaved changes exist

**Verification:** Type in editor, wait 2s, confirm save status changes

### Task 3: Implement focus mode
- Focus button in header toggles full-screen mode
- Hides header completely
- Floating "Exit" button appears on hover (top-right)
- `Escape` key exits focus mode
- Save status appears briefly during auto-save, then fades

**Verification:** Toggle focus mode, verify Escape exits

### Task 4: Rewrite /drafts/new.tsx
- Use FullPageEditor component
- No Docusaurus Layout wrapper
- Create draft on first keystroke (Convex mutation)
- URL updates silently with new ID
- Default content type: blog
- Empty drafts deleted on exit

**Verification:** Navigate to /drafts/new, create draft, verify it appears in list

### Task 5: Rewrite /drafts/edit.tsx
- Use FullPageEditor component
- Load existing draft by ID from query param
- Delete functionality with confirmation
- Redirect to /drafts after deletion

**Verification:** Edit existing draft, save changes, verify persistence

### Task 6: Cleanup
- Delete `/src/components/DraftEditor/` (no longer needed)
- Delete `/src/components/MarkdownEditor/` if unused elsewhere
- Update any imports if needed

**Verification:** `npm run typecheck` passes, `npm run build` succeeds

## Architecture Notes
- Bypasses Docusaurus Layout for minimal chrome
- Uses Convex for real-time persistence
- Shares FullPageEditor between new and edit pages
