import { AppleLogo } from './Icons';

export function MenuBar() {
  // Decorative only — hovers highlight but clicks do nothing, per spec.
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="menubar" role="navigation" aria-label="Menu bar">
      <span className="menubar-apple" aria-label="Apple menu">
        <AppleLogo />
      </span>
      <span className="menubar-item menubar-item--bold">Finder</span>
      <span className="menubar-item">File</span>
      <span className="menubar-item">Edit</span>
      <span className="menubar-item">View</span>
      <span className="menubar-item">Go</span>
      <span className="menubar-item">Window</span>
      <span className="menubar-item">Help</span>

      <span className="menubar-spacer" />

      <span className="menubar-right">
        <span>Martin Pihlap</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span>{time}</span>
      </span>
    </div>
  );
}
