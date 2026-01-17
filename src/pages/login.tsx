import React, { lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './login.module.css';

// Lazy load to avoid Convex hooks being evaluated during SSG
const LoginFormLazy = lazy(() => import('@site/src/components/LoginForm'));

export default function LoginPage(): React.ReactNode {
  return (
    <Layout title="Login" description="Sign in to your account">
      <BrowserOnly fallback={<div className={styles.container}><div className={styles.card}><p>Loading...</p></div></div>}>
        {() => (
          <Suspense fallback={<div className={styles.container}><div className={styles.card}><p>Loading...</p></div></div>}>
            <LoginFormLazy />
          </Suspense>
        )}
      </BrowserOnly>
    </Layout>
  );
}
