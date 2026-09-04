type RerouteMarkProps = {
  className?: string;
};

export function RerouteMark({ className }: RerouteMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect className="reroute-mark-field" height="60" rx="15" width="60" x="2" y="2" />
      <path
        className="reroute-mark-route"
        clipRule="evenodd"
        d="M16 14h19c10.5 0 17 5.7 17 15s-6.5 15-17 15h-9v8H16V14Zm10 8v14h8.5c5 0 7.5-2.6 7.5-7s-2.5-7-7.5-7H26Z"
        fillRule="evenodd"
      />
      <path className="reroute-mark-route" d="M11 33h31v-5l12 8-12 9v-5H11v-7Z" />
      <path className="reroute-mark-route" d="M32 42h11l8 10H40l-8-10Z" />
    </svg>
  );
}
