import type { ArticleBlock } from '@/lib/journal-content';
import styles from './Journal.module.css';

function InlineText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) =>
    part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part.startsWith('*') ? <em key={index}>{part.slice(1, -1)}</em> : part,
  );
}

export function ArticleContent({ blocks, tableLabel }: { blocks: ArticleBlock[]; tableLabel: string }) {
  return <div className={styles.prose}>{blocks.map((block, index) => {
    if (block.type === 'heading') {
      const Heading = block.level === 2 ? 'h2' : 'h3';
      return <Heading key={index} id={block.id}><InlineText text={block.text} /></Heading>;
    }
    if (block.type === 'list') {
      const List = block.ordered ? 'ol' : 'ul';
      return <List key={index}>{block.items.map((item, i) => <li key={i}><InlineText text={item} /></li>)}</List>;
    }
    if (block.type === 'table') {
      return <div key={index} className={styles.tableWrap} role="region" aria-label={tableLabel} tabIndex={0}>
        <table aria-label={tableLabel}><thead><tr>{block.headers.map((cell, i) => <th scope="col" key={i}><InlineText text={cell} /></th>)}</tr></thead>
          <tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}><InlineText text={cell} /></td>)}</tr>)}</tbody>
        </table>
      </div>;
    }
    return <p key={index}><InlineText text={block.text} /></p>;
  })}</div>;
}
