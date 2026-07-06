'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, requestJson } from '@/src/lib/api';
import { buildExplorerTransactionUrl } from '@/src/lib/explorer';
import type {
  AuthSession,
  BlockchainOperationListResponse,
  BlockchainOperationRecord,
  BlockchainOperationStatus,
  BlockchainOperationType,
  PropertyRecord,
  UserRecord,
} from '@/src/lib/types';
import styles from './styles/transactions-panel.module.css';

type Props = {
  session: AuthSession;
  properties: PropertyRecord[];
  users: UserRecord[];
};

const PAGE_SIZE = 25;

const typeLabels: Record<BlockchainOperationType, string> = {
  SYNC_WALLET_KYC: 'Synchronisation KYC',
  SET_BLOCKLIST: 'Blocklist wallet',
  SET_BLOCKED_COUNTRY: 'Pays bloqué',
  DEPLOY_PROPERTY: 'Déploiement bien',
  MINT_PROPERTY: 'Mint inventaire',
  PREPARE_PRIMARY_BUY: 'Préparation achat',
  EXECUTE_PRIMARY_BUY: 'Exécution achat',
  RENT_PAYOUT: 'Versement de loyer',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shortenValue(value: string | null | undefined, visible = 6) {
  if (!value) return '—';
  if (value.length <= visible * 2 + 3) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function userLabel(user: BlockchainOperationRecord['user']) {
  if (!user) return '—';
  return user.email;
}

function statusClassName(status: BlockchainOperationStatus) {
  if (status === 'CONFIRMED') return styles.statusConfirmed;
  if (status === 'FAILED' || status === 'CANCELLED') return styles.statusFailed;
  return styles.statusPending;
}

function formatAmount(record: BlockchainOperationRecord) {
  if (record.type === 'RENT_PAYOUT' && record.amount) {
    const cents = Number(record.amount);
    return Number.isFinite(cents)
      ? `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
      : record.amount;
  }

  if (record.amount && record.price) {
    return `${record.amount} × ${record.price} ${record.currency ?? ''}`.trim();
  }

  return record.amount ?? '—';
}

export default function TransactionsPanel({ session, properties, users }: Props) {
  const [typeFilter, setTypeFilter] = useState<'all' | BlockchainOperationType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | BlockchainOperationStatus>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [items, setItems] = useState<BlockchainOperationRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildParams = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (propertyFilter !== 'all') params.set('propertyId', propertyFilter);
      if (userFilter !== 'all') params.set('userId', userFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      return params;
    },
    [typeFilter, statusFilter, propertyFilter, userFilter],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await requestJson<BlockchainOperationListResponse>(
        `/crypto/operations?${buildParams(0).toString()}`,
        undefined,
        session,
      );
      setItems(result.items);
      setCount(result.count);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Impossible de charger les transactions.',
      );
    } finally {
      setLoading(false);
    }
  }, [buildParams, session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLoadMore() {
    setLoadingMore(true);

    try {
      const result = await requestJson<BlockchainOperationListResponse>(
        `/crypto/operations?${buildParams(items.length).toString()}`,
        undefined,
        session,
      );
      setItems((current) => [...current, ...result.items]);
      setCount(result.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger la suite.');
    } finally {
      setLoadingMore(false);
    }
  }

  function handleReset() {
    setTypeFilter('all');
    setStatusFilter('all');
    setPropertyFilter('all');
    setUserFilter('all');
  }

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Administration</div>
          <h2 className={styles.title}>Transactions</h2>
          <p className={styles.subtitle}>Déploiements, achats, loyers, conformité.</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      <section className={styles.filters}>
        <label className={styles.filterField}>
          <span>Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | BlockchainOperationType)}
            className={styles.filterInput}
          >
            <option value="all">Tous les types</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span>Statut</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | BlockchainOperationStatus)}
            className={styles.filterInput}
          >
            <option value="all">Tous</option>
            <option value="PREPARED">Préparée</option>
            <option value="SUBMITTED">Soumise</option>
            <option value="CONFIRMED">Confirmée</option>
            <option value="FAILED">Échouée</option>
            <option value="CANCELLED">Annulée</option>
          </select>
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
          <span>Client</span>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className={styles.filterInput}
          >
            <option value="all">Tous les clients</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className={styles.resetButton} onClick={handleReset}>
          Réinitialiser
        </button>
      </section>

      {loading ? (
        <div className={styles.empty}>Chargement des transactions…</div>
      ) : error ? (
        <div className={styles.stack}>
          <div className={styles.errorBanner}>{error}</div>
          <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Aucune transaction pour ces filtres.</div>
      ) : (
        <>
          <div className={styles.summaryBar}>
            <span>
              <strong>{items.length}</strong> affichée(s) sur <strong>{count}</strong>
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Bien</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>De</th>
                  <th>Vers</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {items.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.updatedAt)}</td>
                    <td>
                      <span className={styles.typeBadge}>{typeLabels[record.type] ?? record.type}</span>
                    </td>
                    <td>{record.property?.name ?? '—'}</td>
                    <td>{userLabel(record.user)}</td>
                    <td>{formatAmount(record)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusClassName(record.status)}`}>
                        {record.status}
                      </span>
                      {record.errorMessage && (
                        <div className={styles.errorText}>{record.errorMessage}</div>
                      )}
                    </td>
                    <td>{shortenValue(record.fromWallet)}</td>
                    <td>{shortenValue(record.toWallet)}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length < count && (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? 'Chargement…' : `Charger plus (${count - items.length} restantes)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
