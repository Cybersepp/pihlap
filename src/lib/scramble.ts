import { useEffect, useRef, useState } from 'react';

// Glyphs cycled through for not-yet-revealed characters. Weighted toward dots so
// the scramble reads as decoding text rather than pure noise.
const GLYPHS = '!<>-_\\/[]{}—=+*^?#·:.....';

// One frame of the scramble: the first `reveal` characters are locked to the
// final text, spaces pass through, everything else is a random glyph.
function scrambleFrame(target: string, reveal: number): string {
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (i < reveal || ch === ' ') out += ch;
    else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }
  return out;
}

// Decode/encode `text` based on `active`: when active, characters lock in
// left-to-right (decode); when inactive, they churn back into random glyphs
// (encode/unscramble out). A new `text` restarts from fully scrambled. The
// reveal cursor persists across active flips, so a click scrambles out from
// wherever it was, and closing scrambles back in. `charsPerSec` sets the speed.
export function useScramble(text: string, active = true, charsPerSec = 26): string {
  const [out, setOut] = useState(() => scrambleFrame(text, 0));
  const reveal = useRef(0); // characters currently locked in
  const prevText = useRef(text);
  const raf = useRef(0);

  useEffect(() => {
    // A new title restarts fully scrambled so it decodes in fresh.
    if (prevText.current !== text) {
      prevText.current = text;
      reveal.current = 0;
    }
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = active ? text.length : 0;
      if (reveal.current < target) {
        reveal.current = Math.min(target, reveal.current + charsPerSec * dt);
      } else if (reveal.current > target) {
        reveal.current = Math.max(target, reveal.current - charsPerSec * dt);
      }
      setOut(scrambleFrame(text, Math.floor(reveal.current)));
      if (reveal.current !== target) {
        raf.current = requestAnimationFrame(tick);
      } else if (active) {
        setOut(text); // settle to clean text once fully decoded
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [text, active, charsPerSec]);

  return out;
}
