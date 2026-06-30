import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside a container when open.
 * Restores focus to the previously-focused element on close.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const returnTarget = document.activeElement as HTMLElement;
    const container = ref.current;

    // Focus first focusable element
    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length > 0) {
      // Defer to next tick so the element is rendered
      requestAnimationFrame(() => focusable[0]?.focus());
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      returnTarget?.focus();
    };
  }, [isOpen, ref]);
}
