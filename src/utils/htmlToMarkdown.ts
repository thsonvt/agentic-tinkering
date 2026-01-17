type HtmlToMarkdownContext = {
  listDepth: number;
  orderedListCounters: number[];
  blockquoteDepth: number;
  inPre: boolean;
  inListItem: boolean;
};

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u00a0/g, ' ');
}

function sanitizeUrl(raw: string): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('javascript:')) return null;
  if (lower.startsWith('vbscript:')) return null;
  if (lower.startsWith('data:')) return null;
  return value;
}

function collapseBlankLines(markdown: string): string {
  return markdown
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function getConsecutiveBackticksLength(value: string): number {
  let max = 0;
  let current = 0;
  for (const ch of value) {
    if (ch === '`') {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

function wrapInlineCode(code: string): string {
  const text = normalizeNewlines(code).replace(/\n+/g, ' ').trim();
  const fence = '`'.repeat(getConsecutiveBackticksLength(text) + 1);
  return `${fence}${text}${fence}`;
}

function wrapCodeBlock(code: string, language?: string): string {
  const text = normalizeNewlines(code).replace(/\n+$/g, '');
  const fence = '`'.repeat(Math.max(3, getConsecutiveBackticksLength(text) + 1));
  const lang = language ? String(language).trim() : '';
  return `\n\n${fence}${lang ? ` ${lang}` : ''}\n${text}\n${fence}\n\n`;
}

function toPlainText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeNewlines(node.textContent || '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  let out = '';
  for (const child of Array.from(el.childNodes)) {
    out += toPlainText(child);
  }
  return out;
}

function escapeTableCell(value: string): string {
  const text = normalizeNewlines(value)
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.replace(/\|/g, '\\|');
}

function prefixBlockquote(text: string, depth: number): string {
  const prefix = `${'> '.repeat(depth)}`.trimEnd();
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.replace(/[ \t]+$/g, '');
      if (!trimmed) return '';
      return `${prefix}${prefix ? ' ' : ''}${trimmed}`;
    })
    .join('\n');
}

function serializeChildren(node: Node, ctx: HtmlToMarkdownContext): string {
  return Array.from(node.childNodes)
    .map((child) => serializeNode(child, ctx))
    .join('');
}

function serializeListItemContent(li: Element, ctx: HtmlToMarkdownContext): string {
  const itemCtx: HtmlToMarkdownContext = {...ctx, inListItem: true};
  let content = serializeChildren(li, itemCtx);
  content = collapseBlankLines(content).trim();
  return content;
}

function serializeTable(table: Element, ctx: HtmlToMarkdownContext): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  const rowCells = rows.map((row) => {
    const cells = Array.from(row.children).filter((c) => {
      const tag = (c as Element).tagName.toLowerCase();
      return tag === 'th' || tag === 'td';
    }) as Element[];
    return cells.map((cell) => escapeTableCell(toPlainText(cell)));
  });

  const headerRowIndex = rows.findIndex((row) =>
    Array.from(row.children).some((c) => (c as Element).tagName.toLowerCase() === 'th')
  );
  const header = (headerRowIndex >= 0 ? rowCells[headerRowIndex] : rowCells[0]) || [];
  const bodyRows = rowCells.filter((_, idx) => idx !== headerRowIndex);

  const columnCount = Math.max(
    1,
    header.length,
    ...bodyRows.map((cells) => cells.length)
  );

  const normalizedHeader = Array.from({length: columnCount}, (_, i) => header[i] || '');
  const separator = Array.from({length: columnCount}, () => '---');

  const lines: string[] = [];
  lines.push(`| ${normalizedHeader.join(' | ')} |`);
  lines.push(`| ${separator.join(' | ')} |`);
  for (const row of bodyRows) {
    const normalizedRow = Array.from({length: columnCount}, (_, i) => row[i] || '');
    lines.push(`| ${normalizedRow.join(' | ')} |`);
  }

  const tableMarkdown = `${lines.join('\n')}\n`;
  return ctx.blockquoteDepth > 0 ? `${prefixBlockquote(tableMarkdown, ctx.blockquoteDepth)}\n` : `\n\n${tableMarkdown}\n`;
}

function serializeNode(node: Node, ctx: HtmlToMarkdownContext): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeNewlines(node.textContent || '');
    if (ctx.inPre) return text;
    return text.replace(/\s+/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') return '\n';
  if (tag === 'hr') return '\n\n---\n\n';

  if (tag === 'strong' || tag === 'b') {
    const inner = serializeChildren(el, ctx).trim();
    return inner ? `**${inner}**` : '';
  }
  if (tag === 'em' || tag === 'i') {
    const inner = serializeChildren(el, ctx).trim();
    return inner ? `*${inner}*` : '';
  }
  if (tag === 'del' || tag === 's' || tag === 'strike') {
    const inner = serializeChildren(el, ctx).trim();
    return inner ? `~~${inner}~~` : '';
  }
  if (tag === 'mark') {
    const inner = serializeChildren(el, ctx).trim();
    return inner ? `<mark>${inner}</mark>` : '';
  }

  if (tag === 'code') {
    const parentTag = el.parentElement?.tagName.toLowerCase();
    const text = toPlainText(el);
    if (parentTag === 'pre') return text;
    return text ? wrapInlineCode(text) : '';
  }
  if (tag === 'pre') {
    const codeEl = el.querySelector('code');
    const codeText = codeEl ? toPlainText(codeEl) : toPlainText(el);
    const className = (codeEl?.getAttribute('class') || el.getAttribute('class') || '').toLowerCase();
    const languageMatch = className.match(/language-([a-z0-9_+-]+)/);
    const language = languageMatch?.[1];
    return wrapCodeBlock(codeText, language);
  }

  if (tag === 'a') {
    const href = sanitizeUrl(el.getAttribute('href') || '');
    const text = collapseBlankLines(serializeChildren(el, ctx)).trim() || href || '';
    if (!href) return text;
    return `[${text}](${href})`;
  }

  if (tag === 'img') {
    const src = sanitizeUrl(el.getAttribute('src') || '');
    const alt = (el.getAttribute('alt') || '').trim();
    if (!src) return alt;
    return `![${alt}](${src})`;
  }

  if (tag === 'blockquote') {
    const inner = collapseBlankLines(serializeChildren(el, {...ctx, blockquoteDepth: ctx.blockquoteDepth + 1}));
    return `\n\n${prefixBlockquote(inner, ctx.blockquoteDepth + 1)}\n\n`;
  }

  if (tag === 'ul' || tag === 'ol') {
    const isOrdered = tag === 'ol';
    const nextCtx: HtmlToMarkdownContext = {
      ...ctx,
      listDepth: ctx.listDepth + 1,
      orderedListCounters: isOrdered
        ? [...ctx.orderedListCounters, Number(el.getAttribute('start') || 1)]
        : [...ctx.orderedListCounters, 0],
    };

    let out = '\n';
    for (const child of Array.from(el.children)) {
      if (child.tagName.toLowerCase() !== 'li') continue;
      const depth = nextCtx.listDepth - 1;
      const indent = '  '.repeat(depth);

      const counterIndex = nextCtx.orderedListCounters.length - 1;
      let marker = '- ';
      if (isOrdered) {
        const current = nextCtx.orderedListCounters[counterIndex] || 1;
        marker = `${current}. `;
        nextCtx.orderedListCounters[counterIndex] = current + 1;
      }

      const itemContent = serializeListItemContent(child, nextCtx);
      if (!itemContent) continue;

      const indented = itemContent
        .split('\n')
        .map((line, idx) => {
          if (!line.trim()) return idx === 0 ? '' : `${indent}  `;
          return idx === 0 ? line : `${indent}  ${line}`;
        })
        .join('\n');

      out += `${indent}${marker}${indented}\n`;
    }
    return out + '\n';
  }

  if (tag === 'li') {
    return serializeChildren(el, ctx);
  }

  if (tag === 'table') {
    return serializeTable(el, ctx);
  }

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const inner = collapseBlankLines(serializeChildren(el, ctx)).trim();
    if (!inner) return '';
    const heading = `${'#'.repeat(level)} ${inner}\n`;
    return ctx.inListItem ? `${heading}` : `\n\n${heading}\n`;
  }

  if (tag === 'p' || tag === 'div') {
    const inner = collapseBlankLines(serializeChildren(el, ctx)).trim();
    if (!inner) return '';
    const value = `${inner}\n`;
    if (ctx.inListItem) return value;
    return `\n\n${value}\n`;
  }

  if (tag === 'span') {
    return serializeChildren(el, ctx);
  }

  return serializeChildren(el, ctx);
}

export function htmlToMarkdown(html: string): string {
  const input = String(html || '').trim();
  if (!input) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const ctx: HtmlToMarkdownContext = {
    listDepth: 0,
    orderedListCounters: [],
    blockquoteDepth: 0,
    inPre: false,
    inListItem: false,
  };

  const raw = serializeChildren(doc.body, ctx);
  return collapseBlankLines(raw);
}

