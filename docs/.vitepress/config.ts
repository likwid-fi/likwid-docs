import { defineConfig } from 'vitepress'

type LocaleKey = 'en' | 'zh'

const siteMeta = {
  title: 'Likwid Docs',
  description: 'Protocol, product, integration, and legal documentation for Likwid.',
  defaultSiteUrl: 'https://docs.likwid.fi'
}

const siteUrl = (process.env.DOCS_SITE_URL ?? siteMeta.defaultSiteUrl).replace(/\/$/, '')

const searchTranslations = {
  root: {
    translations: {
      button: {
        buttonText: 'Search',
        buttonAriaLabel: 'Search'
      },
      modal: {
        displayDetails: 'Display detailed list',
        resetButtonTitle: 'Clear query',
        backButtonTitle: 'Close search',
        noResultsText: 'No results for your query',
        footer: {
          selectText: 'to select',
          selectKeyAriaLabel: 'enter',
          navigateText: 'to navigate',
          navigateUpKeyAriaLabel: 'arrow up',
          navigateDownKeyAriaLabel: 'arrow down',
          closeText: 'to close',
          closeKeyAriaLabel: 'escape'
        }
      }
    }
  },
  zh: {
    translations: {
      button: {
        buttonText: '搜索',
        buttonAriaLabel: '搜索'
      },
      modal: {
        displayDetails: '显示详细列表',
        resetButtonTitle: '清除查询',
        backButtonTitle: '关闭搜索',
        noResultsText: '未找到相关结果',
        footer: {
          selectText: '选择',
          selectKeyAriaLabel: 'enter',
          navigateText: '切换',
          navigateUpKeyAriaLabel: 'arrow up',
          navigateDownKeyAriaLabel: 'arrow down',
          closeText: '关闭',
          closeKeyAriaLabel: 'escape'
        }
      }
    }
  }
}

function routeForPage(page: string) {
  if (page === 'index.md') {
    return '/'
  }

  return `/${page.replace(/\.md$/, '').replace(/\/index$/, '')}`
}

function withLocale(locale: LocaleKey, path: string) {
  if (locale === 'en') {
    return path
  }

  return path === '/' ? '/zh/' : `/zh${path}`
}

function buildNav(locale: LocaleKey) {
  if (locale === 'zh') {
    return [
      { text: '白皮书', link: withLocale(locale, '/') },
      { text: '代币经济', link: withLocale(locale, '/tokenomics/likwid') },
      { text: '产品', link: withLocale(locale, '/product/security-audits') },
      { text: '集成', link: withLocale(locale, '/integration/likwid-integration-manual') },
      { text: '法务', link: withLocale(locale, '/legal/disclaimer') }
    ]
  }

  return [
    { text: 'Whitepaper', link: withLocale(locale, '/') },
    { text: 'Tokenomics', link: withLocale(locale, '/tokenomics/likwid') },
    { text: 'Product', link: withLocale(locale, '/product/security-audits') },
    { text: 'Integration', link: withLocale(locale, '/integration/likwid-integration-manual') },
    { text: 'Legal', link: withLocale(locale, '/legal/disclaimer') }
  ]
}

