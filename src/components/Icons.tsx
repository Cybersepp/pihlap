// Mac OS 9 style pixel-art icons as SVG.
// Hand-tuned to match the actual OS 9 icon set (manila folder, beige HD slab,
// QuickTime page document, SimpleText page with chunky "A").

interface IconProps {
  selected?: boolean;
}

// Selection wash: OS 9 tints selected icons with a translucent blue overlay
// rather than recoloring every pixel. We emulate that by rendering the icon
// normally and stacking a 50% opaque blue rect on top when selected.
function SelectionTint({ selected }: { selected: boolean }) {
  if (!selected) return null;
  return <rect x="0" y="0" width="32" height="32" fill="#3366CC" opacity="0.45" />;
}

export function FolderIcon({ selected = false }: IconProps) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges">
      {/* back tab (sticks up behind body) */}
      <path
        d="M3 9 H13 L15 11 H3 Z"
        fill="#D9A852"
        stroke="#6B4A1C"
        strokeWidth="1"
      />
      {/* main folder body */}
      <path
        d="M2 11 H30 V27 H2 Z"
        fill="#F2C76A"
        stroke="#6B4A1C"
        strokeWidth="1"
      />
      {/* top inner highlight (the slight lip across the top) */}
      <rect x="3" y="12" width="26" height="1" fill="#FBE3A4" />
      <rect x="3" y="13" width="26" height="1" fill="#F7D589" />
      {/* gradient banding to fake the OS 9 bevel */}
      <rect x="3" y="22" width="26" height="1" fill="#E0B355" />
      <rect x="3" y="23" width="26" height="1" fill="#CFA044" />
      <rect x="3" y="24" width="26" height="1" fill="#BD8E36" />
      <rect x="3" y="25" width="26" height="1" fill="#A77828" />
      <rect x="3" y="26" width="26" height="1" fill="#8C621D" />
      {/* left inner highlight */}
      <rect x="3" y="13" width="1" height="13" fill="#FBE3A4" opacity="0.7" />
      {/* right inner shadow */}
      <rect x="28" y="13" width="1" height="13" fill="#8C621D" opacity="0.6" />
      <SelectionTint selected={selected} />
    </svg>
  );
}

export function SimpleTextIcon({ selected = false }: IconProps) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges">
      {/* page body with dog-ear */}
      <polygon
        points="6,2 22,2 28,8 28,30 6,30"
        fill="#FFFFFF"
        stroke="#333333"
        strokeWidth="1"
      />
      {/* dog-ear fold */}
      <polygon
        points="22,2 28,8 22,8"
        fill="#DDDDDD"
        stroke="#333333"
        strokeWidth="1"
      />
      {/* fold shadow */}
      <line x1="22" y1="2" x2="22" y2="8" stroke="#999" strokeWidth="0.5" />
      {/* chunky SimpleText "A" badge */}
      <g transform="translate(9,11)">
        {/* outer "A" silhouette in black, pixel-rendered */}
        <rect x="3" y="0" width="2" height="1" fill="#000" />
        <rect x="2" y="1" width="4" height="1" fill="#000" />
        <rect x="2" y="2" width="1" height="1" fill="#000" />
        <rect x="5" y="2" width="1" height="1" fill="#000" />
        <rect x="1" y="3" width="1" height="1" fill="#000" />
        <rect x="6" y="3" width="1" height="1" fill="#000" />
        <rect x="1" y="4" width="6" height="1" fill="#000" />
        <rect x="0" y="5" width="1" height="1" fill="#000" />
        <rect x="7" y="5" width="1" height="1" fill="#000" />
        <rect x="0" y="6" width="1" height="1" fill="#000" />
        <rect x="7" y="6" width="1" height="1" fill="#000" />
      </g>
      {/* text lines below the badge */}
      <rect x="9" y="22" width="14" height="1" fill="#888" />
      <rect x="9" y="25" width="12" height="1" fill="#888" />
      <SelectionTint selected={selected} />
    </svg>
  );
}

