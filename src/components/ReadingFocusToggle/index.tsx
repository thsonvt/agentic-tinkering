import React from 'react';
import clsx from 'clsx';
import {useReadingFocusMode} from '@site/src/contexts/ReadingFocusModeContext';
import styles from './styles.module.css';

export default function ReadingFocusToggle({className}: {className?: string}): React.ReactNode {
  const {enabled, toggle} = useReadingFocusMode();

  return (
    <button
      type="button"
      className={clsx(styles.button, enabled && styles.buttonActive, className)}
      onClick={toggle}
      aria-label="Toggle focus mode"
      aria-pressed={enabled}
      title="Toggle focus mode (Shift+F)"
    >
      Focus
    </button>
  );
}

