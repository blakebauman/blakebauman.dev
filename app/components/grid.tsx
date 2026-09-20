import { useCallback, useEffect, useState } from 'react';

/**
 * The grid overlay draws the columns the page is actually set on, as red
 * hairlines over the content. It is the site's signature and it is functional
 * rather than decorative: the claim this record makes is that the
 * implementation is part of the work, so a reader gets to check the structure
 * instead of taking it on faith.
 *
 * Which means it has to be the same grid. The overlay sits in `.bb-cols`, the
 * one box the masthead, the composed rows and both two-up sections share, so
 * the columns it draws and the columns they compose on cannot drift apart.
 * Twelve above 900px; below that every row on the page collapses to a single
 * column and the overlay draws that column's two edges instead.
 *
 * The state lives on `<html data-grid>` so CSS alone draws it, persists in
 * localStorage, and is restored by an inline script in root.tsx before first
 * paint.
 */

const KEY = 'bb-grid';
const COLUMNS = 12;

export function GridOverlay() {
  return (
    <div className="bb-grid-overlay" aria-hidden="true">
      <div className="bb-wrap">
        <div className="bb-cols">
          {Array.from({ length: COLUMNS }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static column ruler
            <i key={i} style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GridToggle() {
  // Starts false on the server so markup matches; the inline script has already
  // set the attribute, and the effect below syncs this component to it.
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(document.documentElement.dataset.grid === 'on');
  }, []);

  const toggle = useCallback(() => {
    setOn(prev => {
      const next = !prev;
      const root = document.documentElement;
      if (next) {
        root.dataset.grid = 'on';
      } else {
        delete root.dataset.grid;
      }
      try {
        localStorage.setItem(KEY, next ? 'on' : 'off');
      } catch {
        // Private windows and blocked site data throw here. The toggle still
        // works for this page view; only the memory of it is lost.
      }
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      className="bb-grid-toggle print:hidden"
      aria-pressed={on}
      onClick={toggle}
      title="Show the column grid this page is set on"
    >
      <span className="mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      Grid
    </button>
  );
}

/**
 * Runs before first paint so a reader who left the grid on does not watch it
 * appear after hydration. Kept to one statement and inlined in <head>.
 */
export const GRID_INIT_SCRIPT = `try{if(localStorage.getItem('${KEY}')==='on')document.documentElement.dataset.grid='on'}catch(e){}`;
