import * as cheerio from 'cheerio'

/**
 * Extracts and structures article content from HTML using DOM hierarchy.
 */
export function extractStructuredArticle(html, fallbackTitle = '') {
  if (!html) return { title: fallbackTitle, summary: fallbackTitle, content: '' }

  const $ = cheerio.load(html)

  // 1. Remove all extraneous noise, ads, layout, menus, sidebars, comments
  $(
    'style, script, noscript, iframe, svg, nav, header, footer, aside, form, ' +
    '.nav, .menu, .sidebar, .breadcrumb, .pagination, .cookie, .cookie-banner, .popup, .modal, ' +
    '.ads, .advertisement, .share-buttons, .tags, .categories, .author-box, .related-posts, ' +
    '.comments, .widget, .post-meta, .entry-meta, .byline, .social-links, .tag-cloud, ' +
    '.header-top, .header-bottom, .top-bar, .bottom-bar, .mobile-menu, .site-header, .site-footer, ' +
    '[class*="sidebar"], [class*="footer"], [class*="header"], [class*="nav"], [class*="menu"], ' +
    '[class*="cookie"], [class*="banner"], [class*="social"], [class*="share"], [class*="widget"], [class*="related"]'
  ).remove()

  // 2. Locate main article container
  const candidateSelectors = [
    'article .entry-content',
    'article .post-content',
    'article .article-content',
    'article .content',
    'article .post-body',
    'article',
    'main .content',
    'main #content',
    '.main-content',
    '#main-content',
    'main',
    '#content',
    'body'
  ]

  let $root = null
  for (const sel of candidateSelectors) {
    const el = $(sel)
    if (el.length && el.text().trim().length > 150) {
      $root = el.first()
      break
    }
  }
  if (!$root) $root = $('body')

  // 3. Extract title
  let title = $('h1').first().text().trim() || $('article h2').first().text().trim() || fallbackTitle
  title = title.replace(/\s+/g, ' ').slice(0, 200)

  // 4. Iterate over DOM elements to construct Markdown
  const markdownBlocks = []

  $root.find('h1, h2, h3, h4, h5, p, ul, ol, blockquote').each((_, el) => {
    const tagName = el.tagName.toLowerCase()
    const rawText = $(el).text().trim().replace(/\s+/g, ' ')

    // Filter out CSS or layout strings
    if (
      !rawText ||
      rawText.length < 5 ||
      rawText.includes('var(--') ||
      rawText.includes('font-weight:') ||
      rawText.includes('margin-top:') ||
      rawText.includes('padding:') ||
      rawText.includes('{') ||
      rawText.includes('}') ||
      /^(?:Lire l'article|Lire la suite|Voir plus|Voir l'article|Read more|Partager|Suivez-nous)/i.test(rawText)
    ) {
      return
    }

    if (tagName === 'h1' || tagName === 'h2') {
      markdownBlocks.push(`## ${rawText}`)
    } else if (tagName === 'h3' || tagName === 'h4' || tagName === 'h5') {
      markdownBlocks.push(`### ${rawText}`)
    } else if (tagName === 'ul' || tagName === 'ol') {
      $(el).find('li').each((_, li) => {
        const liText = $(li).text().trim().replace(/\s+/g, ' ')
        if (liText.length > 5 && !liText.includes('var(--')) {
          markdownBlocks.push(`- ${liText}`)
        }
      })
    } else if (tagName === 'blockquote') {
      markdownBlocks.push(`> ${rawText}`)
    } else if (tagName === 'p') {
      // Check if paragraph contains numbered Roman numeral sub-items
      if (/^(?:I{1,3}|IV|V|VI|VII|VIII|IX|X)-\d+\.\s*/i.test(rawText)) {
        markdownBlocks.push(`### ${rawText}`)
      } else if (/^(?:Mesures normatives|Communications|Décisions administratives)/i.test(rawText)) {
        markdownBlocks.push(`## ${rawText}`)
      } else {
        markdownBlocks.push(rawText)
      }
    }
  })

  // 5. Build final Markdown content
  let content = markdownBlocks.join('\n\n')

  // If DOM extraction was too thin, fallback to text-based cleanup
  if (content.length < 100) {
    content = cleanAndFormatArticle($root.text(), title)
  }

  // 6. Generate crisp summary
  const summary = generateCleanSummary(content, title)

  return { title, summary, content }
}

/**
 * Text-based sanitizer & Markdown restructurer.
 */
