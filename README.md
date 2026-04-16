# Likwid Docs

This repository hosts the standalone Likwid documentation site built with VitePress and deployed from GitHub to Cloudflare Pages.

The site supports English and Simplified Chinese. English is the default locale at `/`, and the Chinese edition is served from `/zh/`.

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
  zh/                  Simplified Chinese docs
  whitepaper/          Protocol docs
  tokenomics/
  product/
  integration/
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

## Production Launch

1. Push the repository to GitHub with `main` as the production branch.
2. Confirm GitHub Actions passes on `main`.
3. Create a Cloudflare Pages project connected to this repository.
4. Use the Pages settings listed above and set `DOCS_SITE_URL` to the production docs domain.
5. Validate the preview deployment first, especially `/`, `/zh/`, `/product/faq-innovation-behind-likwid`, and the legacy redirects in `docs/public/_redirects`.
6. Bind the production custom domain after preview QA passes.
7. Update the main site, app links, and community links to the new docs domain.

## Preflight Check

- `npm install`
- `npm run validate`
- `npm run build`
- Verify the generated sitemap and redirects under `docs/.vitepress/dist/`

## Content Maintenance

- Add or edit Markdown files inside `docs/`.
- English content lives at the docs root; Simplified Chinese content lives under `docs/zh/`.
- Keep binary assets in `docs/public/`.
- Use root-relative links for shared assets, for example `/assets/brand-kit/...` or `/assets/v2/...`.
- Run `npm run validate` before opening a PR.
