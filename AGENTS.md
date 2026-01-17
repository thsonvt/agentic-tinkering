# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/` holds routed React pages (e.g., homepage in `src/pages/index.tsx`).
- `src/components/`, `src/contexts/`, and `src/theme/` contain reusable UI, providers, and Docusaurus theme overrides.
- `docs/` and `blog/` are MD/MDX content; `static/` is copied to the site root on build.
- `convex/` contains backend functions and auth configuration; generated API types live under `convex/_generated/`.
- Site configuration is in `docusaurus.config.ts` and `sidebars.ts`.

## Build, Test, and Development Commands
- `npm start` or `yarn start`: run the Docusaurus dev server with hot reload.
- `npm run build` or `yarn build`: generate the production site into `build/`.
- `npm run serve` or `yarn serve`: serve the production build locally.
- `npm run typecheck` or `yarn typecheck`: run TypeScript type checking.
- `npm run clear` or `yarn clear`: clear Docusaurus caches (useful after config changes).

## Coding Style & Naming Conventions
- Use TypeScript/React conventions: 2-space indentation, semicolons, and single quotes to match existing files.
- Components are `PascalCase`; hooks and helpers are `camelCase`.
- Prefer colocated component folders, e.g., `src/components/SubscribeForm/index.tsx`.
- Use the `@site/` alias for root-relative imports when helpful.

## Testing Guidelines
- No automated test suite is present. Rely on `npm run typecheck` and manual checks via `npm start`.
- When adding new features, verify the relevant route and content section renders correctly.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative sentence case (e.g., "Add authentication and protected drafts section").
- PRs should include a clear description, linked issues (if any), and screenshots for UI changes.
- Note any content additions (docs/blog) and confirm build or typecheck results.

## Configuration & Deployment Notes
- Local secrets should live in `.env.local` and must not be committed.
- Netlify is configured via `netlify.toml`; production output is the `build/` directory.
