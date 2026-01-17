import React, { lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';

// Lazy load components that use browser-only APIs (Convex, pdfjs-dist)
const DraftsContentLazy = lazy(() => import('@site/src/components/DraftsContent'));

export default function DraftsPage(): React.ReactNode {
  return (
    <Layout title="Drafts" description="Private draft content">
      <BrowserOnly fallback={<div className={styles.container}><p>Loading...</p></div>}>
        {() => (
          <Suspense fallback={<div className={styles.container}><p>Loading...</p></div>}>
            <DraftsContentLazy />
          </Suspense>
        )}
      </BrowserOnly>
    </Layout>
  );
}
