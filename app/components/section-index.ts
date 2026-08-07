import { useEffect, useState } from 'react';

/**
 * Tracks which document section is currently under the reading line and returns
 * its id. Drives the rail index's Enamel Mark so the mark reports real position
 * instead of a hardcoded "current".
 *
 * The reading line sits ~35% down the viewport: a section becomes current once
 * its top crosses that line and stays current until the next one does. That reads
 * more naturally than intersection ratio, which flips early on tall sections.
 */
export function useCurrentSection(ids: string[], fallback: string): string {
  const [current, setCurrent] = useState(fallback);
  const key = ids.join(',');

  useEffect(() => {
    const sectionIds = key.split(',').filter(Boolean);
    if (sectionIds.length === 0) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let active = sectionIds[0] ?? fallback;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) active = id;
      }

      // A short final section may never cross the reading line; at the bottom of
      // the document it is unambiguously the one being read.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) active = sectionIds[sectionIds.length - 1] ?? active;

      setCurrent(prev => (prev === active ? prev : active));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [key, fallback]);

  return current;
}
