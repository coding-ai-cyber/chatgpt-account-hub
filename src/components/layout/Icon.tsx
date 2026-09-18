import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "account"
  | "users"
  | "chart"
  | "help"
  | "settings"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "menu"
  | "close"
  | "eye"
  | "eye-off"
  | "refresh"
  | "lightning"
  | "plus"
  | "more"
  | "search"
  | "grid"
  | "list"
  | "external"
  | "arrow-right"
  | "check"
  | "sun"
  | "moon"
  | "panel-left"
  | "history"
  | "sparkles"
  | "warning"
  | "info"
  | "download"
  | "upload"
  | "edit"
  | "clock"
  | "delete"
  | "minus"
  | "restore"
  | "expand";

const ICON_PATHS: Record<IconName, ReactNode> = {
  account: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-3.6 3.6-6 8-6s8 2.4 8 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 5.6" />
      <path d="M18.5 14.8c1.8.9 3 2.5 3 5.2" />
    </>
  ),
  chart: (
    <>
      <path d="M5 19V5" />
      <path d="M5 19h14" />
      <path d="M9 15l3-4 3 2 4-6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.2a2.6 2.6 0 1 1 4.5 1.8c-1.1 1-1.9 1.5-1.9 2.8" />
      <path d="M12 17h.01" />
    </>
  ),
  settings: (
    <>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M3.5 3.5 20.5 20.5" />
      <path d="M9.9 5.2A9.6 9.6 0 0 1 12 5.1c6 0 9.5 6.9 9.5 6.9a17.8 17.8 0 0 1-2.5 3.2M14.1 14.1a3 3 0 0 1-4.2-4.2" />
      <path d="M6.2 6.8A17.7 17.7 0 0 0 2.5 12S6 18.9 12 18.9a9.5 9.5 0 0 0 4.1-.9" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3v6h-6" />
    </>
  ),
  lightning: <path d="M13 2 4 14h6l-1 8 10-14h-6l0-6Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  external: (
    <>
      <path d="M14 5h5v5" />
      <path d="M19 5 10 14" />
      <path d="M19 14v5H5V5h5" />
    </>
  ),
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m5 13 4 4L19 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  "panel-left": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 2.8 20h18.4L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v3h16v-3" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
      <path d="M4 17v3h16v-3" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  delete: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  restore: (
    <>
      <path d="M9 9h10v10H9z" />
      <path d="M5 15V5h10" />
    </>
  ),
  expand: <rect x="5" y="5" width="14" height="14" rx="1" />,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  className,
  ...props
}: { name: IconName; size?: number; strokeWidth?: number; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}