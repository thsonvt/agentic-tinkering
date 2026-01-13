# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start dev server with hot reload (localhost:3000)
npm run build      # Production build to /build directory
npm run serve      # Serve production build locally
npm run typecheck  # Run TypeScript type checking
npm run clear      # Clear Docusaurus cache (.docusaurus/)
```

## Architecture

This is a Docusaurus 3.9.2 site using the classic preset with React 19 and TypeScript.

**Key Configuration Files:**
- `docusaurus.config.ts` - Site config (title, URL, navbar, footer, presets)
- `sidebars.ts` - Documentation sidebar structure (auto-generated from /docs)
- `src/css/custom.css` - Global styles and Infima CSS variable overrides

**Content Locations:**
- `/docs/` - Documentation pages (MDX/Markdown)
- `/blog/` - Blog posts with frontmatter; `authors.yml` and `tags.yml` for metadata
- `/static/` - Static assets copied to build root

**Source Code:**
- `/src/pages/` - Custom React pages (index.tsx is homepage)
- `/src/components/` - Reusable React components
- Path alias `@site/` resolves to project root

**Docusaurus Imports:**
- `@docusaurus/Link`, `@docusaurus/useDocusaurusContext` - Routing and context
- `@theme/*` - Theme components (Layout, Heading, etc.)

**Search:**
- Uses `@easyops-cn/docusaurus-search-local` for client-side search
- Search index is generated at build time (not available in dev mode)
- Indexes docs and blog content; configured in `docusaurus.config.ts` under `themes`

**Deployment:**
- Configured for Netlify via `netlify.toml`
- Build command: `npm run build`, publish directory: `build`
- Auto-deploys on push to connected GitHub repo

**Authentication (Netlify Identity):**
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/theme/Root.tsx` - Wraps app with AuthProvider
- `src/components/AuthButton/` - Login/logout button in navbar
- Custom navbar items registered in `src/theme/NavbarItem/ComponentTypes.tsx`

**Drafts (Protected Content):**
- `/src/pages/drafts/` - Protected draft pages (only visible when logged in)
- `src/components/ProtectedContent/` - Wrapper component for auth-protected content
- `src/components/DraftsNavItem/` - Navbar link that only shows when authenticated
- To add drafts: create page in `/src/pages/drafts/`, wrap with `<ProtectedContent>`, add to drafts array in `index.tsx`
