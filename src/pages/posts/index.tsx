import React, { lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useLocation} from '@docusaurus/router';
import styles from './styles.module.css';

// Lazy load to avoid Convex hooks being evaluated during SSG
const PostContentLazy = lazy(() => import('@site/src/components/PostContent'));

export default function PostsPage(): React.ReactNode {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const slug = searchParams.get('slug');

  return (
    <Layout
      title={slug ? 'Blog Post' : 'Blog Posts'}
      description={slug ? 'Read this blog post' : 'All published blog posts'}>
      <BrowserOnly fallback={<div className={styles.container}><p>Loading...</p></div>}>
        {() => (
          <Suspense fallback={<div className={styles.container}><p>Loading...</p></div>}>
            <PostContentLazy />
          </Suspense>
        )}
      </BrowserOnly>
    </Layout>
  );
}
