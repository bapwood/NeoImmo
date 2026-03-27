import type { ResourceKey } from '@/src/lib/dashboard-resources';
import { getResourceConfigsForRole } from '@/src/lib/dashboard-resources';
import type { PanelUser, UserRole } from '@/src/lib/types';
import {
  DashboardIcon,
  PropertyIcon,
  TokenIcon,
  UsersIcon,
} from '../icons';
import type { NavigationItem, PanelIcon, ResourceState } from './types';

export function createInitialResourceState(): ResourceState {
  return {
    user: { items: [], loading: false, error: null },
    property: { items: [], loading: false, error: null },
    refreshToken: { items: [], loading: false, error: null },
  };
}

export function stringifyValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(' ');
  }

  if (value == null) {
    return '';
  }

  return String(value);
}

export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} €`;
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const clientProfileCompletionKeys: Array<keyof PanelUser> = [
  'firstName',
  'lastName',
  'number',
  'address',
  'postalCode',
  'city',
  'country',
  'day',
  'month',
  'year',
  'birthPlace',
  'nationality',
  'occupation',
  'taxResidence',
  'annualIncomeRange',
  'investmentObjective',
];

const clientKycReadinessKeys: Array<keyof PanelUser> = [
  'firstName',
  'lastName',
  'number',
  'address',
  'postalCode',
  'city',
  'country',
  'day',
  'month',
  'year',
  'birthPlace',
  'nationality',
  'occupation',
  'taxResidence',
];

function countFilledFields(user: PanelUser | null | undefined, keys: Array<keyof PanelUser>) {
  if (!user) {
    return 0;
  }

  return keys.filter((key) => {
    const value = user[key];

    if (value == null) {
      return false;
    }

    return String(value).trim() !== '';
  }).length;
}

export function getClientProfileCompletion(user: PanelUser | null | undefined) {
  return countFilledFields(user, clientProfileCompletionKeys);
}

export function getClientProfileCompletionTotal() {
  return clientProfileCompletionKeys.length;
}

export function getClientKycReadiness(user: PanelUser | null | undefined) {
  return countFilledFields(user, clientKycReadinessKeys);
}

export function getClientKycReadinessTotal() {
  return clientKycReadinessKeys.length;
}

export function formatBirthDate(user: PanelUser) {
  const parts = [user.day, user.month, user.year].filter(
    (value): value is string => Boolean(value && value.trim() !== ''),
  );

  return parts.length > 0 ? parts.join('/') : 'Non renseignée';
}

export function getUserInitials(user: PanelUser) {
  const candidates = [user.firstName, user.lastName]
    .filter((value): value is string => Boolean(value && value.trim() !== ''))
    .map((value) => value.trim().charAt(0).toUpperCase());

  if (candidates.length >= 2) {
    return `${candidates[0]}${candidates[1]}`;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  return user.email.slice(0, 2).toUpperCase();
}

function getIconForResource(key: ResourceKey): PanelIcon {
  if (key === 'user') {
    return UsersIcon;
  }

  if (key === 'property') {
    return PropertyIcon;
  }

  return TokenIcon;
}

export function buildNavigationItems(role: UserRole): NavigationItem[] {
  const resources = getResourceConfigsForRole(role);
  const clientPanels =
    role === 'CLIENT'
      ? [
          {
            key: 'opportunities' as const,
            label: 'Opportunités',
            description: 'Catalogue disponible',
            icon: PropertyIcon,
          },
        ]
      : [];

  return [
    {
      key: 'overview' as const,
      label: 'Overview',
      description: 'Vue d’ensemble',
      icon: DashboardIcon,
    },
    ...clientPanels,
    ...resources.map((resource) => ({
      key: resource.key,
      label: resource.navLabel,
      description: resource.navDescription,
      icon: getIconForResource(resource.key),
    })),
  ];
}

export function summarizeName(user: PanelUser) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.email;
}
