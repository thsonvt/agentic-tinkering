import React from 'react';
import {AuthProvider} from '@site/src/contexts/AuthContext';
import {ReadingFocusModeProvider} from '@site/src/contexts/ReadingFocusModeContext';

export default function Root({children}: {children: React.ReactNode}) {
  return (
    <AuthProvider>
      <ReadingFocusModeProvider>{children}</ReadingFocusModeProvider>
    </AuthProvider>
  );
}
