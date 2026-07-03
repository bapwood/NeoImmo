'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, requestJson, resolveAssetUrl } from '@/src/lib/api';
import { clearStoredSession, readStoredSession } from '@/src/lib/auth';
import { buildExplorerAddressUrl, buildExplorerTransactionUrl } from '@/src/lib/explorer';
import type { AuthSession, PortfolioRevenueStatus, PropertyRecord } from '@/src/lib/types';
import baseStyles from './styles/property-tokenization.module.css';
import styles from './styles/property-rent-management.module.css';

type RentManagementMonth = {
  month: string;
  label: string;
  totalAmount: number;
  paidAmount: number;
  recipientsCount: number;
  paidCount: number;
  fullyPaid: boolean;
};

type RentManagementOverview = {
  property: {
    id: number;
    name: string;
    contractAddress: string | null;
    tokenNumber: number;
    tokenPrice: number;
    tokenDecimals: number;
    tokenizationStatus: string;
  };
  tokensSold: string | null;
  totalSupply: string | null;
  onChainError: string | null;
  months: RentManagementMonth[];
};

type RentManagementRecord = {
  id: number;
  status: PortfolioRevenueStatus;
  amount: number;
  txHash: string | null;
  paidAt: string | null;
  errorMessage: string | null;
  tokenAmount: string;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    walletAddress: string | null;
  };
};

type PayRentResult = {
  paid: number;
  failed: number;
  skipped: number;
  results: Array<{
    revenueId: number;
    userId: number;
    status: 'PAID' | 'FAILED' | 'SKIPPED';
    txHash?: string;
    reason?: string;
  }>;
};

type NoticeState = { tone: 'success' | 'error'; message: string } | null;

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

