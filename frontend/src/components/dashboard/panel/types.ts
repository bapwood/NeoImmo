import type { ReactNode, SVGProps } from 'react';
import type { ResourceKey } from '@/src/lib/dashboard-resources';
import type { TableRow } from '@/src/lib/types';

export type Notice = { tone: 'success' | 'error'; message: string } | null;
export type PanelKey = 'overview' | 'opportunities' | ResourceKey;
export type ResourceSlice = {
  items: TableRow[];
  loading: boolean;
  error: string | null;
};
export type ResourceState = Record<ResourceKey, ResourceSlice>;
export type PanelIcon = (props: SVGProps<SVGSVGElement>) => ReactNode;

export type NavigationItem = {
  key: PanelKey;
  label: string;
  description: string;
  icon: PanelIcon;
};
