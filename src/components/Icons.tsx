// Modern macOS-style placeholder icons. These are intentionally simple SVGs
// so they can be swapped for Pihlap's own art (drop a PNG into
// /public/assets/icons/ and switch the component to <img src=...>).

interface IconProps {
  size?: number | string;
}

export function FolderIcon({ size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="folder-tab" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5BA8F5" />
          <stop offset="100%" stopColor="#3E8DDE" />
        </linearGradient>
        <linearGradient id="folder-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#86C0F5" />
          <stop offset="100%" stopColor="#4F95DA" />
        </linearGradient>
      </defs>
      {/* Back panel (tab) */}
      <path
        d="M6 16 Q6 12 10 12 L26 12 L31 17 L54 17 Q58 17 58 21 L58 50 Q58 54 54 54 L10 54 Q6 54 6 50 Z"
        fill="url(#folder-tab)"
      />
      {/* Front panel */}
      <path
        d="M6 22 Q6 18 10 18 L54 18 Q58 18 58 22 L58 50 Q58 54 54 54 L10 54 Q6 54 6 50 Z"
        fill="url(#folder-body)"
      />
      {/* Top highlight */}
      <path
        d="M6 22 Q6 18 10 18 L54 18 Q58 18 58 22 L58 23 L6 23 Z"
        fill="rgba(255,255,255,0.25)"
      />
    </svg>
  );
}

export function TextDocIcon({ size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="doc-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F2F4" />
        </linearGradient>
      </defs>
      {/* Page */}
      <path
        d="M14 6 L42 6 L54 18 L54 56 Q54 58 52 58 L14 58 Q12 58 12 56 L12 8 Q12 6 14 6 Z"
        fill="url(#doc-body)"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.5"
      />
      {/* Fold */}
      <path d="M42 6 L54 18 L42 18 Z" fill="#D6D8DC" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
      {/* Text lines */}
      <rect x="20" y="28" width="26" height="2" rx="1" fill="#9AA0A6" />
      <rect x="20" y="34" width="22" height="2" rx="1" fill="#9AA0A6" />
      <rect x="20" y="40" width="26" height="2" rx="1" fill="#9AA0A6" />
      <rect x="20" y="46" width="18" height="2" rx="1" fill="#9AA0A6" />
    </svg>
  );
}

export function MovIcon({ size = 52 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mov-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3D3D45" />
          <stop offset="100%" stopColor="#1B1B22" />
        </linearGradient>
      </defs>
      {/* Page */}
      <path
        d="M14 6 L42 6 L54 18 L54 56 Q54 58 52 58 L14 58 Q12 58 12 56 L12 8 Q12 6 14 6 Z"
        fill="url(#mov-body)"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="0.5"
      />
      <path d="M42 6 L54 18 L42 18 Z" fill="#2A2A30" />
      {/* Play badge */}
      <circle cx="33" cy="38" r="11" fill="rgba(255,255,255,0.92)" />
      <polygon points="30,32 30,44 41,38" fill="#1B1B22" />
    </svg>
  );
}

// Caution glyph for the HD-not-configured dialog.
export function CautionIcon({ size = 38 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="19,3 36,33 2,33"
        fill="#F5A623"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <rect x="17.4" y="13" width="3.2" height="11" rx="1.6" fill="#fff" />
      <circle cx="19" cy="28" r="1.8" fill="#fff" />
    </svg>
  );
}

// Small Apple logo for the menu bar
export function AppleLogo({ size = 14 }: IconProps) {
  // The Apple glyph is ~1.15× taller than wide; only the numeric case can be scaled.
  const height = typeof size === 'number' ? size * 1.15 : size;
  return (
    <svg width={size} height={height} viewBox="0 0 16 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 3.5c.7-.9 1.2-2.1 1.05-3.3-.95.05-2.1.6-2.85 1.4-.65.7-1.25 1.85-1.05 3.05.95.1 2-.45 2.85-1.15Zm1.55 1.85c-1.4-.08-2.6.8-3.25.8s-1.7-.75-2.85-.72c-1.45.02-2.85.85-3.6 2.15-1.55 2.65-.4 6.6 1.1 8.75.75 1.05 1.6 2.2 2.75 2.16 1.1-.05 1.5-.7 2.85-.7s1.7.7 2.85.68c1.2-.02 1.9-1.05 2.65-2.1.85-1.2 1.2-2.4 1.2-2.45-.02-.02-2.35-.9-2.4-3.55-.02-2.25 1.8-3.3 1.9-3.4-1.05-1.55-2.7-1.7-3.2-1.7Z" />
    </svg>
  );
}

// Sidebar mini-icons for Finder
export function SidebarFolderIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 4.5C1.5 3.7 2.2 3 3 3h3l1.3 1.3H13c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H3c-.8 0-1.5-.7-1.5-1.5v-7Z" />
    </svg>
  );
}

export function SidebarAirDropIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 2a6 6 0 0 0-5.2 9 .5.5 0 0 0 .85-.5 5 5 0 1 1 8.7 0 .5.5 0 1 0 .85.5A6 6 0 0 0 8 2Zm0 3a3 3 0 0 0-2.6 4.5.5.5 0 0 0 .87-.5 2 2 0 1 1 3.46 0 .5.5 0 0 0 .87.5A3 3 0 0 0 8 5Zm-1 6.5L8 14l1-2.5h-2Z" />
    </svg>
  );
}

export function SidebarHDDIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <circle cx="11" cy="10" r="0.7" fill="#fff" />
    </svg>
  );
}
