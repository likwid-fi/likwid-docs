import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const docsRoot = path.join(repoRoot, 'docs')
const publicRoot = path.join(docsRoot, 'public')

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === '.vitepress' || entry.name === 'public') {
      continue
    }

    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(absolutePath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(absolutePath)
    }
  }

  return files
}

async function collectPublicFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = new Set()

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      for (const nested of await collectPublicFiles(absolutePath)) {
        files.add(nested)
      }
      continue
    }

    files.add(`/${path.relative(publicRoot, absolutePath).replace(/\\/g, '/')}`)
  }

  return files
}

function routeForFile(filePath) {
  const relativePath = path.relative(docsRoot, filePath).replace(/\\/g, '/')
  if (relativePath === 'index.md') {
    return '/'
  }
  return `/${relativePath.replace(/\.md$/, '').replace(/\/index$/, '')}`
}

function routeToFile(route) {
  if (route === '/') {
    return path.join(docsRoot, 'index.md')
  }
  return path.join(docsRoot, `${route.replace(/^\//, '')}.md`)
}

function resolveRelativeLink(route, link) {
  const currentSegments = route === '/' ? [] : route.replace(/^\//, '').split('/')
  currentSegments.pop()

  for (const segment of link.split('/')) {
    if (!segment || segment === '.') {
      continue
    }

    if (segment === '..') {
      currentSegments.pop()
      continue
    }

    currentSegments.push(segment)
  }

  return `/${currentSegments.join('/')}`.replace(/\/+/g, '/')
}

const markdownFiles = await collectMarkdownFiles(docsRoot)
const publicFiles = await collectPublicFiles(publicRoot)
const routeSet = new Set(markdownFiles.map(routeForFile))
const brokenLinks = []

for (const markdownFile of markdownFiles) {
  const content = await readFile(markdownFile, 'utf8')
  const route = routeForFile(markdownFile)
  const links = [
    ...content.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g),
    ...content.matchAll(/<a\s+[^>]*href="([^"]+)"/g),
    ...content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g),
    ...content.matchAll(/<img[^>]*src="([^"]+)"/g)
  ].map((match) => match[1])

  for (const rawLink of links) {
    const link = rawLink.trim()

    if (!link || link.startsWith('http://') || link.startsWith('https://') || link.startsWith('mailto:') || link.startsWith('#')) {
      continue
    }

    const [pathWithoutHash] = link.split('#')
    if (!pathWithoutHash) {
      continue
    }

    if (pathWithoutHash.startsWith('/assets/')) {
      if (!publicFiles.has(pathWithoutHash)) {
        brokenLinks.push({ file: markdownFile, route, link })
      }
      continue
    }

    const resolvedRoute = pathWithoutHash.startsWith('/')
      ? pathWithoutHash.replace(/\/$/, '') || '/'
      : resolveRelativeLink(route, pathWithoutHash).replace(/\/$/, '') || '/'

    if (!routeSet.has(resolvedRoute) && !routeSet.has(`${resolvedRoute}/index`) && !routeSet.has(resolvedRoute.replace(/\/index$/, '') || '/')) {
      const candidateFile = routeToFile(resolvedRoute)
      brokenLinks.push({
        file: markdownFile,
        route,
        link,
        expected: candidateFile
      })
    }
  }
}

if (brokenLinks.length > 0) {
  console.error('Broken internal links found:')
  for (const brokenLink of brokenLinks) {
    console.error(`- ${brokenLink.file}: ${brokenLink.link}`)
  }
  process.exit(1)
}

console.log(`Validated internal links across ${markdownFiles.length} Markdown files.`)
