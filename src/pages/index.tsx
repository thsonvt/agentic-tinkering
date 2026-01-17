import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import SubscribeForm from '@site/src/components/SubscribeForm';
import styles from './index.module.css';

import HeroIllustration from '@site/static/img/undraw_docusaurus_mountain.svg';

function QuickLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link className={styles.card} to={href}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardDescription}>{description}</div>
      <div className={styles.cardCta}>Open</div>
    </Link>
  );
}

export default function Home(): React.ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}
    >
      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
              <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
              <div className={styles.heroCtas}>
                <Link className={styles.primaryButton} to='/content/'>
                  Get started
                </Link>
                <Link className={styles.secondaryButton} to='/posts'>
                  Browse posts
                </Link>
              </div>
            </div>
            <div className={styles.heroArt} aria-hidden='true'>
              <HeroIllustration className={styles.heroArtSvg} />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <h2 className={styles.sectionTitle}>Discover</h2>
            <p className={styles.sectionSubtitle}>
              Jump straight into the parts of the site you use most.
            </p>
            <div className={styles.cardGrid}>
              <QuickLinkCard
                title='Content'
                description='Docs and notes, organized like a handbook.'
                href='/content/'
              />
              <QuickLinkCard
                title='Posts'
                description='Published articles and experiments.'
                href='/posts'
              />
              <QuickLinkCard
                title='Drafts'
                description='Private workspace for writing and iterating.'
                href='/drafts'
              />
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt}>
          <div className={styles.sectionInner}>
            <div className={styles.subscribeHeader}>
              <h2 className={styles.sectionTitle}>Subscribe for updates</h2>
              <p className={styles.sectionSubtitle}>
                Get notified when new content is published.
              </p>
            </div>
            <div className={styles.subscribeCard}>
              <SubscribeForm variant='compact' />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
