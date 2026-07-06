import { works } from '../data/works';

// Shown when the WebGL scene can't run — no GL context (old device, blocked GL)
// or the scene chunk failed to load / threw. The whole site is normally one WebGL
// canvas, so without this a visitor would get a blank page. This keeps the
// portfolio fully usable as a plain document: name, contact, and every work linked
// out to its full piece. Self-contained inline styles so it never depends on the
// (possibly unloaded) scene layer.
const EMAIL = 'martin@martinpihlap.com';
const INSTAGRAM_URL = 'https://instagram.com/martinpihlap';
const VIMEO_URL = 'https://vimeo.com/martinpihlap';

export function SceneFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        color: '#e9e9ec',
        background: '#111113',
        zIndex: 300,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <main style={{ width: 'min(680px, 90vw)', padding: '10vh 0 12vh' }}>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 700, margin: 0 }}>
          Martin Pihlap
        </h1>
        <p
          style={{
            fontFamily: "'Space Mono', ui-monospace, monospace",
            fontSize: 14,
            letterSpacing: '0.04em',
            color: '#9a9aa2',
            margin: '10px 0 0',
          }}
        >
          Music Video Director &amp; Video Producer — Tallinn, Estonia
        </p>

        <nav aria-label="Contact" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '22px 0 40px' }}>
          <a style={linkStyle} href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <a style={linkStyle} href={INSTAGRAM_URL} target="_blank" rel="noreferrer">instagram</a>
          <a style={linkStyle} href={VIMEO_URL} target="_blank" rel="noreferrer">vimeo</a>
        </nav>

        <h2
          style={{
            fontFamily: "'Space Mono', ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#6c6c74',
            margin: '0 0 4px',
          }}
        >
          Selected works
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {works.map((work) => (
            <li key={work.id} style={{ borderTop: '1px solid #26262b' }}>
              <a
                href={work.fullPieceUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '15px 2px',
                  color: '#e9e9ec',
                  textDecoration: 'none',
                }}
              >
                <span>
                  {work.title}
                  {work.client ? <span style={{ color: '#78787f' }}> — {work.client}</span> : null}
                </span>
                <span style={{ color: '#78787f', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {work.year}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

const linkStyle = {
  fontFamily: "'Space Mono', ui-monospace, monospace",
  fontSize: 13,
  color: '#c9c9d0',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
} as const;