export function cleanAndFormatArticle(raw, _fallbackTitle = '') {
  if (!raw || typeof raw !== 'string') return ''

  let text = raw

  // 1. Remove HTML tags
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
  text = text.replace(/<[^>]+>/g, ' ')

  // 2. Remove CSS selectors, rules & variables
  text = text.replace(/[.#\w-]+\s*\{[^}]*\}/g, ' ')
  text = text.replace(/\{[^{}]*:[^{}]*\}/g, ' ')
  text = text.replace(/var\(--[^)]+\)/g, ' ')
  text = text.replace(/calc\([^)]+\)/g, ' ')
  text = text.replace(/(?:margin|padding|color|font|border|display|flex|align|background|opacity|width|height|position|z-index|transform|transition|cursor|overflow)[-:\w\s()#%.,;!]+(?=;|\n|\.title|\.post)/gi, ' ')

  // 3. Remove UI boilerplate & nav artifacts
  const boilerplate = [
    /Dernières actualités\s*Toutes les actualités/gi,
    /Lire l'article/gi,
    /Lire la suite/gi,
    /Voir plus/gi,
    /Voir l'article/gi,
    /Read more/gi,
    /Read full/gi,
    /Partager sur (?:Facebook|Twitter|WhatsApp|LinkedIn|X)/gi,
    /Suivez-nous sur/gi,
    /Télécharger le (?:compte rendu|document|PDF)/gi,
    /Tous droits réservés/gi,
    /Copyright © \d{4}/gi,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janv|Févr|Mars|Avr|Mai|Juin|Juil|Août|Sept|Oct|Nov|Déc)\s+\d{4}\s+à\s+\d{1,2}:\d{2}\s*Comptes rendus/gi,
    /Comptes rendusTournée de prise de contact[^.]*\./gi,
  ]
  for (const b of boilerplate) {
    text = text.replace(b, ' ')
  }

  // 4. Normalize spacing
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim()

  // 5. Identify and format Roman numeral sections (e.g. I-1., II-3.)
  text = text.replace(/(?:^|\s)(I{1,3}|IV|V|VI|VII|VIII|IX|X)-(\d+)\.\s*([^\n.]+?\.)/g, '\n\n### $1-$2. $3\n\n')
  text = text.replace(/(?:^|\s)(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s*-\s*([A-ZÀ-Ÿ][^\n.]+?\.)/g, '\n\n## $1 - $2\n\n')
  text = text.replace(/(?:^|\s)(Mesures normatives|Communications|Décisions administratives|Rencontres d'échanges|Au titre des mesures normatives|Au titre des communications)\s*[:.]/gi, '\n\n## $1\n\n')

  // 6. Split dense walls into readable 2-3 sentence paragraphs & bullet points
  const rawParagraphs = text.split(/\n{2,}/)
  const formatted = []

  for (const p of rawParagraphs) {
    const trimmed = p.trim()
    if (!trimmed || trimmed.length < 10) continue

    if (trimmed.startsWith('#')) {
      formatted.push(trimmed)
      continue
    }

    const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [trimmed]
    let chunk = []

    for (const s of sentences) {
      const sTrim = s.trim()
      if (!sTrim || sTrim.length < 5) continue

      if (
        /^(?:[-•*]|\d+\.|\([a-z0-9]\))\s+/i.test(sTrim) ||
        /^(?:Adoption|Acquisition|Contractualisation|Autorisation|Transmission|Approbation|Mise en place|Rappel)\s+de\s+/i.test(sTrim)
      ) {
        if (chunk.length > 0) {
          formatted.push(chunk.join(' '))
          chunk = []
        }
        formatted.push(`- ${sTrim.replace(/^[-•*]\s*/, '')}`)
      } else {
        chunk.push(sTrim)
        if (chunk.length >= 3) {
          formatted.push(chunk.join(' '))
          chunk = []
        }
      }
    }

    if (chunk.length > 0) {
      formatted.push(chunk.join(' '))
    }
  }

  let finalMarkdown = formatted.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()

  if (finalMarkdown.length < 50 && raw.length > 50) {
    finalMarkdown = raw.replace(/[.#\w-]+\s*\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim()
  }

  return finalMarkdown
}

/**
 * Generates clean plain-text summary from Markdown/text.
 */
export function generateCleanSummary(content, fallbackTitle = '') {
  if (!content) return fallbackTitle
  const clean = content
    .replace(/^#+\s+/gm, '')
    .replace(/^- /gm, '')
    .replace(/[.#\w-]+\s*\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean]
  let summary = sentences.slice(0, 2).join(' ').trim()
  if (summary.length < 50 && sentences.length > 2) {
    summary = sentences.slice(0, 3).join(' ').trim()
  }
  if (summary.length > 280) {
    summary = summary.slice(0, 277) + '...'
  }
  return summary || fallbackTitle
}
