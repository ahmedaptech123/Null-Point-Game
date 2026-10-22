import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M3 34V6h9.4L28.7 25V6H37v28h-9.6L10.9 15v19H3Z" fill="currentColor" />
      <path d="M3 37h34" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <path d="M31 0v5M35.5 2.5h-9" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
    </svg>
  );
}

export function CrosshairIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m8 4 8 8-8 8" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m8 5 11 7-11 7V5Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5v14M15 5v14" strokeWidth="2.4" />
    </svg>
  );
}

export function SoundIcon({ muted = false, ...props }: IconProps & { muted?: boolean }) {
  return (
    <svg {...base(props)}>
      <path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4v-5Z" />
      {muted ? (
        <>
          <path d="m17 9 4 6M21 9l-4 6" />
        </>
      ) : (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 20 6v6c0 4.6-3.4 7.6-8 9-4.6-1.4-8-4.4-8-9V6l8-3Z" />
      <path d="m8.6 12 2.3 2.3 4.5-4.6" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}

export function SkullIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 9a5 5 0 1 1 10 0v3.5l1.3 1.7-.8 2.8H14v2.5h-4V17H6.5L5.7 14 7 12.5V9Z" />
      <circle cx="9.5" cy="10" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="1.3" fill="currentColor" stroke="none" />
      <path d="M12 14.5v2" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 14v5M8 21h8" />
    </svg>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.8M9 2h6" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="10" width="15" height="10.5" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10.5h5" />
    </svg>
  );
}

export function RadarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" opacity="0.6" />
      <path d="M12 3.5V12l6 3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function MouseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="2.5" width="12" height="19" rx="6" />
      <path d="M12 2.5v7M6 9.5h12" />
    </svg>
  );
}

export function WeaponGlyph({
  kind,
  className = "h-8 w-16",
}: {
  kind: "pulse" | "scatter" | "rail";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 96 36" fill="none" className={className} aria-hidden="true">
      {kind === "pulse" && (
        <>
          <path d="M7 15h22l5-5h31l5 4h13v5H70l-3 4H25l-4-3H7v-5Z" fill="currentColor" opacity="0.22" />
          <path d="M7 15h22l5-5h31l5 4h13v5H70l-3 4H25l-4-3H7v-5Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M39 24h9l-2 8H33l1-8M54 10h11v6H54z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M40 11h23" stroke="currentColor" strokeWidth="2" opacity="0.85" />
          <path d="M82 17h7" stroke="currentColor" strokeWidth="2" />
        </>
      )}
      {kind === "scatter" && (
        <>
          <path d="M8 16h21l5-5h30l4-4h16v9h-13l-4 4H26l-4-2H8v-2Z" fill="currentColor" opacity="0.22" />
          <path d="M8 16h21l5-5h30l4-4h16v9h-13l-4 4H26l-4-2H8v-2Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M68 4h14M70 9h14M72 14h12" stroke="currentColor" strokeWidth="1.5" />
          <path d="M41 22h10l-2 9H35l2-9M56 12h9v6h-9z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 18h18" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
        </>
      )}
      {kind === "rail" && (
        <>
          <path d="M5 17h25l4-4h31l3-3h18v5H74l-4 6H32l-5-2H5v-2Z" fill="currentColor" opacity="0.22" />
          <path d="M5 17h25l4-4h31l3-3h18v5H74l-4 6H32l-5-2H5v-2Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M40 13h20v5H40zM44 8h12v3H44zM57 24h8l-2 8H49l2-8Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M87 12h7" stroke="currentColor" strokeWidth="2" />
          <path d="M44 9h11" stroke="currentColor" strokeWidth="3" opacity="0.8" />
        </>
      )}
    </svg>
  );
}