function userLabel(user: RentManagementRecord['user']): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.email;
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function PropertyRentManagement({ propertyId }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [overview, setOverview] = useState<RentManagementOverview | null>(null);
  const [records, setRecords] = useState<RentManagementRecord[] | null>(null);
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  async function redirectToSignin() {
    clearStoredSession();
    setSession(null);
    router.replace('/signin');
  }

  const loadOverview = useCallback(
    async (currentSession: AuthSession) => {
      const [propertyResponse, overviewResponse] = await Promise.all([
        requestJson<PropertyRecord>(`/property/manage/${propertyId}`, undefined, currentSession),
        requestJson<RentManagementOverview>(
          `/crypto/properties/${propertyId}/rent-management`,
          undefined,
          currentSession,
        ),
      ]);

      setProperty(propertyResponse);
      setOverview(overviewResponse);
    },
    [propertyId],
  );

  const loadMonthDetail = useCallback(
    async (currentSession: AuthSession, month: string) => {
      const detail = await requestJson<RentManagementRecord[]>(
        `/crypto/properties/${propertyId}/rent-management/${month}-01`,
        undefined,
        currentSession,
      );
      setRecords(detail);
    },
    [propertyId],
  );

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
        await loadOverview(currentSession);
        await loadMonthDetail(currentSession, monthValue);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
          await redirectToSignin();
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de charger la gestion des loyers.',
        );
      } finally {
        setLoading(false);
        setBooting(false);
      }
    },
    [loadOverview, loadMonthDetail, monthValue, propertyId, router],
  );

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    loadMonthDetail(session, monthValue)
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de charger le détail du mois.',
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthValue]);

  const monthSummary = useMemo(() => {
    if (!records) return { total: 0, paid: 0, remaining: 0, count: 0 };
    const total = records.reduce((sum, r) => sum + r.amount, 0);
    const paid = records.filter((r) => r.status === 'PAID').reduce((sum, r) => sum + r.amount, 0);
    return { total, paid, remaining: total - paid, count: records.length };
  }, [records]);

  async function handlePayMonth() {
    if (!session) return;

    if (
      !window.confirm(
        `Confirmer le versement crypto de tous les loyers projetés de ${monthValue} pour ce bien ? Cette action envoie une vraie transaction depuis la Trésorerie vers chaque détenteur.`,
      )
    ) {
      return;
    }

    setNotice(null);
    setPaying(true);

    try {
      const result = await requestJson<PayRentResult>(
        `/crypto/properties/${propertyId}/rent-management/pay`,
        {
          method: 'POST',
          body: JSON.stringify({ month: `${monthValue}-01` }),
        },
        session,
      );

      setNotice({
        tone: result.failed > 0 ? 'error' : 'success',
        message: `${result.paid} versement(s) confirmé(s) on-chain, ${result.failed} échec(s), ${result.skipped} ignoré(s) (wallet manquant).`,
      });

      await loadOverview(session);
      await loadMonthDetail(session, monthValue);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
        await redirectToSignin();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error ? requestError.message : 'Versement impossible.',
      });
    } finally {
      setPaying(false);
    }
  }

  const coverImage = resolveAssetUrl(property?.images[0]);

  if (booting) {
    return (
      <main className={baseStyles.shell}>
        <section className={baseStyles.surface}>
          <p className={baseStyles.loadingState}>Chargement de la gestion des loyers...</p>
        </section>
      </main>
    );
  }

  return (
    <main className={baseStyles.shell}>
      <section className={baseStyles.surface}>
        <header className={baseStyles.header}>
          <button
            type="button"
            className={baseStyles.backButton}
            onClick={() => router.push('/?panel=property')}
          >
            ← Retour aux actifs
          </button>
          <div className={baseStyles.headerActions}>
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
        {notice?.tone === 'success' && (
          <div className={baseStyles.noticeSuccess}>{notice.message}</div>
        )}
        {notice?.tone === 'error' && (
          <div className={baseStyles.noticeError}>{notice.message}</div>
        )}

        {property && overview ? (
          <>
            <section className={baseStyles.hero}>
              <div className={baseStyles.heroCopy}>
                <div className={baseStyles.eyebrow}>Pilotage des loyers</div>
                <h1 className={baseStyles.title}>{property.name}</h1>
                <div className={baseStyles.heroMeta}>
                  <span className={baseStyles.metaPill}>{property.localization}</span>
                  <span className={baseStyles.metaPill}>{property.tokenNumber} parts</span>
                </div>
                {overview.property.contractAddress && (
                  <a
                    href={buildExplorerAddressUrl(overview.property.contractAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className={baseStyles.explorerLink}
                  >
                    {shortenValue(overview.property.contractAddress)} ↗
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
                <div className={baseStyles.metricLabel}>Parts vendues</div>
                <div className={baseStyles.metricValue}>
                  {overview.tokensSold ?? '—'} / {overview.totalSupply ?? '—'}
                </div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Statut tokenisation</div>
                <div className={baseStyles.metricValue}>{overview.property.tokenizationStatus}</div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Projeté du mois</div>
                <div className={baseStyles.metricValue}>{formatEur(monthSummary.total)}</div>
              </article>
              <article className={baseStyles.metricCard}>
                <div className={baseStyles.metricLabel}>Reste à verser</div>
                <div className={monthSummary.remaining > 0 ? baseStyles.metricStateNegative : baseStyles.metricStatePositive}>
                  {formatEur(monthSummary.remaining)}
                </div>
              </article>
            </section>

            {overview.onChainError && (
              <div className={baseStyles.inlineWarning}>
                Lecture on-chain partielle : {overview.onChainError}
              </div>
            )}

            {overview.months.length > 0 && (
              <section className={baseStyles.panel}>
                <div className={baseStyles.panelHeader}>
                  <div>
                    <div className={baseStyles.panelEyebrow}>Historique</div>
                    <h2 className={baseStyles.panelTitle}>Mois avec loyers</h2>
                  </div>
                </div>
                <div className={styles.monthList}>
                  {overview.months.map((m) => {
                    const value = m.month.slice(0, 7);
                    return (
                      <button
                        key={m.month}
                        type="button"
                        className={`${styles.monthChip} ${value === monthValue ? styles.monthChipActive : ''} ${m.fullyPaid ? styles.monthChipPaid : ''}`}
                        onClick={() => setMonthValue(value)}
                      >
                        {m.label} — {formatEur(m.totalAmount)} {m.fullyPaid ? '✓' : `(${m.paidCount}/${m.recipientsCount})`}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className={baseStyles.panel}>
              <div className={baseStyles.panelHeader}>
                <div>
                  <div className={baseStyles.panelEyebrow}>Versement</div>
                  <h2 className={baseStyles.panelTitle}>Détail du mois sélectionné</h2>
                </div>
              </div>

              <div className={styles.monthBar}>
                <label className={styles.monthField}>
                  <span>Mois</span>
                  <input
                    type="month"
                    value={monthValue}
                    onChange={(e) => setMonthValue(e.target.value)}
                    className={styles.monthInput}
                  />
                </label>

                <div className={styles.monthSummary}>
                  <span>
                    Versé : <strong>{formatEur(monthSummary.paid)}</strong>
                  </span>
                  <span>
                    Bénéficiaires : <strong>{monthSummary.count}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.payButton}
                  onClick={() => void handlePayMonth()}
                  disabled={paying || monthSummary.remaining <= 0}
                >
                  {paying
                    ? 'Versement en cours…'
                    : `Verser en crypto (${formatEur(monthSummary.remaining)})`}
                </button>
              </div>

              {!records || records.length === 0 ? (
                <div className={baseStyles.emptyState}>
                  Aucun détenteur avec un loyer prévu pour ce mois.
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Détenteur</th>
                        <th>Parts</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id}>
                          <td>
                            {userLabel(record.user)}
                            {!record.user.walletAddress && (
                              <div className={styles.errorText}>Wallet manquant</div>
                            )}
                          </td>
                          <td>{record.tokenAmount}</td>
                          <td>{formatEur(record.amount)}</td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                record.status === 'PAID' ? styles.statusPaid : styles.statusProjected
                              }`}
                            >
                              {record.status === 'PAID' ? 'Payé' : 'Projeté'}
                            </span>
                            {record.errorMessage && (
                              <div className={styles.errorText}>{record.errorMessage}</div>
                            )}
                          </td>
                          <td>
                            {record.txHash ? (
                              <a
                                href={buildExplorerTransactionUrl(record.txHash)}
                                target="_blank"
                                rel="noreferrer"
                                className={baseStyles.explorerLink}
                              >
                                {shortenValue(record.txHash, 8)} ↗
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
