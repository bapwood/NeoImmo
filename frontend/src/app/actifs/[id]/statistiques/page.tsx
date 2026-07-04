'use client';

import { useParams } from 'next/navigation';
import PropertyStatistics from '@/src/components/dashboard/property-statistics';

export default function PropertyStatisticsPage() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);

  return <PropertyStatistics propertyId={propertyId} />;
}
