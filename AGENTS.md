# Repository Guidelines

## Project Structure & Module Organization

This repository is a standalone VitePress docs site for `likwid.fi`.

- `docs/`: all documentation content.
- `docs/.vitepress/`: site config and theme setup.
- `docs/public/`: static assets and Cloudflare files such as `_redirects`.
- `docs/zh/`: Simplified Chinese pages.
- `docs/whitepaper/`, `docs/product/`, `docs/integration/`, `docs/legal/`: topic-based English docs.
- `scripts/check-*.mjs`: validation scripts used by CI.
- `tmp/`: working drafts and proposal docs; do not treat as published site content.

## Build, Test, and Development Commands

- `npm install`: install dependencies locally.
- `npm run dev`: start the VitePress dev server for `docs/`.
- `npm run build`: build the production site into `docs/.vitepress/dist`.
- `npm run preview`: preview the built site locally.
- `npm run check:slugs`: verify slug consistency.
- `npm run check:links`: verify internal links.
- `npm run validate`: run all repository checks; use this before every PR.

CI runs `npm ci`, `npm run validate`, and `npm run build` on pushes to `main` and all pull requests.

## Coding Style & Naming Conventions

Use Markdown for content and ES modules for scripts. Follow existing formatting in nearby files.

- Prefer short sections, clear headings, and root-relative links such as `/product/faq-innovation-behind-likwid`.
- Keep English docs under `docs/`; Chinese translations belong under `docs/zh/`.
- Use lowercase, hyphenated filenames: `security-audits.md`, `likwid-integration-manual.md`.
- Keep frontmatter minimal and consistent with existing pages.

## Testing Guidelines

There is no unit-test suite. Validation is content-focused:

- Run `npm run validate` after editing Markdown, links, slugs, or redirects.
- Run `npm run build` after config, navigation, or asset changes.
- Manually spot-check `/`, `/zh/`, and any changed pages in `npm run dev`.

## Commit & Pull Request Guidelines

Recent history is inconsistent (`modify`, `publish version`), so use explicit imperative subjects instead.

- Good commit examples: `Add liquidation guide updates`, `Fix broken zh sidebar link`.
- Keep commits scoped to one change area.
- PRs should include: a short summary, affected paths, validation results, and screenshots only if UI/theme output changed.
- Link related issues or deployment context when relevant.

## Security & Configuration Tips

Use Node `22+` as defined in `package.json`. If the docs domain changes, update `DOCS_SITE_URL` in deployment settings. Review `docs/public/_redirects` carefully because redirect mistakes can break published docs paths.