function buildSidebar(locale: LocaleKey) {
  if (locale === 'zh') {
    return [
      {
        text: '白皮书',
        collapsed: false,
        items: [
          { text: '简介', link: withLocale(locale, '/') },
          { text: '理论框架', link: withLocale(locale, '/whitepaper/theoretical-framework') },
          {
            text: '协议机制',
            collapsed: false,
            items: [
              { text: '概览', link: withLocale(locale, '/whitepaper/protocol-mechanics') },
              { text: '池子创建', link: withLocale(locale, '/whitepaper/protocol-mechanics/pool-creation') },
              { text: '流动性提供', link: withLocale(locale, '/whitepaper/protocol-mechanics/liquidity-provision') },
              { text: '保证金仓位机制', link: withLocale(locale, '/whitepaper/protocol-mechanics/margin-position-mechanics') },
              { text: '合成记账头寸', link: withLocale(locale, '/whitepaper/protocol-mechanics/synthetic-token') },
              { text: '借贷机制', link: withLocale(locale, '/whitepaper/protocol-mechanics/lending-mechanism') },
              { text: '单边借贷流动性', link: withLocale(locale, '/whitepaper/protocol-mechanics/single-sided-lending-liquidity') },
              { text: '还款', link: withLocale(locale, '/whitepaper/protocol-mechanics/repayment') },
              { text: '利率机制设计', link: withLocale(locale, '/whitepaper/protocol-mechanics/interest-rate-mechanism-design') },
              { text: '清算机制', link: withLocale(locale, '/whitepaper/protocol-mechanics/liquidation-mechanism') },
              { text: '保险基金机制', link: withLocale(locale, '/whitepaper/protocol-mechanics/insurance-fund-mechanism') },
              {
                text: '特殊情况下的流动性耗尽处理',
                link: withLocale(locale, '/whitepaper/protocol-mechanics/handling-exhausted-liquidity-in-special-cases')
              }
            ]
          },
          {
            text: '风险管理与策略',
            collapsed: false,
            items: [
              { text: '概览', link: withLocale(locale, '/whitepaper/risk-management-and-strategies') },
              { text: '截断预言参考', link: withLocale(locale, '/whitepaper/risk-management-and-strategies/truncated-oracles') },
              {
                text: '针对 MEV 与套利攻击的动态费率策略',
                link: withLocale(locale, '/whitepaper/risk-management-and-strategies/dynamic-fee-strategy-against-mev-and-arbitrage-attacks')
              },
              {
                text: '动态解锁机制下的流动性保护',
                link: withLocale(locale, '/whitepaper/risk-management-and-strategies/liquidity-protection-with-dynamic-unlock-mechanism')
              }
            ]
          },
          { text: '结论', link: withLocale(locale, '/whitepaper/conclusion') },
          { text: '参考资料', link: withLocale(locale, '/whitepaper/references') }
        ]
      },
      {
        text: '代币经济',
        items: [{ text: 'LIKWID', link: withLocale(locale, '/tokenomics/likwid') }]
      },
      {
        text: '产品',
        items: [
          { text: '安全审计', link: withLocale(locale, '/product/security-audits') },
          { text: '合约地址', link: withLocale(locale, '/product/contract-address') },
          { text: 'FAQ - Likwid 创新问答', link: withLocale(locale, '/product/faq-innovation-behind-likwid') }
        ]
      },
      {
        text: '集成',
        items: [
          { text: '清算指南', link: withLocale(locale, '/integration/liquidation-guide') },
          { text: 'Likwid 集成手册', link: withLocale(locale, '/integration/likwid-integration-manual') }
        ]
      },
      {
        text: '支持',
        items: [{ text: '品牌素材', link: withLocale(locale, '/support/brand-kit') }]
      },
      {
        text: '法务',
        items: [
          { text: '免责声明', link: withLocale(locale, '/legal/disclaimer') },
          { text: '服务条款', link: withLocale(locale, '/legal/terms-of-service') },
          { text: '隐私政策', link: withLocale(locale, '/legal/privacy-policy') }
        ]
      }
    ]
  }

  return [
    {
      text: 'Whitepaper',
      collapsed: false,
      items: [
        { text: 'Introduction', link: withLocale(locale, '/') },
        { text: 'Theoretical Framework', link: withLocale(locale, '/whitepaper/theoretical-framework') },
        {
          text: 'Protocol Mechanics',
          collapsed: false,
          items: [
            { text: 'Overview', link: withLocale(locale, '/whitepaper/protocol-mechanics') },
            { text: 'Pool Creation', link: withLocale(locale, '/whitepaper/protocol-mechanics/pool-creation') },
            { text: 'Liquidity Provision', link: withLocale(locale, '/whitepaper/protocol-mechanics/liquidity-provision') },
            { text: 'Margin Position Mechanics', link: withLocale(locale, '/whitepaper/protocol-mechanics/margin-position-mechanics') },
            { text: 'Synthetic Token', link: withLocale(locale, '/whitepaper/protocol-mechanics/synthetic-token') },
            { text: 'Lending Mechanism', link: withLocale(locale, '/whitepaper/protocol-mechanics/lending-mechanism') },
            { text: 'Single-Sided Lending Liquidity', link: withLocale(locale, '/whitepaper/protocol-mechanics/single-sided-lending-liquidity') },
            { text: 'Repayment', link: withLocale(locale, '/whitepaper/protocol-mechanics/repayment') },
            { text: 'Interest Rate Mechanism Design', link: withLocale(locale, '/whitepaper/protocol-mechanics/interest-rate-mechanism-design') },
            { text: 'Liquidation Mechanism', link: withLocale(locale, '/whitepaper/protocol-mechanics/liquidation-mechanism') },
            { text: 'Insurance Fund Mechanism', link: withLocale(locale, '/whitepaper/protocol-mechanics/insurance-fund-mechanism') },
            {
              text: 'Handling Exhausted Liquidity in Special Cases',
              link: withLocale(locale, '/whitepaper/protocol-mechanics/handling-exhausted-liquidity-in-special-cases')
            }
          ]
        },
        {
          text: 'Risk Management & Strategies',
          collapsed: false,
          items: [
            { text: 'Overview', link: withLocale(locale, '/whitepaper/risk-management-and-strategies') },
            { text: 'Truncated Oracles', link: withLocale(locale, '/whitepaper/risk-management-and-strategies/truncated-oracles') },
            {
              text: 'Dynamic Fee Strategy Against MEV and Arbitrage Attacks',
              link: withLocale(locale, '/whitepaper/risk-management-and-strategies/dynamic-fee-strategy-against-mev-and-arbitrage-attacks')
            },
            {
              text: 'Liquidity Protection with Dynamic Unlock Mechanism',
              link: withLocale(locale, '/whitepaper/risk-management-and-strategies/liquidity-protection-with-dynamic-unlock-mechanism')
            }
          ]
        },
        { text: 'Conclusion', link: withLocale(locale, '/whitepaper/conclusion') },
        { text: 'References', link: withLocale(locale, '/whitepaper/references') }
      ]
    },
    {
      text: 'Tokenomics',
      items: [{ text: 'LIKWID', link: withLocale(locale, '/tokenomics/likwid') }]
    },
    {
      text: 'Product',
      items: [
        { text: 'Security Audits', link: withLocale(locale, '/product/security-audits') },
        { text: 'Contract Address', link: withLocale(locale, '/product/contract-address') },
        { text: 'FAQ - Innovation Behind Likwid', link: withLocale(locale, '/product/faq-innovation-behind-likwid') }
      ]
    },
    {
      text: 'Integration',
      items: [
        { text: 'Liquidation Guide', link: withLocale(locale, '/integration/liquidation-guide') },
        { text: 'Likwid Integration Manual', link: withLocale(locale, '/integration/likwid-integration-manual') }
      ]
    },
    {
      text: 'Support',
      items: [{ text: 'Brand Kit', link: withLocale(locale, '/support/brand-kit') }]
    },
    {
      text: 'Legal',
      items: [
        { text: 'Disclaimer', link: withLocale(locale, '/legal/disclaimer') },
        { text: 'Terms of Service', link: withLocale(locale, '/legal/terms-of-service') },
        { text: 'Privacy Policy', link: withLocale(locale, '/legal/privacy-policy') }
      ]
    }
  ]
}

