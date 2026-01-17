import React, {useState, FormEvent} from 'react';
import styles from './styles.module.css';

interface PublishModalProps {
  title: string;
  slug: string;
  contentType: 'blog' | 'doc';
  tags?: string[];
  docCategory?: string;
  onPublish: (data: {
    slug: string;
    tags?: string[];
    docCategory?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function PublishModal({
  title,
  slug: initialSlug,
  contentType,
  tags: initialTags = [],
  docCategory: initialDocCategory = '',
  onPublish,
  onCancel,
}: PublishModalProps): React.ReactNode {
  const [slug, setSlug] = useState(initialSlug);
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '));
  const [docCategory, setDocCategory] = useState(initialDocCategory);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }

    setIsPublishing(true);
    setError('');

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onPublish({
        slug: slug.trim(),
        tags: contentType === 'blog' ? tags : undefined,
        docCategory: contentType === 'doc' ? docCategory.trim() || undefined : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
      setIsPublishing(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>Publish {contentType === 'blog' ? 'Blog Post' : 'Document'}</h2>
        <p className={styles.subtitle}>
          Publishing "<strong>{title}</strong>" will make it publicly visible.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="slug" className={styles.label}>
            URL Slug
          </label>
          <div className={styles.slugPreview}>
            /{contentType === 'blog' ? 'posts' : 'articles'}/
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className={styles.slugInput}
              disabled={isPublishing}
              required
            />
          </div>

          {contentType === 'blog' && (
            <>
              <label htmlFor="tags" className={styles.label}>
                Tags (comma separated)
              </label>
              <input
                id="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., react, tutorial, web development"
                className={styles.input}
                disabled={isPublishing}
              />
            </>
          )}

          {contentType === 'doc' && (
            <>
              <label htmlFor="category" className={styles.label}>
                Category (optional)
              </label>
              <input
                id="category"
                type="text"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                placeholder="e.g., Getting Started, Tutorials"
                className={styles.input}
                disabled={isPublishing}
              />
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isPublishing}>
              Cancel
            </button>
            <button type="submit" className={styles.publishButton} disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
