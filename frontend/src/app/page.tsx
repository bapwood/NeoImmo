'use client';

import { useEffect, useState } from 'react';
import LandingPage from '@/src/app/portefeuille/LandingPage';
import DashboardPanel from '@/src/components/dashboard/panel';
import DashboardLoader from '@/src/components/dashboard/panel/loader';
import { readStoredSession } from '@/src/lib/auth';

export default function Home() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    setHasSession(Boolean(readStoredSession()));
  }, []);

  if (hasSession == null) {
    return <DashboardLoader message="Préparation de NeoImmo..." />;
  }

  if (hasSession) {
    return <DashboardPanel unauthenticatedRedirectPath="/" />;
  }

  return <LandingPage onAuthenticated={() => setHasSession(true)} />;
}
