import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(__dirname, '..', 'docs')

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

function routeForFile(filePath) {
  const relativePath = path.relative(docsRoot, filePath).replace(/\\/g, '/')
  if (relativePath === 'index.md') {
    return '/'
  }

  return `/${relativePath.replace(/\.md$/, '').replace(/\/index$/, '')}`
}

const files = await collectMarkdownFiles(docsRoot)
const routes = new Map()
const duplicates = []

for (const file of files) {
  const route = routeForFile(file)

  if (routes.has(route)) {
    duplicates.push({ route, first: routes.get(route), second: file })
    continue
  }

  routes.set(route, file)
}

if (duplicates.length > 0) {
  console.error('Duplicate routes found:')
  for (const duplicate of duplicates) {
    console.error(`- ${duplicate.route}: ${duplicate.first} and ${duplicate.second}`)
  }
  process.exit(1)
}

console.log(`Validated ${routes.size} unique documentation routes.`)
