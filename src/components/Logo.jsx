// Brand: four-colour diamond mark + two-tone "MonCheck" wordmark,
// per the reference theme.
export function LogoMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g transform="rotate(45 12 12)">
        <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#c0392e" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#efc93f" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#18803d" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#2b2118" />
      </g>
    </svg>
  )
}

export function LogoWordmark({ className = '' }) {
  return (
    <span className={className}>
      Mon<span className="text-primary">Check</span>
    </span>
  )
}
