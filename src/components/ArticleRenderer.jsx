import React from 'react'

/**
 * Sanitizes and cleans any CSS residue or web layout artifacts on the fly.
 */
function sanitizeText(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .replace(/[.#\w-]+\s*\{[^}]*\}/g, ' ')
    .replace(/\{[^{}]*:[^{}]*\}/g, ' ')
    .replace(/var\(--[^)]+\)/g, ' ')
    .replace(/calc\([^)]+\)/g, ' ')
    .replace(/(?:margin|padding|color|font|border|display|flex|align|background|opacity|width|height|position|z-index|transform|transition|cursor|overflow)[-:\w\s()#%.,;!]+(?=;|\n|\.title|\.post)/gi, ' ')
    .replace(/^(?:Lire l'article|Lire la suite|Voir plus|Voir l'article|Read more|Dernières actualités\s*Toutes les actualités)/gi, '')
    .trim()
}

/**
 * Parses inline **bold** formatting inside a plain text segment.
 */
function renderBold(text, prefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${prefix}-${j}`} className="font-semibold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

/**
 * Only allows http(s) URLs into href/src attributes. Content comes from
 * scraped government pages and AI output, so a crafted `javascript:` or
 * `data:` URL must never become a clickable link.
 */
function safeUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://moncheck.invalid')
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

/**
 * Parses inline formatting like **bold text** and [label](url) links
 * into React elements. Links open in a new tab with safe rel attrs.
 */
function renderInline(text) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (match) {
      const href = safeUrl(match[2])
      if (href) {
        return (
          <a
            key={`link-${i}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {renderBold(match[1], `link-${i}`)}
          </a>
        )
      }
      return renderBold(match[1], `link-${i}`)
    }
    return renderBold(part, `t-${i}`)
  })
}

/**
 * High-end Structured Article Content Renderer with Markdown support.
 */
export default function ArticleRenderer({ content, className = '' }) {
  if (!content) return null

  const cleaned = sanitizeText(content)
  const lines = cleaned.split('\n')

  const elements = []
  let currentList = []

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-4 space-y-2 rounded-xl bg-surface-container-low/60 p-4">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-body-md leading-relaxed text-on-surface-variant">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  // Iterate line by line to build high quality structured sections
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue

    // List item (e.g. "- Item" or "* Item")
    if (/^[-*•]\s+/.test(rawLine)) {
      currentList.push(rawLine.replace(/^[-*•]\s+/, ''))
      continue
    }

    // Flush any pending list before handling block elements
    flushList()

    // Markdown image (![alt](src)) with alt fallback + lazy loading
    const imgMatch = rawLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      const src = safeUrl(imgMatch[2])
      if (src) {
        elements.push(
          <img
            key={`img-${elements.length}`}
            src={src}
            alt={imgMatch[1] || 'Illustration'}
            loading="lazy"
            className="my-4 w-full rounded-2xl object-cover"
          />
        )
      }
      continue
    }

    // H1 is reserved for the page title — downgrade to H2 styling
    if (rawLine.startsWith('# ')) {
      elements.push(
        <div key={`h2-${elements.length}`} className="mt-8 mb-3 border-b border-outline-variant/60 pb-2">
          <h2 className="flex items-center gap-2 text-[20px] font-bold tracking-tight text-on-surface">
            <span className="h-4 w-1 rounded-full bg-primary" />
            {renderInline(rawLine.replace(/^#\s+/, ''))}
          </h2>
        </div>
      )
      continue
    }

    // H2 Header
    if (rawLine.startsWith('## ')) {
      elements.push(
        <div key={`h2-${elements.length}`} className="mt-8 mb-3 border-b border-outline-variant/60 pb-2">
          <h2 className="flex items-center gap-2 text-[20px] font-bold tracking-tight text-on-surface">
            <span className="h-4 w-1 rounded-full bg-primary" />
            {renderInline(rawLine.replace(/^##\s+/, ''))}
          </h2>
        </div>
      )
      continue
    }

    // H3 Header
    if (rawLine.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="mt-5 mb-2 text-[16px] font-semibold text-primary">
          {renderInline(rawLine.replace(/^###\s+/, ''))}
        </h3>
      )
      continue
    }

    // Blockquote
    if (rawLine.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="my-4 border-l-4 border-secondary bg-secondary-container/15 p-4 rounded-r-2xl text-body-md italic text-on-surface leading-relaxed"
        >
          {renderInline(rawLine.replace(/^>\s+/, ''))}
        </blockquote>
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${elements.length}`} className="mb-4 text-body-lg leading-relaxed text-on-surface-variant">
        {renderInline(rawLine)}
      </p>
    )
  }

  // Final list flush
  flushList()

  return <div className={`article-content ${className}`}>{elements}</div>
}
