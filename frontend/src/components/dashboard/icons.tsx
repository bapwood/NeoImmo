import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.8" />
      <rect x="13.5" y="11" width="7" height="9.5" rx="1.8" />
      <rect x="3.5" y="13" width="7" height="7.5" rx="1.8" />
    </BaseIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="10" r="3.3" />
      <path d="M20.2 18.2a3.3 3.3 0 0 0-2.4-3.1" />
      <path d="M17.3 7.2a3 3 0 0 1 0 5.6" />
      <path d="M3.8 18.2a3.3 3.3 0 0 1 2.4-3.1" />
      <path d="M6.7 7.2a3 3 0 0 0 0 5.6" />
    </BaseIcon>
  );
}

export function PropertyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20h16" />
      <path d="M6 20V9.4L12 4l6 5.4V20" />
      <path d="M9.5 20v-5.5h5V20" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </BaseIcon>
  );
}

export function TokenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="6" width="16" height="12" rx="3" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
    </BaseIcon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3l7 3.2v5.4c0 4.6-2.8 8.6-7 10.4-4.2-1.8-7-5.8-7-10.4V6.2L12 3z" />
      <path d="M9.2 12.1l1.8 1.8 3.8-4.1" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </BaseIcon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 16l4-4-4-4" />
      <path d="M14 12H4" />
    </BaseIcon>
  );
}
