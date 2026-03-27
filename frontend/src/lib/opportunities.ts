import { requestJson } from './api';
import type { AuthSession, PropertyRecord } from './types';

export function isAvailableOpportunity(property: PropertyRecord) {
  return property.ownerId == null;
}

export function filterOpportunities(
  properties: PropertyRecord[],
  query: string,
) {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return properties;
  }

  return properties.filter((property) =>
    [
      property.name,
      property.localization,
      property.livingArea,
      property.description,
      property.keyPoints.join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
}

export async function fetchAvailableOpportunities(
  session?: AuthSession | null,
): Promise<PropertyRecord[]> {
  const items = await requestJson<PropertyRecord[]>('/property', undefined, session);
  return items.filter(isAvailableOpportunity);
}

export async function fetchOpportunityById(
  propertyId: number,
  session?: AuthSession | null,
): Promise<PropertyRecord | null> {
  const property = await requestJson<PropertyRecord | null>(
    `/property/${encodeURIComponent(String(propertyId))}`,
    undefined,
    session,
  );

  return property && isAvailableOpportunity(property) ? property : null;
}
