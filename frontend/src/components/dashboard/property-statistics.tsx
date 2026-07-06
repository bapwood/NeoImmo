'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, requestJson, resolveAssetUrl } from '@/src/lib/api';
import { clearStoredSession, readStoredSession } from '@/src/lib/auth';
import { buildExplorerAddressUrl } from '@/src/lib/explorer';
import type { AuthSession, PropertyRecord } from '@/src/lib/types';
import RevenueForecastChart from './panel/revenue-forecast-chart';
import baseStyles from './styles/property-tokenization.module.css';

type PropertyStatisticsResponse = {
  property: {
    id: number;
    name: string;
    localization: string;
    contractAddress: string | null;
    tokenNumber: number;
    tokenPrice: number;
    tokenDecimals: number;
    tokenizationStatus: string;
  };
  onChain: {
    tokensSold: string | null;
    totalSupply: string | null;
    onChainError: string | null;
  };
  investors: {
    count: number;
    totalInvested: number;
    totalCurrentValuation: number;
  };
  income: {
    totalProjectedMonthly: number;
    projectedAnnualYieldPercent: number;
    totalPaidToDate: number;
    totalProjectedRemaining: number;
  };
  months: Array<{
    month: string;
    label: string;
    paid: number;
    projected: number;
    total: number;
  }>;
};

