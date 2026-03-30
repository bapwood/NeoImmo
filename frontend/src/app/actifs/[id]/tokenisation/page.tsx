'use client';

import { useParams } from 'next/navigation';
import PropertyTokenization from '@/src/components/dashboard/property-tokenization';

export default function PropertyTokenizationPage() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);

  return <PropertyTokenization propertyId={propertyId} />;
}
