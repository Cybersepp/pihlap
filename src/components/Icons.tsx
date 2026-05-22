// Authentic Mac OS 9 icons sourced from
// https://github.com/bearz314/MacOS9-icons (classic Mac OS 9 icon set).
// PNG files live in /public/assets/icons/ and are served at /assets/icons/*.

const folderPng = '/assets/icons/folder.png';
const hdPng = '/assets/icons/hd.png';
const simpletextPng = '/assets/icons/simpletext.png';
const movPng = '/assets/icons/mov.png';

interface IconProps {
  selected?: boolean;
}

// OS 9 selection rendering: tint the icon translucent blue. We achieve this
// with a wrapping span and an absolute blue overlay using mix-blend-mode so
// it stays anchored to the icon's opaque pixels (not the bounding box).
function IconImg({ src, alt, selected }: { src: string; alt: string; selected: boolean }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 32,
        height: 32,
        lineHeight: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        width={32}
        height={32}
        draggable={false}
        style={{
          width: 32,
          height: 32,
          display: 'block',
          imageRendering: '-webkit-optimize-contrast',
        }}
      />
      {selected && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#3366CC',
            mixBlendMode: 'multiply',
            opacity: 0.55,
            pointerEvents: 'none',
          }}
        />
      )}
    </span>
  );
}

export function FolderIcon({ selected = false }: IconProps) {
  return <IconImg src={folderPng} alt="Folder" selected={selected} />;
}

export function SimpleTextIcon({ selected = false }: IconProps) {
  return <IconImg src={simpletextPng} alt="SimpleText document" selected={selected} />;
}

export function MovIcon({ selected = false }: IconProps) {
  return <IconImg src={movPng} alt="QuickTime movie" selected={selected} />;
}

export function DiskIcon({ selected = false }: IconProps) {
  return <IconImg src={hdPng} alt="Macintosh HD" selected={selected} />;
}

// Yellow caution triangle for the HD dialog. Not in the OS 9 icon set we
// pulled from — kept as SVG so the alert box stays self-contained.
export function CautionIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges">
      <polygon points="17,3 31,29 3,29" fill="#000" opacity="0.25" />
      <polygon points="16,2 30,28 2,28" fill="#FFD93D" stroke="#000" strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="16,4 16,24 6,26" fill="#FFE875" opacity="0.6" />
      <rect x="14.5" y="11" width="3" height="9" fill="#000" />
      <rect x="14.5" y="22" width="3" height="3" fill="#000" />
    </svg>
  );
}
