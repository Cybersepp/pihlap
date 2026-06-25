import { useEffect, useRef, useState } from 'react';

const INSTAGRAM_HANDLE = '@martinpihlap';
const INSTAGRAM_URL = 'https://instagram.com/martinpihlap';
const VIMEO_LABEL = 'vimeo.com/martinpihlap';
const VIMEO_URL = 'https://vimeo.com/martinpihlap';
const EMAIL = 'martin@martinpihlap.com';
const PHONE = '+372 5555 1234';

// Click-to-copy value (email / phone) with a brief "copied" confirmation. Falls
// back to a hidden textarea + execCommand where the async clipboard API is
// unavailable (older Safari / insecure origins).
function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <button
      type="button"
      className="contact-copy"
      onClick={copy}
      aria-label={`Copy ${label}: ${value}`}
    >
      <span className="contact-copy-text">{value}</span>
      <span className={`contact-copy-hint${copied ? ' is-copied' : ''}`}>
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  );
}

// The contact.txt window body — same info as before, now with copyable email /
// phone and live instagram / vimeo links.
export function ContactCard() {
  return (
    <div className="contact">
      <div className="contact-header">
        <div className="contact-name">Martin Pihlap</div>
        <div className="contact-role">Video Producer</div>
      </div>

      <dl className="contact-rows">
        <dt className="contact-label">email</dt>
        <dd className="contact-value">
          <CopyValue label="email" value={EMAIL} />
        </dd>

        <dt className="contact-label">phone</dt>
        <dd className="contact-value">
          <CopyValue label="phone" value={PHONE} />
        </dd>

        <dt className="contact-label">instagram</dt>
        <dd className="contact-value">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            {INSTAGRAM_HANDLE}
          </a>
        </dd>

        <dt className="contact-label">vimeo</dt>
        <dd className="contact-value">
          <a href={VIMEO_URL} target="_blank" rel="noreferrer">
            {VIMEO_LABEL}
          </a>
        </dd>

        <dt className="contact-label">based in</dt>
        <dd className="contact-value">Tallinn, Estonia</dd>
      </dl>
    </div>
  );
}
