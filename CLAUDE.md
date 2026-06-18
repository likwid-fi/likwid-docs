# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Standalone VitePress documentation site for `likwid.fi`, deployed from GitHub to Cloudflare Pages.
Bilingual: English at `/` (docs root), Simplified Chinese under `docs/zh/`.

**`AGENTS.md` in this repo is the authoritative contributor guide — read it first.** It covers
project structure, commit/PR conventions, and content style in detail. This file only summarizes
what differs from a generic setup.

## Commands

```bash
npm install
npm run dev        # VitePress dev server on docs/
npm run build      # production build into docs/.vitepress/dist
npm run preview    # serve the built site
npm run validate   # check:slugs + check:links — run before EVERY PR
```

Requires Node `>=22`. CI runs `npm ci`, `npm run validate`, and `npm run build` on `main` and PRs.

## Key things to know

- Content is Markdown under `docs/`; config/theme under `docs/.vitepress/`; static assets and
  the Cloudflare `_redirects` file under `docs/public/`.
- Validation is content-focused (slugs + internal links via `scripts/check-*.mjs`) — there is no
  unit-test suite. Always `npm run validate` after editing Markdown, links, slugs, or redirects.
- English lives at the docs root; the Chinese mirror lives under `docs/zh/`. Use lowercase,
  hyphenated filenames and root-relative links (e.g. `/product/faq-innovation-behind-likwid`).
- `tmp/` holds working drafts — not published site content.
- `docs/public/_redirects` is load-bearing for Cloudflare; review redirect edits carefully.
- Deployment domain is controlled by the `DOCS_SITE_URL` env var in Cloudflare Pages.
