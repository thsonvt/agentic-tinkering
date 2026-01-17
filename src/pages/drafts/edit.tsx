import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useHistory, useLocation } from '@docusaurus/router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import ProtectedContent from '@site/src/components/ProtectedContent';
import FullPageEditor from '@site/src/components/FullPageEditor';
import PublishModal from '@site/src/components/PublishModal';
import styles from './editor.module.css';

function EditDraftEditor() {
  const history = useHistory();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get('id');

  const updateContent = useMutation(api.content.update);
  const deleteContent = useMutation(api.content.remove);
  const publishContent = useMutation(api.content.publish);
  const unpublishContent = useMutation(api.content.unpublish);

  const existingContent = useQuery(
    api.content.get,
    editId ? { id: editId as Id<'content'> } : 'skip'
  );

  const [showPublishModal, setShowPublishModal] = useState(false);

  const handleSave = useCallback(
    async (data: {
      title: string;
      content: string;
      description?: string;
      contentType: 'blog' | 'doc';
    }) => {
      if (!editId) return;
      console.log('[Save] Saving content:', { id: editId, title: data.title, contentLength: data.content.length, content: data.content.substring(0, 100) });
      await updateContent({
        id: editId as Id<'content'>,
        title: data.title,
        content: data.content,
        description: data.description,
      });
      console.log('[Save] Save completed successfully');
    },
    [updateContent, editId]
  );

  const handleDelete = useCallback(async () => {
    if (!editId) return;
    await deleteContent({ id: editId as Id<'content'> });
    history.push('/drafts');
  }, [deleteContent, editId, history]);

  const handlePublish = useCallback(
    async (data: { slug: string; tags?: string[]; docCategory?: string }) => {
      if (!editId) return;
      await publishContent({
        id: editId as Id<'content'>,
        slug: data.slug,
        tags: data.tags,
        docCategory: data.docCategory,
      });
      setShowPublishModal(false);
      history.push('/drafts');
    },
    [publishContent, editId, history]
  );

  const handleUnpublish = useCallback(async () => {
    if (!editId) return;
    await unpublishContent({ id: editId as Id<'content'> });
  }, [unpublishContent, editId]);

  // Error state: no ID provided
  if (!editId) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Error</h1>
          <p>No content ID provided.</p>
          <button onClick={() => history.push('/drafts')} className={styles.cancelButton}>
            Back to Drafts
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (existingContent === undefined) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (existingContent === null) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Not Found</h1>
          <p>This content doesn't exist or you don't have access to it.</p>
          <button onClick={() => history.push('/drafts')} className={styles.cancelButton}>
            Back to Drafts
          </button>
        </div>
      </div>
    );
  }

  const isPublished = existingContent.status === 'published';

  console.log('[Load] Loaded content from DB:', {
    id: editId,
    title: existingContent.title,
    contentLength: existingContent.content?.length || 0,
    content: existingContent.content?.substring(0, 100) || '(empty)'
  });

  return (
    <>
      <FullPageEditor
        initialTitle={existingContent.title}
        initialContent={existingContent.content}
        initialDescription={existingContent.description || ''}
        initialContentType={existingContent.contentType}
        isPublished={isPublished}
        onSave={handleSave}
        onDelete={handleDelete}
        onPublish={() => setShowPublishModal(true)}
        onUnpublish={handleUnpublish}
      />

      {showPublishModal && createPortal(
        <PublishModal
          title={existingContent.title}
          slug={existingContent.slug}
          contentType={existingContent.contentType}
          tags={existingContent.tags}
          docCategory={existingContent.docCategory}
          onPublish={handlePublish}
          onCancel={() => setShowPublishModal(false)}
        />,
        document.body
      )}
    </>
  );
}

export default function EditDraftPage(): React.ReactNode {
  return (
    <ProtectedContent>
      <EditDraftEditor />
    </ProtectedContent>
  );
}
