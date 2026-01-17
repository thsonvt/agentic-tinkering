import React, {type ReactElement} from 'react';
import Link from '@docusaurus/Link';
import type {Props} from '@theme/BlogSidebar';
import styles from './styles.module.css';

// Helper to group posts by year
function groupByYear(items: Array<{title: string; permalink: string; date: Date}>) {
  const groups: Record<string, typeof items> = {};
  items.forEach((item) => {
    const year = item.date.getFullYear().toString();
    if (!groups[year]) groups[year] = [];
    groups[year].push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => parseInt(b) - parseInt(a));
}

function SidebarItems({sidebar}: {sidebar: Props['sidebar']}) {
  if (!sidebar?.items?.length) return null;

  const items = sidebar.items.map((item) => ({
    title: item.title,
    permalink: item.permalink,
    date: new Date(item.date),
  }));

  const grouped = groupByYear(items);

  return (
    <>
      {grouped.map(([year, yearItems]) => (
        <div key={`static-${year}`} className={styles.sidebarItemCategory}>
          <h5 className={styles.sidebarItemCategoryTitle}>{year}</h5>
          <ul className={styles.sidebarItemList}>
            {yearItems.map((item) => (
              <li key={item.permalink} className={styles.sidebarItem}>
                <Link
                  to={item.permalink}
                  className={styles.sidebarItemLink}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function BlogSidebar({sidebar}: Props): ReactElement | null {
  if (!sidebar) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
      <nav>
        <h3 className={styles.sidebarTitle}>{sidebar.title}</h3>
        <SidebarItems sidebar={sidebar} />
      </nav>
    </aside>
  );
}