type Props = {
  propertyId: number;
};

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function shortenValue(value: string | null | undefined, visible = 8) {
  if (!value) return '—';
  if (value.length <= visible * 2 + 3) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

export default function PropertyStatistics({ propertyId }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [stats, setStats] = useState<PropertyStatisticsResponse | null>(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redirectToSignin() {
    clearStoredSession();
    setSession(null);
    router.replace('/signin');
  }

  const loadAll = useCallback(
    async (explicitSession?: AuthSession | null) => {
      const currentSession = explicitSession ?? readStoredSession();

      if (!currentSession) {
        await redirectToSignin();
        return;
      }

      if (currentSession.user.role !== 'ADMIN') {
        router.replace('/');
        return;
      }

      if (!Number.isFinite(propertyId) || propertyId <= 0) {
        setError('Identifiant de bien invalide.');
        setBooting(false);
        return;
      }

      setSession(currentSession);
      setError(null);
      setLoading(true);

      try {
        const [propertyResponse, statsResponse] = await Promise.all([
          requestJson<PropertyRecord>(`/property/manage/${propertyId}`, undefined, currentSession),
          requestJson<PropertyStatisticsResponse>(
            `/crypto/properties/${propertyId}/statistics`,
            undefined,
            currentSession,
          ),
        ]);
        setProperty(propertyResponse);
        setStats(statsResponse);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
          await redirectToSignin();
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de charger les statistiques du bien.',
        );
      } finally {
        setLoading(false);
        setBooting(false);
      }
    },
    [propertyId, router],
  );

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const coverImage = resolveAssetUrl(property?.images[0]);

  if (booting) {
    return (
      <main className={baseStyles.shell}>
        <section className={baseStyles.surface}>
          <p className={baseStyles.loadingState}>Chargement des statistiques...</p>
        </section>
      </main>
    );
  }

  const soldRatio =
    stats?.onChain.tokensSold && stats.onChain.totalSupply
      ? Math.min(
          100,
          Math.round((Number(stats.onChain.tokensSold) / Math.max(Number(stats.onChain.totalSupply), 1)) * 100),
        )
      : null;
  const appreciation =
    stats && stats.investors.totalInvested > 0
      ? Number(
          (
            ((stats.investors.totalCurrentValuation - stats.investors.totalInvested) /
              stats.investors.totalInvested) *
            100
          ).toFixed(1),
        )
      : 0;

  return (
    <main className={baseStyles.shell}>
      <section className={baseStyles.surface}>
        <header className={baseStyles.header}>
          <button
            type="button"
            className={baseStyles.backButton}
            onClick={() => router.push('/?panel=property')}
          >
            Retour aux actifs
          </button>
          <div className={baseStyles.headerActions}>
            <button
              type="button"
              className={baseStyles.secondaryButton}
              onClick={() => router.push(`/actifs/${propertyId}/loyers`)}
            >
              Loyers
            </button>
            <button
              type="button"
              className={baseStyles.secondaryButton}
              onClick={() => router.push(`/actifs/${propertyId}/tokenisation`)}
            >
              Tokenisation
            </button>
            <button
              type="button"
              className={baseStyles.secondaryButton}
              onClick={() => void loadAll(session)}
              disabled={loading}
            >
              {loading ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
        </header>

        {error ? <div className={baseStyles.noticeError}>{error}</div> : null}

        {property && stats ? (
          <>
            <section className={baseStyles.hero}>
              <div className={baseStyles.heroCopy}>
                <div className={baseStyles.eyebrow}>Statistiques & projections</div>
                <h1 className={baseStyles.title}>{property.name}</h1>
                <div className={baseStyles.heroMeta}>
                  <span className={baseStyles.metaPill}>{stats.property.localization}</span>
                  <span className={baseStyles.metaPill}>{stats.property.tokenNumber} parts</span>
                  <span className={baseStyles.metaPill}>{stats.property.tokenizationStatus}</span>
                </div>
                {stats.property.contractAddress && (
                  <a
                    href={buildExplorerAddressUrl(stats.property.contractAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className={baseStyles.explorerLink}
                  >
                    {shortenValue(stats.property.contractAddress)} ↗
                  </a>
                )}
              </div>
              <div className={baseStyles.heroVisual}>
                {coverImage ? (
                  <div className={baseStyles.imageFrame} style={{ backgroundImage: `url(${coverImage})` }} />
                ) : (
                  <div className={baseStyles.imageFallback}>Aucune image</div>
                )}
              </div>
            </section>

            <section className={baseStyles.metricsGrid}>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Investisseurs</div>
                <div className={baseStyles.metricValue}>{stats.investors.count}</div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Total investi</div>
                <div className={baseStyles.metricValue}>{formatEur(stats.investors.totalInvested)}</div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Valeur actuelle</div>
                <div className={baseStyles.metricValue}>
                  {formatEur(stats.investors.totalCurrentValuation)}
                  {stats.investors.totalInvested > 0 && (
                    <small style={{ marginLeft: '0.5rem', color: appreciation >= 0 ? '#16a34a' : '#dc2626' }}>
                      {appreciation >= 0 ? '+' : ''}
                      {appreciation}%
                    </small>
                  )}
                </div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Parts vendues</div>
                <div className={baseStyles.metricValue}>
                  {stats.onChain.tokensSold ?? '—'} / {stats.onChain.totalSupply ?? '—'}
                  {soldRatio != null && <small style={{ marginLeft: '0.5rem' }}>({soldRatio}%)</small>}
                </div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Revenu mensuel projeté</div>
                <div className={baseStyles.metricValue}>{formatEur(stats.income.totalProjectedMonthly)}</div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Rendement annuel projeté</div>
                <div className={baseStyles.metricValue}>{stats.income.projectedAnnualYieldPercent}%</div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Loyers versés à date</div>
                <div className={baseStyles.metricStatePositive}>{formatEur(stats.income.totalPaidToDate)}</div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Reste à verser (projeté)</div>
                <div
                  className={
                    stats.income.totalProjectedRemaining > 0
                      ? baseStyles.metricStateNegative
                      : baseStyles.metricStatePositive
                  }
                >
                  {formatEur(stats.income.totalProjectedRemaining)}
                </div>
              </article>
            </section>

            {stats.onChain.onChainError && (
              <div className={baseStyles.inlineWarning}>
                Lecture on-chain partielle : {stats.onChain.onChainError}
              </div>
            )}

            <RevenueForecastChart revenueSeries={stats.months} />
          </>
        ) : null}
      </section>
    </main>
  );
}
