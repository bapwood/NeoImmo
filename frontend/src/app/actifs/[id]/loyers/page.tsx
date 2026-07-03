'use client';

import { useParams } from 'next/navigation';
import PropertyRentManagement from '@/src/components/dashboard/property-rent-management';

export default function PropertyRentManagementPage() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);

  return <PropertyRentManagement propertyId={propertyId} />;
}