export function MovIcon({ selected = false }: IconProps) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges">
      {/* page body with dog-ear (white document) */}
      <polygon
        points="6,2 22,2 28,8 28,30 6,30"
        fill="#FFFFFF"
        stroke="#333333"
        strokeWidth="1"
      />
      <polygon
        points="22,2 28,8 22,8"
        fill="#DDDDDD"
        stroke="#333333"
        strokeWidth="1"
      />
      {/* QuickTime "Q" badge in the center */}
      <g transform="translate(10,12)">
        {/* Q ring */}
        <circle cx="6" cy="6" r="5.5" fill="none" stroke="#1A4FA8" strokeWidth="1.5" />
        {/* Q tail (the little slash bottom-right) */}
        <rect x="7.5" y="8.5" width="4" height="1.5" transform="rotate(35 7.5 8.5)" fill="#1A4FA8" />
        {/* inner accent dots — hint at the QT rainbow */}
        <circle cx="6" cy="2" r="0.9" fill="#E63946" />
        <circle cx="10" cy="6" r="0.9" fill="#F4A261" />
        <circle cx="6" cy="10" r="0.9" fill="#2A9D8F" />
        <circle cx="2" cy="6" r="0.9" fill="#264653" />
      </g>
      {/* small file-extension hint */}
      <text
        x="16"
        y="29"
        textAnchor="middle"
        fontSize="5"
        fontFamily="Geneva, sans-serif"
        fill="#555"
      >
        QT
      </text>
      <SelectionTint selected={selected} />
    </svg>
  );
}

export function DiskIcon({ selected = false }: IconProps) {
  // Mac OS 9 Macintosh HD: a beige horizontal slab, slightly 3D, with a small
  // label area on the front. Not a floppy.
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges">
      {/* top face (perspective) */}
      <polygon
        points="3,10 7,7 29,7 29,11 25,14 3,14"
        fill="#E8DCC0"
        stroke="#5A4828"
        strokeWidth="1"
      />
      {/* front face */}
      <rect
        x="3"
        y="13"
        width="22"
        height="13"
        fill="#D9CBA8"
        stroke="#5A4828"
        strokeWidth="1"
      />
      {/* right side face */}
      <polygon
        points="25,13 29,10 29,23 25,26"
        fill="#B8A988"
        stroke="#5A4828"
        strokeWidth="1"
      />
      {/* top highlight */}
      <line x1="7" y1="8" x2="28" y2="8" stroke="#F5ECD3" strokeWidth="1" />
      {/* front label rectangle */}
      <rect x="6" y="16" width="14" height="6" fill="#FFFFFF" stroke="#7A6738" strokeWidth="0.5" />
      {/* tiny apple silhouette as the brand mark */}
      <g transform="translate(7,17.5)">
        <circle cx="2" cy="2" r="1.6" fill="#7A6738" />
        <circle cx="2.6" cy="0.6" r="0.5" fill="#7A6738" />
      </g>
      {/* label text lines */}
      <rect x="11" y="17.5" width="7" height="0.7" fill="#7A6738" />
      <rect x="11" y="19" width="5" height="0.7" fill="#7A6738" />
      <rect x="11" y="20.5" width="6" height="0.7" fill="#7A6738" />
      {/* indicator LED */}
      <rect x="22" y="22" width="2" height="1" fill="#7A6738" />
      <SelectionTint selected={selected} />
    </svg>
  );
}

export function CautionIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges">
      {/* black drop-shadow under the triangle */}
      <polygon points="17,3 31,29 3,29" fill="#000" opacity="0.25" />
      {/* yellow triangle with black outline */}
      <polygon points="16,2 30,28 2,28" fill="#FFD93D" stroke="#000" strokeWidth="1.5" strokeLinejoin="miter" />
      {/* inner highlight along left edge */}
      <polygon points="16,4 16,24 6,26" fill="#FFE875" opacity="0.6" />
      {/* exclamation mark */}
      <rect x="14.5" y="11" width="3" height="9" fill="#000" />
      <rect x="14.5" y="22" width="3" height="3" fill="#000" />
    </svg>
  );
}
