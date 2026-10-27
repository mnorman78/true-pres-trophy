"use client";

import { useState, type ReactNode } from "react";

/**
 * One standings row whose Club cell is a button that opens a full-width row below it. Everything
 * shown is rendered on the server and passed in; this component only holds the open/closed state.
 */
export function TeamRow({ team, rank, club, stats, details, columnCount }: {
  team: string;
  rank: ReactNode;
  club: ReactNode;
  stats: ReactNode;
  details: ReactNode;
  columnCount: number;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = `uncounted-${team}`;

  return (
    <>
      <tr data-team-row className="border-b border-[#c9beaa] bg-[#f2ead9] transition-colors last:border-0 hover:bg-[#e8ddc8]">
        <td className="sticky left-0 z-10 bg-inherit px-3 py-3 text-xs text-[#777064]">{rank}</td>
        <th scope="row" className="sticky left-14 z-10 max-sm:left-12 bg-inherit max-sm:shadow-[inset_-1px_0_0_#c9beaa] p-0 text-left font-semibold">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? detailsId : undefined}
            onClick={() => setOpen(!open)}
            className="flex w-full cursor-pointer items-center px-3 py-3 text-left"
          >
            {club}
            <span
              aria-hidden="true"
              className={`ml-auto pl-1 text-[10px] text-[#9e3028] transition-transform ${open ? "rotate-90" : ""}`}
            >
              ▸
            </span>
          </button>
        </th>
        {stats}
      </tr>
      {open && (
        <tr id={detailsId} className="border-b border-[#c9beaa] bg-[#e8ddc8] last:border-0">
          <td colSpan={columnCount} className="p-0">
            {/* On phones the table scrolls sideways; keep the panel pinned to the visible width. */}
            <div className="sticky left-0 px-3 py-4 max-sm:w-[calc(100vw-2rem)] sm:pl-[4.25rem]">
              {details}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
