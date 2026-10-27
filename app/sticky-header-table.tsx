"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A table whose header stays at the top of the window until the last team's row reaches it, then
 * scrolls off with that row. Sticky positioning can't escape the sideways-scrolling box phones need,
 * so the visible header is a separate table above that box, kept at the same sideways scroll
 * position as the body.
 */
export function StickyHeaderTable({ header, children }: {
  /** A table with the same columns as `children`, shown as the header (hidden from screen readers). */
  header: ReactNode;
  /** The table itself, carrying its own (visually hidden) header for screen readers. */
  children: ReactNode;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Height from the last team's row to the table's bottom (its open panel included).
  const [lastRowSpan, setLastRowSpan] = useState(0);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const lastRow = [...body.querySelectorAll("tr[data-team-row]")].at(-1);
      setLastRowSpan(lastRow ? body.getBoundingClientRect().bottom - lastRow.getBoundingClientRect().top : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="border-y-2 border-[#17211d]">
      {/* Sticky stops when the header's margin box meets the box's bottom, so this bottom margin
          (cancelled by the body's negative top margin) makes it stop at the last team's row. */}
      <div
        ref={headerRef}
        aria-hidden="true"
        className="sticky top-0 z-20 overflow-hidden"
        style={{ marginBottom: lastRowSpan }}
      >
        {header}
      </div>
      <div
        ref={bodyRef}
        className="overflow-x-auto"
        style={{ marginTop: -lastRowSpan }}
        onScroll={(event) => {
          if (headerRef.current) headerRef.current.scrollLeft = event.currentTarget.scrollLeft;
        }}
      >
        {children}
      </div>
    </div>
  );
}
