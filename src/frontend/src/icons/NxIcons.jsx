/* NexCredit hand-drawn icon set.
   One visual grammar: 24px grid, 1.6 stroke, round caps, currentColor.
   These replace generic glyph characters and stock icons across the workbench. */

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const Doc = ({ children }) => <>
  <path d="M6 3.5h8.5L19 8v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5Z" transform="translate(-0.5)" />
  <path d="M14 3.5V8h4.5" />
  {children}
</>;

export const IcDecisionTick = props => (
  <svg {...base} {...props}><Doc>
    <path d="M9 13.6l2.2 2.2L15.4 11" />
  </Doc></svg>
);

export const IcDecisionCross = props => (
  <svg {...base} {...props}><Doc>
    <path d="M9.6 11.5l4.8 4.8M14.4 11.5l-4.8 4.8" />
  </Doc></svg>
);

export const IcReviewHourglass = props => (
  <svg {...base} {...props}><Doc>
    <path d="M9.2 10.5h5.6M9.2 16.5h5.6" />
    <path d="M10 10.5c0 2 2 2.6 2 3s-2 1-2 3M14 10.5c0 2-2 2.6-2 3s2 1 2 3" />
  </Doc></svg>
);

export const IcClockLog = props => (
  <svg {...base} {...props}>
    <circle cx="11.5" cy="12" r="7.2" />
    <path d="M11.5 8.2V12l2.6 1.8" />
    <path d="M18.8 15.5H21M18 19h3" />
  </svg>
);

export const IcDocSalary = props => (
  <svg {...base} {...props}><Doc>
    <path d="M12.6 17.2c-.5.5-2 .6-2.6-.2-.5-.7-.4-1.8.3-2.4l3.4-2.8c.7-.6.8-1.7.3-2.4-.6-.8-2.1-.7-2.6-.2" />
    <path d="M12 8v8" strokeWidth="1.3" />
  </Doc></svg>
);

export const IcDocStatement = props => (
  <svg {...base} {...props}><Doc>
    <path d="M8.6 11.5h6.8M8.6 14.3h6.8M8.6 17.1h4.2" />
  </Doc></svg>
);

export const IcDocKyc = props => (
  <svg {...base} {...props}><Doc>
    <circle cx="12" cy="12.4" r="1.9" />
    <path d="M8.9 17.4c.5-1.6 1.7-2.4 3.1-2.4s2.6.8 3.1 2.4" />
  </Doc></svg>
);

export const IcDocUtility = props => (
  <svg {...base} {...props}><Doc>
    <path d="M12.6 10.2l-2.4 3.4h3l-2 3.2" />
  </Doc></svg>
);

export const IcDocEmployment = props => (
  <svg {...base} {...props}><Doc>
    <rect x="8.4" y="11" width="7.2" height="5.4" rx="0.8" />
    <path d="M10.4 11v-.9a1.6 1.6 0 0 1 3.2 0v.9" />
  </Doc></svg>
);

export const IcDocTax = props => (
  <svg {...base} {...props}><Doc>
    <path d="M9.4 16.2l5.2-5.6" />
    <circle cx="9.7" cy="11.9" r="1.15" />
    <circle cx="14.3" cy="14.9" r="1.15" />
  </Doc></svg>
);

export const IcShieldAudit = props => (
  <svg {...base} {...props}>
    <path d="M12 3l7 2.6v5.6c0 4.6-3 7.9-7 9.8-4-1.9-7-5.2-7-9.8V5.6L12 3z" />
    <path d="M9.2 12l2 2 3.6-4" />
  </svg>
);

export const IcPulse = props => (
  <svg {...base} {...props}>
    <path d="M3.5 12h4l2-4.5 3.4 9 2.1-4.5h5.5" />
  </svg>
);
