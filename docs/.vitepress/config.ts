import { defineConfig } from 'vitepress'
import { buildNav, buildSidebar, siteMeta } from '../../scripts/migration-plan.mjs'

const siteUrl = (process.env.DOCS_SITE_URL ?? siteMeta.defaultSiteUrl).replace(/\/$/, '')

function routeForPage(page: string) {
  if (page === 'index.md') {
    return '/'
  }

  return `/${page.replace(/\.md$/, '').replace(/\/index$/, '')}`
}

export default defineConfig({
  lang: 'en-US',
  title: siteMeta.title,
  description: siteMeta.description,
  cleanUrls: true,
  sitemap: {
    hostname: siteUrl
  },
  head: [
    ['meta', { name: 'theme-color', content: '#346ddb' }]
  ],
  transformHead({ page }) {
    const route = routeForPage(page)
    const canonicalUrl = `${siteUrl}${route === '/' ? '' : route}`

    return [['link', { rel: 'canonical', href: canonicalUrl }]]
  },
  markdown: {
    lineNumbers: true,
    math: true
  },
  themeConfig: {
    nav: buildNav(),
    sidebar: buildSidebar(),
    search: {
      provider: 'local'
    },
    outline: {
      level: 'deep',
      label: 'On this page'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/likwid-fi' },
      { icon: 'x', link: 'https://x.com/likwid_fi' }
    ],
    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },
    footer: {
      message: 'Built from Markdown and deployed through Cloudflare Pages.',
      copyright: 'Copyright © Likwid'
    }
  }
})
