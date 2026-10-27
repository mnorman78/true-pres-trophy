"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A table whose header stays at the top of the window until the last team's row reaches it, then
 * scrolls off with that row. Sticky positioning can't escape the sideways-scrolling box phones need,
 * so the visible header is a separate table above that box. It follows the body's sideways scroll
 * by shifting, not scrolling: Chrome on Android stops updating a sticky element during page scroll
 * when it is itself a scroll container. Header cells that should stay put on sideways scroll
 * shift back with `translate-x-(--scroll-x)`.
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
        className="sticky top-0 z-20 overflow-clip [--scroll-x:0px]"
        style={{ marginBottom: lastRowSpan }}
      >
        <div className="-translate-x-(--scroll-x)">{header}</div>
      </div>
      <div
        ref={bodyRef}
        className="overflow-x-auto"
        style={{ marginTop: -lastRowSpan }}
        onScroll={(event) => {
          headerRef.current?.style.setProperty("--scroll-x", `${event.currentTarget.scrollLeft}px`);
        }}
      >
        {children}
      </div>
    </div>
  );
}
