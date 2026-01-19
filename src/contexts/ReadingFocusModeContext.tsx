import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';

type ReadingFocusModeContextValue = {
  enabled: boolean;
  toggle: () => void;
};

const ReadingFocusModeContext = createContext<ReadingFocusModeContextValue | undefined>(undefined);

const storageKey = 'readingFocusMode.enabled';
const currentClassName = 'readingFocusCurrent';
const enabledAttr = 'data-reading-focus';
const currentAttr = 'data-reading-focus-current';

function isEditableElement(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

function setEnabledAttr(enabled: boolean) {
  if (enabled) {
    document.documentElement.setAttribute(enabledAttr, 'on');
  } else {
    document.documentElement.removeAttribute(enabledAttr);
  }
}

function setHasCurrentAttr(hasCurrent: boolean) {
  if (hasCurrent) {
    document.documentElement.setAttribute(currentAttr, 'on');
  } else {
    document.documentElement.removeAttribute(currentAttr);
  }
}

export function ReadingFocusModeProvider({children}: {children: React.ReactNode}): React.ReactNode {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === '1';
  });
  const currentElRef = useRef<HTMLElement | null>(null);

  const clearCurrent = useCallback(() => {
    if (currentElRef.current) {
      currentElRef.current.classList.remove(currentClassName);
      currentElRef.current = null;
    }
    setHasCurrentAttr(false);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    setEnabledAttr(enabled);
    localStorage.setItem(storageKey, enabled ? '1' : '0');

    if (!enabled) {
      clearCurrent();
    }
  }, [enabled, clearCurrent]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f' || !e.shiftKey) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isEditableElement(e.target)) return;

      e.preventDefault();
      toggle();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (!enabled) return;

    const updateFromSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        clearCurrent();
        return;
      }

      const focusNode = selection.focusNode;
      const focusEl =
        focusNode instanceof HTMLElement
          ? focusNode
          : focusNode instanceof Node
            ? focusNode.parentElement
            : null;
      if (!focusEl) {
        clearCurrent();
        return;
      }

      const scopeEl = focusEl.closest<HTMLElement>('[data-focus-scope="content"]');
      if (!scopeEl) {
        clearCurrent();
        return;
      }

      if (focusEl.closest('pre')) {
        clearCurrent();
        return;
      }

      const blockEl = focusEl.closest<HTMLElement>('[data-focus-block="true"]');
      if (!blockEl || !scopeEl.contains(blockEl)) {
        clearCurrent();
        return;
      }

      if (currentElRef.current === blockEl) {
        setHasCurrentAttr(true);
        return;
      }

      if (currentElRef.current) {
        currentElRef.current.classList.remove(currentClassName);
      }
      blockEl.classList.add(currentClassName);
      currentElRef.current = blockEl;
      setHasCurrentAttr(true);
    };

    document.addEventListener('selectionchange', updateFromSelection);
    return () => document.removeEventListener('selectionchange', updateFromSelection);
  }, [enabled, clearCurrent]);

  return (
    <ReadingFocusModeContext.Provider
      value={{
        enabled,
        toggle,
      }}
    >
      {children}
    </ReadingFocusModeContext.Provider>
  );
}

export function useReadingFocusMode(): ReadingFocusModeContextValue {
  const ctx = useContext(ReadingFocusModeContext);
  if (!ctx) throw new Error('useReadingFocusMode must be used within ReadingFocusModeProvider');
  return ctx;
}
