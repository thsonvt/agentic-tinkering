import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from '@docusaurus/router';
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import styles from './styles.module.css';
import { htmlToMarkdown } from '@site/src/utils/htmlToMarkdown';

// Custom highlight command
const highlightCommand: ICommand = {
  name: 'highlight',
  keyCommand: 'highlight',
  buttonProps: { 'aria-label': 'Highlight text', title: 'Highlight (Ctrl+H)' },
  icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.6 5.8l2.6 2.6-9.7 9.7-2.6-2.6 9.7-9.7zm4-2.8l-1.4-1.4c-.8-.8-2-.8-2.8 0l-1.4 1.4 4.2 4.2 1.4-1.4c.8-.8.8-2 0-2.8zM2 18l-1 5 5-1 .9-.9-4-4-.9.9z" />
    </svg>
  ),
  execute: (state, api) => {
    const selectedText = state.selectedText;
    if (!selectedText) {
      // No selection, insert placeholder
      api.replaceSelection('<mark>highlighted text</mark>');
    } else {
      // Wrap selection in mark tags
      api.replaceSelection(`<mark>${selectedText}</mark>`);
    }
  },
};

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
type ContentType = 'blog' | 'doc';

interface FullPageEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialDescription?: string;
  initialContentType?: ContentType;
  isNew?: boolean;
  onSave: (data: {
    title: string;
    content: string;
    description?: string;
    contentType: ContentType;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onPublish?: () => void;
  onUnpublish?: () => Promise<void>;
  isPublished?: boolean;
}

export default function FullPageEditor({
  initialTitle = '',
  initialContent = '',
  initialDescription = '',
  initialContentType = 'blog',
  isNew = false,
  onSave,
  onDelete,
  onPublish,
  onUnpublish,
  isPublished = false,
}: FullPageEditorProps): React.ReactNode {
  const history = useHistory();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription);
  const [contentType, setContentType] = useState<ContentType>(initialContentType);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [showFocusExit, setShowFocusExit] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const savedFadeRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we have unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return (
      title !== initialTitle ||
      content !== initialContent ||
      description !== initialDescription ||
      contentType !== initialContentType
    );
  }, [title, content, description, contentType, initialTitle, initialContent, initialDescription, initialContentType]);

  // Auto-save function
  const performSave = useCallback(async () => {
    console.log('[FullPageEditor] performSave called with:', {
      titleLength: title.length,
      contentLength: content.length,
      content: content.substring(0, 100)
    });

    if (!title.trim() && !content.trim()) {
      // Don't save empty drafts
      console.log('[FullPageEditor] Skipping save - empty content');
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const saveData = {
        title: title.trim() || 'Untitled',
        content,
        description: description || undefined,
        contentType,
      };
      console.log('[FullPageEditor] Calling onSave with:', saveData);
      await onSave(saveData);
      console.log('[FullPageEditor] onSave completed');
      setSaveStatus('saved');
      hasChangesRef.current = false;

      // Fade out "Saved" after 2 seconds
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      savedFadeRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save');
    }
  }, [title, content, description, contentType, onSave]);

  // Debounced auto-save on changes
  useEffect(() => {
    if (!hasUnsavedChanges()) {
      return;
    }

    hasChangesRef.current = true;
    setSaveStatus('unsaved');

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSave();
    }, 2000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [title, content, description, contentType, hasUnsavedChanges, performSave]);

  // Keyboard shortcuts (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        performSave();
      }

      // Escape exits focus mode
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performSave, focusMode]);

  // beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-focus title on mount
  useEffect(() => {
    if (isNew && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isNew]);

  const handleBack = async () => {
    // Save any pending changes before navigating
    if (hasChangesRef.current) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      await performSave();
    }
    history.push('/drafts');
  };

  const handleManualSave = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    await performSave();
  };

  const handleEditorPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html = e.clipboardData.getData('text/html');
      if (!html) return;

      const markdown = htmlToMarkdown(html);
      if (!markdown.trim()) return;

      e.preventDefault();

      const target = e.currentTarget;
      const selectionStart = typeof target.selectionStart === 'number' ? target.selectionStart : content.length;
      const selectionEnd = typeof target.selectionEnd === 'number' ? target.selectionEnd : content.length;

      const nextContent = `${content.slice(0, selectionStart)}${markdown}${content.slice(selectionEnd)}`;
      setContent(nextContent);

      const nextCursor = selectionStart + markdown.length;
      requestAnimationFrame(() => {
        try {
          target.setSelectionRange(nextCursor, nextCursor);
        } catch {
          // Ignore selection errors (e.g. element unmounted)
        }
      });
    },
    [content]
  );

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await onDelete();
      history.push('/drafts');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleUnpublish = async () => {
    if (!onUnpublish) return;
    if (!confirm('This will remove the content from public view. Continue?')) return;

    try {
      await onUnpublish();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to unpublish');
    }
  };

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'unsaved':
        return <span className={styles.statusUnsaved}>Unsaved changes</span>;
      case 'saving':
        return <span className={styles.statusSaving}>Saving...</span>;
      case 'saved':
        return <span className={styles.statusSaved}>Saved</span>;
      case 'error':
        return <span className={styles.statusError}>Failed to save</span>;
      default:
        return null;
    }
  };

  // Focus mode: show exit button on mouse move
  useEffect(() => {
    if (!focusMode) return;

    let hideTimeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowFocusExit(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => setShowFocusExit(false), 2000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimeout);
    };
  }, [focusMode]);

  return (
    <div className={`${styles.container} ${focusMode ? styles.focusMode : ''}`} data-color-mode="light">
      {/* Focus mode exit button */}
      {focusMode && (
        <button
          className={`${styles.focusExitButton} ${showFocusExit ? styles.visible : ''}`}
          onClick={() => setFocusMode(false)}
          title="Exit focus mode (Esc)"
        >
          Exit
        </button>
      )}

      {/* Focus mode save status overlay */}
      {focusMode && saveStatus !== 'idle' && (
        <div className={styles.focusSaveStatus}>{renderSaveStatus()}</div>
      )}

      {/* Header - hidden in focus mode */}
      {!focusMode && (
        <header className={styles.header}>
          <button className={styles.backButton} onClick={handleBack} type="button">
            <span className={styles.backArrow}>←</span>
            Back to drafts
          </button>

          <div className={styles.headerRight}>
            {renderSaveStatus()}

            <button
              className={styles.saveButton}
              onClick={handleManualSave}
              disabled={saveStatus === 'saving' || saveStatus === 'idle' || saveStatus === 'saved'}
              type="button"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>

            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className={styles.typeSelect}
              disabled={!isNew}
            >
              <option value="blog">Blog Post</option>
              <option value="doc">Document</option>
            </select>

            <button
              className={styles.focusButton}
              onClick={() => setFocusMode(true)}
              title="Focus mode"
              type="button"
            >
              Focus
            </button>

            {isPublished ? (
              <button
                className={styles.unpublishButton}
                onClick={handleUnpublish}
                type="button"
              >
                Unpublish
              </button>
            ) : onPublish && (
              <button
                className={styles.publishButton}
                onClick={onPublish}
                type="button"
              >
                Publish
              </button>
            )}

            {onDelete && (
              <button
                className={styles.deleteButton}
                onClick={handleDelete}
                title="Delete"
                type="button"
              >
                Delete
              </button>
            )}
          </div>
        </header>
      )}

      {/* Editor area */}
      <div className={styles.editorArea}>
        {errorMessage && (
          <div className={styles.errorBanner}>
            {errorMessage}
            <button onClick={() => setErrorMessage('')} type="button">×</button>
          </div>
        )}

        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className={styles.titleInput}
        />

        {!focusMode && (
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className={styles.descriptionInput}
          />
        )}

        <div className={styles.markdownContainer}>
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            preview="live"
            visibleDragbar={false}
            height={focusMode ? window.innerHeight - 80 : window.innerHeight - 200}
            textareaProps={{
              placeholder: 'Start writing...',
              onPaste: handleEditorPaste,
            }}
            commands={[
              commands.bold,
              commands.italic,
              commands.strikethrough,
              commands.hr,
              commands.divider,
              commands.link,
              commands.quote,
              commands.code,
              commands.codeBlock,
              commands.divider,
              highlightCommand,
              commands.divider,
              commands.unorderedListCommand,
              commands.orderedListCommand,
              commands.checkedListCommand,
            ]}
            extraCommands={[]}
          />
        </div>
      </div>
    </div>
  );
}
