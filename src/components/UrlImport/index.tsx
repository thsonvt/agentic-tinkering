import React, {useMemo, useState} from 'react';
import {useAction} from 'convex/react';
import {useHistory} from '@docusaurus/router';
import {api} from '../../../convex/_generated/api';
import styles from './styles.module.css';

type Props = {
  onClose?: () => void;
};

export default function UrlImport({onClose}: Props): React.ReactNode {
  const history = useHistory();
  const importFromUrl = useAction(api.references.importFromUrl);

  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedUrl = useMemo(() => url.trim(), [url]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!normalizedUrl) {
      setError('Please enter a URL.');
      return;
    }

    setIsImporting(true);
    try {
      const contentId = await importFromUrl({url: normalizedUrl});
      history.push(`/drafts/edit?id=${contentId}`);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import URL');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>Import from URL</h3>
          <p className={styles.subtitle}>
            Paste a link and we’ll extract the main content into a private reference doc.
          </p>
        </div>
        {onClose && (
          <button type='button' className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <form className={styles.form} onSubmit={handleImport}>
        <input
          className={styles.input}
          type='url'
          placeholder='https://example.com/article'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isImporting}
          required
        />
        <button className={styles.button} type='submit' disabled={isImporting}>
          {isImporting ? 'Importing…' : 'Import'}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.hint}>
        Tip: some sites block crawlers; if import fails, try the site’s “reader mode” URL or another source.
      </p>
    </div>
  );
}

