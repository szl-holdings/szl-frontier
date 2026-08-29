export function SzlMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="8" y="8" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" transform="rotate(45 16 16)" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}
