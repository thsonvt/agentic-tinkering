import React, {useState, useCallback} from 'react';
import {useHistory} from '@docusaurus/router';
import {useMutation} from 'convex/react';
import {api} from '../../../convex/_generated/api';
import type {Id} from '../../../convex/_generated/dataModel';
import ProtectedContent from '@site/src/components/ProtectedContent';
import FullPageEditor from '@site/src/components/FullPageEditor';

function NewDraftEditor() {
  const history = useHistory();
  const createContent = useMutation(api.content.create);
  const updateContent = useMutation(api.content.update);
  const deleteContent = useMutation(api.content.remove);

  // Track the created draft ID so subsequent saves update instead of create
  const [draftId, setDraftId] = useState<Id<'content'> | null>(null);
  const [isCreated, setIsCreated] = useState(false);

  const handleSave = useCallback(
    async (data: {
      title: string;
      content: string;
      description?: string;
      contentType: 'blog' | 'doc';
    }) => {
      if (!isCreated) {
        // First save: create the draft
        const id = await createContent({
          title: data.title,
          content: data.content,
          description: data.description,
          contentType: data.contentType,
        });
        setDraftId(id);
        setIsCreated(true);

        // Update URL silently to include the ID (for refresh safety)
        window.history.replaceState(null, '', `/drafts/edit?id=${id}`);
      } else if (draftId) {
        // Subsequent saves: update the draft
        await updateContent({
          id: draftId,
          title: data.title,
          content: data.content,
          description: data.description,
        });
      }
    },
    [createContent, updateContent, draftId, isCreated]
  );

  const handleDelete = useCallback(async () => {
    if (draftId) {
      await deleteContent({id: draftId});
    }
    // If not created yet, just navigate away
    history.push('/drafts');
  }, [deleteContent, draftId, history]);

  return (
    <FullPageEditor
      isNew
      onSave={handleSave}
      onDelete={isCreated ? handleDelete : undefined}
    />
  );
}

export default function NewDraftPage(): React.ReactNode {
  return (
    <ProtectedContent>
      <NewDraftEditor />
    </ProtectedContent>
  );
}
