import * as React from 'react';

interface PostContentProps {
  /** Cuerpo del artículo en Markdown/MDX plano (sin componentes MDX embebidos). */
  contentMdx: string;
}

/**
 * Renderiza el Markdown del artículo como elementos React (sin `dangerouslySetInnerHTML`).
 * Cubre el subconjunto habitual de un editor de blog: encabezados, párrafos,
 * listas, citas, bloques de código y énfasis en línea (negrita/cursiva/enlace).
 */
export function PostContent({ contentMdx }: PostContentProps): React.JSX.Element {
  const blocks = parseBlocks(contentMdx);

  return (
    <div className="prose-blog max-w-none space-y-5 text-[1.05rem] leading-relaxed text-ink-soft">
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length as 1 | 2 | 3 | 4;
      blocks.push({ type: 'heading', level, text: headingMatch[2]!.trim() });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    const bulletMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    const orderedMatch = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bulletMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? '';
        const m = ordered ? /^\s*\d+[.)]\s+(.*)$/.exec(current) : /^\s*[-*]\s+(.*)$/.exec(current);
        if (!m) break;
        items.push(m[1]!.trim());
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph: accumulate until a blank line or a new block starts.
    const paraLines: string[] = [line.trim()];
    i++;
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[i] ?? '') &&
      !/^>\s?/.test(lines[i] ?? '') &&
      !/^\s*[-*]\s+/.test(lines[i] ?? '') &&
      !/^\s*\d+[.)]\s+/.test(lines[i] ?? '') &&
      !(lines[i] ?? '').trim().startsWith('```')
    ) {
      paraLines.push((lines[i] ?? '').trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

const HEADING_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: 'font-serif text-3xl font-bold text-ink',
  2: 'font-serif text-2xl font-bold text-ink',
  3: 'font-serif text-xl font-semibold text-ink',
  4: 'font-serif text-lg font-semibold text-ink',
};

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level}` as unknown) as 'h1' | 'h2' | 'h3' | 'h4';
      return (
        <Tag key={key} className={HEADING_CLASS[block.level]}>
          {renderInline(block.text)}
        </Tag>
      );
    }
    case 'quote':
      return (
        <blockquote
          key={key}
          className="border-l-4 border-brand-300 bg-brand-50/60 px-5 py-3 italic text-ink-soft"
        >
          {renderInline(block.text)}
        </blockquote>
      );
    case 'code':
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-xl bg-ink px-5 py-4 text-sm text-white/90"
        >
          <code>{block.text}</code>
        </pre>
      );
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={key}
          className={
            block.ordered
              ? 'list-decimal space-y-1.5 pl-6 marker:text-brand-500'
              : 'list-disc space-y-1.5 pl-6 marker:text-brand-500'
          }
        >
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ListTag>
      );
    }
    case 'paragraph':
    default:
      return <p key={key}>{renderInline(block.text)}</p>;
  }
}

/** Convierte énfasis en línea (**negrita**, *cursiva*, [texto](url)) a nodos React. */
function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      tokens.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      tokens.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const href = match[4];
      const isSafe = /^(https?:)?\/\//.test(href) || href.startsWith('/');
      tokens.push(
        isSafe ? (
          <a
            key={key++}
            href={href}
            className="font-medium text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {match[3]}
          </a>
        ) : (
          match[3]
        ),
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}
