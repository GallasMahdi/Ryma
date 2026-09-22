export type ArticleBlock =
  | { type: 'heading'; level: 2 | 3; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

const heading = /^(#{2,3})\s+(.+)$/;
const listItem = /^(?:- |\d+\. )/;
const cells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());

/** Parse the small Markdown subset used by the local editorial collection. */
export function parseArticleContent(content: string): ArticleBlock[] {
  const lines = content.split(/\r?\n/).map(line => line.trim());
  const blocks: ArticleBlock[] = [];
  let index = 0;
  let section = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line) { index++; continue; }
    const match = line.match(heading);
    if (match) {
      blocks.push({ type: 'heading', level: match[1].length as 2 | 3, text: match[2], id: `section-${++section}` });
      index++;
      continue;
    }
    if (line.startsWith('|') && /^\|?\s*:?-{3,}/.test(lines[index + 1] ?? '')) {
      const headers = cells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].startsWith('|')) rows.push(cells(lines[index++]));
      blocks.push({ type: 'table', headers, rows });
      continue;
    }
    if (listItem.test(line)) {
      const ordered = /^\d+\./.test(line);
      const pattern = ordered ? /^\d+\. / : /^- /;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index])) items.push(lines[index++].replace(pattern, ''));
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const paragraph = [line];
    index++;
    while (index < lines.length && lines[index] && !heading.test(lines[index]) && !listItem.test(lines[index]) && !lines[index].startsWith('|')) paragraph.push(lines[index++]);
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}
