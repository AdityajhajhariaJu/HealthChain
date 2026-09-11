// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import FocusTrap from '../ui/FocusTrap';
import { announceToScreenReader } from '../../services/a11y';

describe('Phase 8: Mounted Accessibility Gates & Keyboard Rigor', () => {
  let containerDiv: HTMLDivElement;

  beforeEach(() => {
    containerDiv = document.createElement('div');
    document.body.appendChild(containerDiv);
  });

  afterEach(() => {
    cleanup();
    if (containerDiv && containerDiv.parentNode) {
      containerDiv.parentNode.removeChild(containerDiv);
    }
  });

  it('Step 125: FocusTrap wraps focus in a cyclical loop within mounted modal container', async () => {
    render(
      <FocusTrap isActive={true}>
        <button id="first-btn">First Button</button>
        <input id="middle-input" defaultValue="Input field" />
        <button id="last-btn">Last Button</button>
      </FocusTrap>,
      { container: containerDiv }
    );

    // Allow auto-focus timer to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const firstBtn = screen.getByRole('button', { name: 'First Button' });
    const lastBtn = screen.getByRole('button', { name: 'Last Button' });

    expect(document.activeElement).toBe(firstBtn);

    // Tab from last element wraps to first element
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstBtn);

    // Shift-Tab from first element wraps to last element
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);
  });

  it('Step 126: FocusTrap restores focus to trigger element upon unmount', async () => {
    const triggerBtn = document.createElement('button');
    triggerBtn.id = 'external-trigger-btn';
    triggerBtn.textContent = 'Open Modal Trigger';
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();

    expect(document.activeElement).toBe(triggerBtn);

    const { unmount } = render(
      <FocusTrap isActive={true} restoreFocus={true}>
        <button id="modal-inner-btn">Modal Button</button>
      </FocusTrap>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const modalInnerBtn = screen.getByRole('button', { name: 'Modal Button' });
    expect(document.activeElement).toBe(modalInnerBtn);

    unmount();

    expect(document.activeElement).toBe(triggerBtn);
    document.body.removeChild(triggerBtn);
  });

  it('Step 127 & 128: FocusTrap intercepts Escape key and invokes onEscape callback', async () => {
    const handleEscape = vi.fn();

    render(
      <FocusTrap isActive={true} onEscape={handleEscape}>
        <div role="dialog" aria-modal="true">
          <button id="dialog-close">Close</button>
        </div>
      </FocusTrap>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleEscape).toHaveBeenCalledTimes(1);
  });

  it('Step 129: Live region announces polite messages for screen readers', async () => {
    let liveRegion = document.getElementById('a11y-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-live-region';
      document.body.appendChild(liveRegion);
    }

    act(() => {
      announceToScreenReader('Case saved successfully', 'polite');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 70));
    });

    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.textContent).toBe('Case saved successfully');
  });

  it('Step 130: Live region delivers assertive announcements for critical sync failures', async () => {
    let liveRegion = document.getElementById('a11y-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-live-region';
      document.body.appendChild(liveRegion);
    }

    act(() => {
      announceToScreenReader('Sync failed. Edits preserved offline.', 'assertive');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 70));
    });

    expect(liveRegion.getAttribute('aria-live')).toBe('assertive');
    expect(liveRegion.textContent).toBe('Sync failed. Edits preserved offline.');
  });
});
