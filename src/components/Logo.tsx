export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`logo ${compact ? "is-compact" : ""}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="15" fill="#24333a" />
        <path d="M12 46V24l10-6v22l10-6v22" fill="none" stroke="#eaa27c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42 44V22l10 6" fill="none" stroke="#8fc1b8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="52" cy="17" r="4" fill="#e46f55" />
      </svg>
      {!compact ? (
        <span>
          <strong>Displaynian</strong>
          <small>displays que viajan</small>
        </span>
      ) : null}
    </span>
  );
}
