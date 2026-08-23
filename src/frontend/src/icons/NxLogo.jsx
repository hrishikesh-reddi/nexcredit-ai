/* NexCredit "Atlas" — native brand mark.
   A rounded-square tile with an upward "N" (credit that grows),
   paired with a wordmark. Pure SVG, no external assets. */

export function NxLogo({ size = 28, variant = 'full', wordClass = '' }) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="NexCredit"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#1f6feb" />
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#nxMarkShine)" opacity="0.0" />
      <path
        d="M9.5 22 L9.5 10 L22.5 22 L22.5 10"
        stroke="#fff"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  if (variant === 'mark') return mark;

  return (
    <span className={`nx-logo ${wordClass}`} style={{ height: size }}>
      {mark}
      <span className="nx-logo-word" style={{ fontSize: Math.round(size * 0.62) }}>
        NexCredit<span className="nx-logo-ai">AI</span>
      </span>
    </span>
  );
}

export default NxLogo;
