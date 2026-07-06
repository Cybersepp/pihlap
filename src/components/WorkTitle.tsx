import { useScramble } from '../lib/scramble';

// The focused work's title, overlapping the tile (greta-style). `active` decodes
// it in; flipping `active` false (e.g. clicking into the video) scrambles it back
// out into noise and fades it, instead of just vanishing.
export function WorkTitle({
  title,
  sub,
  active = true,
}: {
  title: string;
  sub?: string;
  active?: boolean;
}) {
  // When the title leads with the artist (e.g. "Mihhail — Dream Blunt" + client
  // "Mihhail"), strip that prefix so the artist shows once — in the subtitle — and
  // the main line is just the piece ("Dream Blunt"). Falls back to the full title
  // if stripping would leave nothing.
  const main =
    sub && title.toLowerCase().startsWith(sub.toLowerCase())
      ? title.slice(sub.length).replace(/^[\s—–-]+/, '').trim() || title
      : title;
  const decoded = useScramble(main, active);
  return (
    <div
      className="spiral-title"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 450ms ease' }}
    >
      <span className="spiral-title-main">{decoded}</span>
      {sub && <span className="spiral-title-sub">{sub}</span>}
    </div>
  );
}
