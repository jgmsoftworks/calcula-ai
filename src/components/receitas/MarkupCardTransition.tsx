import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface MarkupCardTransitionProps {
  markupId: string | undefined;
  children: ReactNode;
}

export function MarkupCardTransition({ markupId, children }: MarkupCardTransitionProps) {
  const [displayedId, setDisplayedId] = useState(markupId);
  const previousContent = useRef(children);
  const exiting = displayedId !== markupId;

  // Preserve the outgoing card while its exit animation finishes. Changes to
  // prices/configuration under the same markup remain visible immediately.
  useLayoutEffect(() => {
    if (!exiting) previousContent.current = children;
  }, [children, exiting]);

  useEffect(() => {
    if (!exiting) return;
    if (!previousContent.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedId(markupId);
      return;
    }
    // A new selection cancels this timer, so quick changes always show the
    // latest markup without queuing animations or delaying form updates.
    const timer = window.setTimeout(() => setDisplayedId(markupId), 120);
    return () => window.clearTimeout(timer);
  }, [markupId, exiting]);

  const content = exiting ? previousContent.current : children;
  if (!content) return null;

  return (
    <div
      key={displayedId || 'unselected'}
      className={exiting ? 'markup-card-exit' : 'markup-card-enter'}
      aria-hidden={exiting || undefined}
    >
      {content}
    </div>
  );
}
