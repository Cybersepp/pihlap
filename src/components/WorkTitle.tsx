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
  const decoded = useScramble(title, active);
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
