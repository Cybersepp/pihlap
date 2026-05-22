// Mac OS 9 multicolor Apple logo — the Apple PUA glyph (U+F8FF) only renders
// on Apple devices, so we draw it inline.
function AppleLogo() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" aria-hidden="true">
      <defs>
        <clipPath id="apple-shape">
          {/* leaf */}
          <path d="M7.5 0.5 C8.5 1.2 8.6 2.2 8 3.1 C7 3.5 6.4 2.7 6.6 1.7 C6.8 1 7 0.7 7.5 0.5 Z" />
          {/* body */}
          <path d="M6.5 3 C8.5 3 9 3.6 10.5 3.6 C11.8 3.6 12.6 4.8 12.6 6.6 C12.6 9 11 13 9 13 C8 13 7.5 12.4 6.5 12.4 C5.5 12.4 5 13 4 13 C2 13 0.4 9 0.4 6.6 C0.4 4.8 1.2 3.6 2.5 3.6 C4 3.6 4.5 3 6.5 3 Z M9 7 C9 6 9 5 9 5 C8 5 8 6 7 6 L6 7 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#apple-shape)">
        <rect x="0" y="0" width="13" height="3" fill="#5FB04A" />
        <rect x="0" y="3" width="13" height="3" fill="#F7CE3E" />
        <rect x="0" y="6" width="13" height="2" fill="#F18F2E" />
        <rect x="0" y="8" width="13" height="2" fill="#DC362A" />
        <rect x="0" y="10" width="13" height="2.5" fill="#9E1F77" />
        <rect x="0" y="12.5" width="13" height="3" fill="#1F8FCB" />
      </g>
    </svg>
  );
}

export function MenuBar() {
  return (
    <div className="os9-menubar">
      <span className="os9-menubar-item os9-menubar-apple" aria-label="Apple menu">
        <AppleLogo />
      </span>
      <span className="os9-menubar-item">Finder</span>
      <span className="os9-menubar-item">File</span>
      <span className="os9-menubar-item">Edit</span>
      <span className="os9-menubar-item">View</span>
      <span className="os9-menubar-item">Special</span>
      <span className="os9-menubar-item">Help</span>
    </div>
  );
}
