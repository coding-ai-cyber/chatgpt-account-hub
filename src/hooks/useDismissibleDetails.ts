import { useCallback, useEffect, useRef } from "react";

export function useDismissibleDetails() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const close = useCallback((restoreFocus = false) => {
    const details = detailsRef.current;
    if (!details?.open) return;
    details.open = false;
    if (restoreFocus) {
      details.querySelector<HTMLElement>("summary")?.focus();
    }
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        close(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current?.open) {
        event.preventDefault();
        close(true);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  const select = useCallback(
    (action: () => void) => {
      close(true);
      action();
    },
    [close],
  );

  return { detailsRef, close, select };
}
