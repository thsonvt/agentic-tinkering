import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ProtectedContent from '@site/src/components/ProtectedContent';
import styles from './styles.module.css';

// Import draft content - add your drafts here
const drafts = [
  {
    title: 'Sample Draft Post',
    description: 'This is a sample draft post that only you can see.',
    path: '/drafts/sample-draft',
    date: '2025-01-13',
  },
];

export default function DraftsPage(): React.ReactNode {
  return (
    <Layout title="Drafts" description="Private draft content">
      <ProtectedContent>
        <div className={styles.container}>
          <h1>Drafts</h1>
          <p className={styles.subtitle}>
            Your private work-in-progress content. Only visible when logged in.
          </p>

          {drafts.length === 0 ? (
            <p className={styles.empty}>No drafts yet.</p>
          ) : (
            <div className={styles.draftList}>
              {drafts.map((draft) => (
                <Link key={draft.path} to={draft.path} className={styles.draftCard}>
                  <h3>{draft.title}</h3>
                  <p>{draft.description}</p>
                  <span className={styles.date}>{draft.date}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </ProtectedContent>
    </Layout>
  );
}