export default defineConfig({
  lang: 'en-US',
  title: siteMeta.title,
  description: siteMeta.description,
  cleanUrls: true,
  sitemap: {
    hostname: siteUrl
  },
  head: [['meta', { name: 'theme-color', content: '#346ddb' }]],
  transformHead({ page }) {
    const route = routeForPage(page)
    const canonicalUrl = `${siteUrl}${route === '/' ? '' : route}`

    return [['link', { rel: 'canonical', href: canonicalUrl }]]
  },
  markdown: {
    lineNumbers: true,
    math: true
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      link: '/'
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'Likwid 文档',
      description: 'Likwid 协议、产品、集成与法务文档。',
      themeConfig: {
        nav: buildNav('zh'),
        sidebar: buildSidebar('zh'),
        outline: {
          level: 'deep',
          label: '本页内容'
        },
        docFooter: {
          prev: '上一页',
          next: '下一页'
        },
        footer: {
          message: '基于 Markdown 构建，并通过 Cloudflare Pages 部署。',
          copyright: 'Copyright © Likwid'
        },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳转到内容'
      }
    }
  },
  themeConfig: {
    nav: buildNav('en'),
    sidebar: buildSidebar('en'),
    search: {
      provider: 'local',
      options: {
        locales: searchTranslations
      }
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
    },
    darkModeSwitchLabel: 'Appearance',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Return to top',
    langMenuLabel: 'Change language',
    skipToContentLabel: 'Skip to content'
  }
})
