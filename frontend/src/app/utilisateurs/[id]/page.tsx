'use client';

import { useParams } from 'next/navigation';
import AdminUserManagement from '@/src/components/dashboard/admin-user-management';

export default function AdminUserManagementPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);

  return <AdminUserManagement userId={userId} />;
}
