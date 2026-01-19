import React from 'react';
import OriginalMDXContent from '@theme-original/MDXContent';
import ReadingFocusToggle from '@site/src/components/ReadingFocusToggle';
import styles from './styles.module.css';

export default function MDXContent({children}: {children: React.ReactNode}): React.ReactNode {
  return (
    <div data-focus-scope="content" className={styles.container}>
      <div className={styles.toggleRow}>
        <ReadingFocusToggle />
      </div>
      <OriginalMDXContent>{children}</OriginalMDXContent>
    </div>
  );
}
