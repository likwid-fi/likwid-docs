# Likwid Docs

This repository hosts the standalone Likwid documentation site built with VitePress and deployed from GitHub to Cloudflare Pages.

## Stack

- VitePress for the docs site
- Cloudflare Pages for production hosting and PR previews
- GitHub as the single source of truth for content and deployment

## Commands

```bash
npm install
npm run validate
npm run build
npm run dev
```

## Repository Layout

```text
docs/
  .vitepress/          VitePress config and theme customizations
  public/              Static assets and Cloudflare redirect rules
  whitepaper/          Protocol docs
  tokenomics/
  product/
  integration/
  faq/
  support/
  legal/
scripts/
  check-*.mjs          CI validation scripts
```

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
- Use root-relative links for shared assets, for example `/assets/brand-kit/...` or `/assets/v2/...`.
- Run `npm run validate` before opening a PR.
