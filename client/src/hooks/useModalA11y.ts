import { useEffect, useRef, useCallback } from "react";

/**
 * Section 508 / WCAG 2.1 hook for modal dialogs.
 *
 * - Moves focus into the dialog on mount
 * - Closes the dialog when the user presses Escape
 * - Returns a ref to attach to the modal-content div
 */
export function useModalA11y(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stableClose = useCallback(onClose, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Focus the dialog container so screen readers announce the dialog
    const el = dialogRef.current;
    if (el) {
      // Try to focus the first focusable element; fall back to the container itself
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      } else {
        el.focus();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        stableClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [stableClose]);

  return dialogRef;
}
