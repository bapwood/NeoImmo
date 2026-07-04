'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, requestJson } from '@/src/lib/api';
import { buildExplorerTransactionUrl } from '@/src/lib/explorer';
import type { AuthSession, PortfolioRevenueStatus, PropertyRecord } from '@/src/lib/types';
import styles from './styles/rents-panel.module.css';

type AdminRevenueRecord = {
  id: number;
  month: string;
  monthLabel: string;
  amount: number;
  status: PortfolioRevenueStatus;
  label: string | null;
  txHash: string | null;
  paidAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  property: {
    id: number;
    name: string;
    contractAddress: string | null;
  };
};

type AdminRevenueResponse = {
  summary: { paid: number; projected: number };
  records: AdminRevenueRecord[];
};

type Props = {
  session: AuthSession;
  properties: PropertyRecord[];
};

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function shortenValue(value: string | null | undefined, visible = 6) {
  if (!value) return '—';
  if (value.length <= visible * 2 + 3) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function userLabel(user: AdminRevenueRecord['user']): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.email;
}

export default function RentsPanel({ session, properties }: Props) {
  const router = useRouter();
  const [monthFilter, setMonthFilter] = useState(currentMonthValue());
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PortfolioRevenueStatus>('all');
  const [data, setData] = useState<AdminRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (monthFilter) params.set('month', `${monthFilter}-01`);
    if (propertyFilter !== 'all') params.set('propertyId', propertyFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    try {
      const result = await requestJson<AdminRevenueResponse>(
        `/portfolio/admin/revenues?${params.toString()}`,
        undefined,
        session,
      );
      setData(result);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Impossible de charger les loyers.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, monthFilter, propertyFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const propertyGroups = useMemo(() => {
    if (!data) return [];

    const groups = new Map<
      number,
      {
        propertyId: number;
        propertyName: string;
        total: number;
        paid: number;
        recipients: number;
        recipientsPaid: number;
      }
    >();

    for (const record of data.records) {
      const group = groups.get(record.property.id) ?? {
        propertyId: record.property.id,
        propertyName: record.property.name,
        total: 0,
        paid: 0,
        recipients: 0,
        recipientsPaid: 0,
      };

      group.total += record.amount;
      group.recipients += 1;

      if (record.status === 'PAID') {
        group.paid += record.amount;
        group.recipientsPaid += 1;
      }

      groups.set(record.property.id, group);
    }

    return [...groups.values()].sort((left, right) => {
      const leftRemaining = left.total - left.paid;
      const rightRemaining = right.total - right.paid;
      return rightRemaining - leftRemaining;
    });
  }, [data]);

  const propertiesWithOutstanding = propertyGroups.filter((group) => group.paid < group.total);

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Administration</div>
          <h2 className={styles.title}>{"Loyers — que reste-t-il à payer ?"}</h2>
          <p className={styles.subtitle}>
            Loyers versés en cryptomonnaie, proportionnellement aux parts détenues par chaque client.
            Le tableau ci-dessous regroupe le reste à verser bien par bien pour le mois sélectionné —
            ouvrez un bien pour déclencher le versement réel.
          </p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      <section className={styles.filters}>
        <label className={styles.filterField}>
          <span>Mois</span>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={styles.filterInput}
          />
        </label>

        <label className={styles.filterField}>
          <span>Bien</span>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className={styles.filterInput}
          >
            <option value="all">Tous les biens</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span>Statut</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | PortfolioRevenueStatus)}
            className={styles.filterInput}
          >
            <option value="all">Tous</option>
            <option value="PROJECTED">Projeté</option>
            <option value="PAID">Payé</option>
          </select>
        </label>
      </section>

      {loading ? (
        <div className={styles.empty}>Chargement des loyers…</div>
      ) : error || !data ? (
        <div className={styles.stack}>
          <div className={styles.errorBanner}>{error ?? 'Données indisponibles.'}</div>
          <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <section className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span>Versé (sélection)</span>
              <strong className={styles.positive}>{formatEur(data.summary.paid)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Reste à verser (sélection)</span>
              <strong className={data.summary.projected > 0 ? styles.warning : styles.positive}>
                {formatEur(data.summary.projected)}
              </strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Versements listés</span>
              <strong>{data.records.length}</strong>
            </div>
          </section>

          {propertiesWithOutstanding.length > 0 ? (
            <div className={styles.actionBanner}>
              <strong>
                {propertiesWithOutstanding.length} bien(s) ont des loyers en attente pour {monthFilter}.
              </strong>
              <span>Consultez la liste ci-dessous et ouvrez chaque bien pour déclencher le versement.</span>
            </div>
          ) : propertyGroups.length > 0 ? (
            <div className={styles.successBanner}>
              Tous les loyers de la sélection actuelle sont versés. Aucune action requise.
            </div>
          ) : null}

          <section>
            <div className={styles.sectionTitle}>Ce qu&apos;il reste à payer, bien par bien</div>
            {propertyGroups.length === 0 ? (
              <div className={styles.empty}>Aucun loyer pour ces filtres.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Bien</th>
                      <th>Total projeté</th>
                      <th>Versé</th>
                      <th>Reste à verser</th>
                      <th>Bénéficiaires</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propertyGroups.map((group) => {
                      const remaining = group.total - group.paid;
                      const fullyPaid = remaining <= 0;

                      return (
                        <tr key={group.propertyId}>
                          <td>{group.propertyName}</td>
                          <td>{formatEur(group.total)}</td>
                          <td>{formatEur(group.paid)}</td>
                          <td className={remaining > 0 ? styles.warning : styles.positive}>
                            {formatEur(remaining)}
                          </td>
                          <td>
                            {group.recipientsPaid}/{group.recipients}
                          </td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                fullyPaid ? styles.statusPaid : styles.statusProjected
                              }`}
                            >
                              {fullyPaid ? 'Complet' : 'En attente'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.toggleButton}
                              onClick={() => router.push(`/actifs/${group.propertyId}/loyers`)}
                            >
                              {fullyPaid ? 'Voir' : 'Verser maintenant'} →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className={styles.sectionTitle}>Détail par client</div>
            {data.records.length === 0 ? (
              <div className={styles.empty}>Aucun versement de loyer pour ces filtres.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mois</th>
                      <th>Bien</th>
                      <th>Client</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Transaction</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((record) => (
                      <tr key={record.id}>
                        <td>{record.monthLabel}</td>
                        <td>{record.property.name}</td>
                        <td>{userLabel(record.user)}</td>
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
                            <div className={styles.warning}>{record.errorMessage}</div>
                          )}
                        </td>
                        <td>
                          {record.txHash ? (
                            <a
                              href={buildExplorerTransactionUrl(record.txHash)}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.explorerLink}
                            >
                              {shortenValue(record.txHash)} ↗
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.toggleButton}
                            onClick={() => router.push(`/actifs/${record.property.id}/loyers`)}
                          >
                            Gérer ce bien →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
