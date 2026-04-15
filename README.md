# Likwid Docs

This repository hosts the standalone Likwid documentation site built with VitePress and deployed from GitHub to Cloudflare Pages.

## Stack

- VitePress for the docs site
- Cloudflare Pages for production hosting and PR previews
- GitHub as the single source of truth for content and deployment

## Commands

```bash
npm install
npm run migrate
npm run validate
npm run build
npm run dev
```

## Repository Layout

```text
docs/
  .vitepress/          VitePress config and theme customizations
  public/              Static assets and Cloudflare redirect rules
  whitepaper/          Migrated protocol docs
  tokenomics/
  product/
  integration/
  faq/
  support/
  legal/
scripts/
  migration-plan.mjs   Route plan, sidebar structure, redirects
  migrate-gitbook.mjs  One-shot GitBook migration script
  check-*.mjs          CI validation scripts
```

## Migration Workflow

1. Freeze edits in GitBook.
2. Run `npm run migrate` to refresh the local Markdown, assets, redirects, and migration report from the public GitBook site.
3. Review `reports/migration-report.json` for unexpected pages, missing pages, and manual review items.
4. Run `npm run validate` and `npm run build`.
5. Open a PR and use the Cloudflare Pages preview deployment for QA.

## Cloudflare Pages

Use these settings when creating the Pages project:

- Framework preset: `VitePress`
- Build command: `npm run build`
- Build output directory: `docs/.vitepress/dist`
- Node.js version: `22`
- Environment variable: `DOCS_SITE_URL=https://docs.likwid.fi`

If the production domain is not `docs.likwid.fi`, update `DOCS_SITE_URL` in Cloudflare Pages.

## Content Maintenance

- Add or edit Markdown files inside `docs/`.
- Keep binary assets in `docs/public/`.
- Use root-relative links for shared assets, for example `/assets/gitbook/...`.
- If GitBook is still the temporary source of truth, rerun `npm run migrate` instead of hand-copying pages.
- If the GitBook sitemap changes, update `scripts/migration-plan.mjs` before rerunning the migration.
