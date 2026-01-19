import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import { useLocation, useHistory } from '@docusaurus/router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import ProtectedContent from '@site/src/components/ProtectedContent';
import PdfDropzone from '@site/src/components/PdfDropzone';
import UrlImport from '@site/src/components/UrlImport';
import styles from '@site/src/pages/drafts/styles.module.css';

interface Content {
  _id: Id<'content'>;
  title: string;
  content: string;
  description?: string;
  status: 'draft' | 'published';
  contentType: 'blog' | 'doc';
  createdAt: number;
  updatedAt: number;
}

type Tab = 'drafts' | 'captures';

export default function DraftsContent() {
  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = (searchParams.get('tab') as Tab) || 'drafts';

  const drafts = useQuery(api.content.list, { status: 'draft' });
  const published = useQuery(api.content.list, { status: 'published' });
  const captures = useQuery(api.webCaptures.list);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showPublished, setShowPublished] = useState(false);

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(location.search);
    if (tab === 'drafts') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const newSearch = params.toString();
    history.push({
      pathname: location.pathname,
      search: newSearch ? `?${newSearch}` : '',
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProtectedContent>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Drafts</h1>
            <p className={styles.subtitle}>
              Your private work-in-progress content. Only visible when logged in.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.importButton}
              onClick={() => {
                setShowUrlImport(false);
                setShowPdfImport(!showPdfImport);
              }}
              type="button">
              {showPdfImport ? 'Cancel' : '📄 Import PDF'}
            </button>
            <button
              className={styles.importButton}
              onClick={() => {
                setShowPdfImport(false);
                setShowUrlImport(!showUrlImport);
              }}
              type="button">
              {showUrlImport ? 'Cancel' : '🔗 Import URL'}
            </button>
            <Link to="/drafts/new" className={styles.createButton}>
              + New Draft
            </Link>
          </div>
        </div>

        {showPdfImport && (
          <div className={styles.pdfImportSection}>
            <PdfDropzone onClose={() => setShowPdfImport(false)} />
          </div>
        )}
        {showUrlImport && (
          <div className={styles.pdfImportSection}>
            <UrlImport onClose={() => setShowUrlImport(false)} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tabButton} ${activeTab === 'drafts' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('drafts')}
            type="button">
            Drafts ({drafts?.length || 0})
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'captures' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('captures')}
            type="button">
            Captures ({captures?.length || 0})
          </button>
        </div>

        {/* Drafts Tab Content */}
        {activeTab === 'drafts' && (
          <>
            {/* Drafts Section */}
            <h2 className={styles.sectionTitle}>Drafts</h2>
            {drafts === undefined ? (
              <p className={styles.loading}>Loading drafts...</p>
            ) : drafts.length === 0 ? (
              <p className={styles.empty}>No drafts yet. Create your first draft!</p>
            ) : (
              <div className={styles.draftList}>
                {drafts.map((draft) => (
                  <Link
                    key={draft._id}
                    to={`/drafts/edit?id=${draft._id}`}
                    className={styles.draftCard}>
                    <div className={styles.draftContent}>
                      <div className={styles.titleRow}>
                        <h3>{draft.title}</h3>
                        <span className={styles.typeBadge}>
                          {draft.contentType === 'blog' ? 'Blog' : 'Doc'}
                        </span>
                      </div>
                      {draft.description && <p>{draft.description}</p>}
                      <span className={styles.date}>Updated {formatDate(draft.updatedAt)}</span>
                    </div>
                    <span className={styles.editButton}>Edit</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Published Section */}
            <div className={styles.publishedSection}>
              <button
                className={styles.togglePublished}
                onClick={() => setShowPublished(!showPublished)}
                type="button">
                {showPublished ? '▼' : '▶'} Published ({published?.length || 0})
              </button>

              {showPublished && (
                <>
                  {published === undefined ? (
                    <p className={styles.loading}>Loading published content...</p>
                  ) : published.length === 0 ? (
                    <p className={styles.empty}>No published content yet.</p>
                  ) : (
                    <div className={styles.draftList}>
                      {published.map((item) => (
                        <Link
                          key={item._id}
                          to={`/drafts/edit?id=${item._id}`}
                          className={`${styles.draftCard} ${styles.publishedCard}`}>
                          <div className={styles.draftContent}>
                            <div className={styles.titleRow}>
                              <h3>{item.title}</h3>
                              <div className={styles.badges}>
                                <span className={styles.publishedBadge}>Published</span>
                                <span className={styles.typeBadge}>
                                  {item.contentType === 'blog' ? 'Blog' : 'Doc'}
                                </span>
                              </div>
                            </div>
                            {item.description && <p>{item.description}</p>}
                            <span className={styles.date}>Updated {formatDate(item.updatedAt)}</span>
                          </div>
                          <span className={styles.editButton}>Edit</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Captures Tab Content */}
        {activeTab === 'captures' && (
          <>
            <h2 className={styles.sectionTitle}>Web Captures</h2>

            {captures === undefined ? (
              <p className={styles.loading}>Loading captures...</p>
            ) : captures.length === 0 ? (
              <p className={styles.empty}>No captures yet. Use the browser extension to capture web pages!</p>
            ) : (
              <div className={styles.draftList}>
                {captures.map((capture) => (
                  <a
                    key={capture._id}
                    href={capture.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.draftCard}>
                    <div className={styles.draftContent}>
                      <div className={styles.titleRow}>
                        <h3>{capture.title}</h3>
                        {capture.siteName && (
                          <span className={styles.typeBadge}>{capture.siteName}</span>
                        )}
                      </div>
                      {capture.excerpt && <p>{capture.excerpt}</p>}
                      <span className={styles.date}>Captured {formatDate(capture.capturedAt)}</span>
                    </div>
                    <span className={styles.editButton}>View</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedContent>
  );
}
