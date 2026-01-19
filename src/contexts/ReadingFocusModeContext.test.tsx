import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';

import {ReadingFocusModeProvider} from './ReadingFocusModeContext';

function TestContent() {
  return (
    <div>
      <div data-focus-scope="content">
        <p data-focus-block="true">First</p>
        <p data-focus-block="true">Second</p>
        <pre>
          <code>Code</code>
        </pre>
      </div>
      <input aria-label="outside-input" />
      <div aria-label="outside-prose">
        <p>Outside</p>
      </div>
    </div>
  );
}

function dispatchSelectionChange() {
  document.dispatchEvent(new Event('selectionchange'));
}

function setSelectionInText(text: string, startOffset = 0, endOffset = 1) {
  const el = screen.getByText(text);
  const node = el.firstChild;
  if (!node) throw new Error(`Missing text node for "${text}"`);

  const range = document.createRange();
  range.setStart(node, startOffset);
  range.setEnd(node, endOffset);

  const selection = window.getSelection();
  if (!selection) throw new Error('Missing selection');
  selection.removeAllRanges();
  selection.addRange(range);
}

function clearSelection() {
  const selection = window.getSelection();
  if (!selection) throw new Error('Missing selection');
  selection.removeAllRanges();
}

describe('ReadingFocusModeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-reading-focus');
    document.documentElement.removeAttribute('data-reading-focus-current');
    clearSelection();
  });

  it('toggles enabled via Shift+F and persists globally', async () => {
    const user = userEvent.setup();
    render(
      <ReadingFocusModeProvider>
        <TestContent />
      </ReadingFocusModeProvider>
    );

    expect(document.documentElement.getAttribute('data-reading-focus')).toBe(null);

    await user.keyboard('{Shift>}f{/Shift}');
    expect(document.documentElement.getAttribute('data-reading-focus')).toBe('on');
    expect(localStorage.getItem('readingFocusMode.enabled')).toBe('1');

    await user.keyboard('{Shift>}f{/Shift}');
    expect(document.documentElement.getAttribute('data-reading-focus')).toBe(null);
    expect(localStorage.getItem('readingFocusMode.enabled')).toBe('0');
  });

  it('does not toggle via Shift+F while typing in inputs', async () => {
    const user = userEvent.setup();
    render(
      <ReadingFocusModeProvider>
        <TestContent />
      </ReadingFocusModeProvider>
    );

    const input = screen.getByLabelText('outside-input');
    input.focus();

    await user.keyboard('{Shift>}f{/Shift}');
    expect(document.documentElement.getAttribute('data-reading-focus')).toBe(null);
  });

  it('highlights the prose block containing the selection focus/end', async () => {
    const user = userEvent.setup();
    render(
      <ReadingFocusModeProvider>
        <TestContent />
      </ReadingFocusModeProvider>
    );

    await user.keyboard('{Shift>}f{/Shift}');

    const first = screen.getByText('First');
    const second = screen.getByText('Second');

    setSelectionInText('Second', 0, 1);
    dispatchSelectionChange();

    expect(second).toHaveClass('readingFocusCurrent');
    expect(first).not.toHaveClass('readingFocusCurrent');
    expect(document.documentElement.getAttribute('data-reading-focus-current')).toBe('on');

    clearSelection();
    dispatchSelectionChange();
    expect(second).not.toHaveClass('readingFocusCurrent');
    expect(document.documentElement.getAttribute('data-reading-focus-current')).toBe(null);
  });

  it('when selection spans blocks, uses the active/focus end block', async () => {
    const user = userEvent.setup();
    render(
      <ReadingFocusModeProvider>
        <TestContent />
      </ReadingFocusModeProvider>
    );

    await user.keyboard('{Shift>}f{/Shift}');

    const first = screen.getByText('First');
    const second = screen.getByText('Second');
    const firstText = first.firstChild;
    const secondText = second.firstChild;
    if (!firstText || !secondText) throw new Error('Missing text nodes');

    const range = document.createRange();
    range.setStart(firstText, 0);
    range.setEnd(secondText, 1);
    const selection = window.getSelection();
    if (!selection) throw new Error('Missing selection');
    selection.removeAllRanges();
    selection.addRange(range);

    dispatchSelectionChange();
    expect(second).toHaveClass('readingFocusCurrent');
    expect(first).not.toHaveClass('readingFocusCurrent');
  });

  it('ignores selections inside code blocks', async () => {
    const user = userEvent.setup();
    render(
      <ReadingFocusModeProvider>
        <TestContent />
      </ReadingFocusModeProvider>
    );

    await user.keyboard('{Shift>}f{/Shift}');

    const code = screen.getByText('Code');
    const codeText = code.firstChild;
    if (!codeText) throw new Error('Missing code text node');

    const range = document.createRange();
    range.setStart(codeText, 0);
    range.setEnd(codeText, 1);
    const selection = window.getSelection();
    if (!selection) throw new Error('Missing selection');
    selection.removeAllRanges();
    selection.addRange(range);

    dispatchSelectionChange();

    expect(screen.getByText('First')).not.toHaveClass('readingFocusCurrent');
    expect(screen.getByText('Second')).not.toHaveClass('readingFocusCurrent');
    expect(document.documentElement.getAttribute('data-reading-focus-current')).toBe(null);
  });
});
