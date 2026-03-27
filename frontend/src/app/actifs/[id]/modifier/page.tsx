'use client';

import { useParams } from 'next/navigation';
import PropertyEditor from '@/src/components/dashboard/property-editor';

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);

  return <PropertyEditor mode="edit" propertyId={propertyId} />;
}
