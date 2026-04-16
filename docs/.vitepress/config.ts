import { defineConfig } from 'vitepress'

const siteMeta = {
  title: 'Likwid Docs',
  description: 'Protocol, product, integration, and legal documentation for Likwid.',
  defaultSiteUrl: 'https://docs.likwid.fi'
}

const nav = [
  { text: 'Whitepaper', link: '/' },
  { text: 'Tokenomics', link: '/tokenomics/likwid' },
  { text: 'Product', link: '/product/security-audits' },
  { text: 'Integration', link: '/integration/likwid-integration-manual' },
  { text: 'Legal', link: '/legal/disclaimer' }
]

const sidebar = [
  {
    text: 'Whitepaper',
    collapsed: false,
    items: [
      { text: 'Introduction', link: '/' },
      { text: 'Theoretical Framework', link: '/whitepaper/theoretical-framework' },
      {
        text: 'Protocol Mechanics',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/whitepaper/protocol-mechanics' },
          { text: 'Pool Creation', link: '/whitepaper/protocol-mechanics/pool-creation' },
          { text: 'Liquidity Provision', link: '/whitepaper/protocol-mechanics/liquidity-provision' },
          { text: 'Margin Position Mechanics', link: '/whitepaper/protocol-mechanics/margin-position-mechanics' },
          { text: 'Synthetic Token', link: '/whitepaper/protocol-mechanics/synthetic-token' },
          { text: 'Lending Mechanism', link: '/whitepaper/protocol-mechanics/lending-mechanism' },
          { text: 'Single-Sided Lending Liquidity', link: '/whitepaper/protocol-mechanics/single-sided-lending-liquidity' },
          { text: 'Repayment', link: '/whitepaper/protocol-mechanics/repayment' },
          { text: 'Interest Rate Mechanism Design', link: '/whitepaper/protocol-mechanics/interest-rate-mechanism-design' },
          { text: 'Liquidation Mechanism', link: '/whitepaper/protocol-mechanics/liquidation-mechanism' },
          { text: 'Insurance Fund Mechanism', link: '/whitepaper/protocol-mechanics/insurance-fund-mechanism' },
          {
            text: 'Handling Exhausted Liquidity in Special Cases',
            link: '/whitepaper/protocol-mechanics/handling-exhausted-liquidity-in-special-cases'
          }
        ]
      },
      {
        text: 'Risk Management & Strategies',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/whitepaper/risk-management-and-strategies' },
          { text: 'Truncated Oracles', link: '/whitepaper/risk-management-and-strategies/truncated-oracles' },
          {
            text: 'Dynamic Fee Strategy Against MEV and Arbitrage Attacks',
            link: '/whitepaper/risk-management-and-strategies/dynamic-fee-strategy-against-mev-and-arbitrage-attacks'
          },
          {
            text: 'Liquidity Protection with Dynamic Unlock Mechanism',
            link: '/whitepaper/risk-management-and-strategies/liquidity-protection-with-dynamic-unlock-mechanism'
          }
        ]
      },
      { text: 'Conclusion', link: '/whitepaper/conclusion' },
      { text: 'References', link: '/whitepaper/references' }
    ]
  },
  {
    text: 'Tokenomics',
    items: [{ text: 'LIKWID', link: '/tokenomics/likwid' }]
  },
  {
    text: 'Product',
    items: [
      { text: 'Security Audits', link: '/product/security-audits' },
      { text: 'Contract Address', link: '/product/contract-address' },
      { text: 'Innovation Behind Likwid', link: '/faq/innovation-behind-likwid' }
    ]
  },
  {
    text: 'Integration',
    items: [
      { text: 'Liquidation Guide', link: '/integration/liquidation-guide' },
      { text: 'Likwid Integration Manual', link: '/integration/likwid-integration-manual' }
    ]
  },
  {
    text: 'Support',
    items: [{ text: 'Brand Kit', link: '/support/brand-kit' }]
  },
  {
    text: 'Legal',
    items: [
      { text: 'Disclaimer', link: '/legal/disclaimer' },
      { text: 'Terms of Service', link: '/legal/terms-of-service' },
      { text: 'Privacy Policy', link: '/legal/privacy-policy' }
    ]
  }
]

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
    nav,
    sidebar,
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
