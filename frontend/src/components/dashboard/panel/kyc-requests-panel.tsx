'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError, requestJson } from '@/src/lib/api';
import type { AuthSession, UserRecord } from '@/src/lib/types';
import {
  getClientProfileCompletion,
  getClientProfileCompletionTotal,
  summarizeName,
} from './utils';
import type { Notice } from './types';
import styles from './styles/kyc-requests-panel.module.css';

type Props = {
  session: AuthSession;
  users: UserRecord[];
  onReloadResource: () => void;
};

function shortenValue(value: string | null | undefined, visible = 6) {
  if (!value) return '—';
  if (value.length <= visible * 2 + 3) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

export default function DashboardKycRequestsPanel({ session, users, onReloadResource }: Props) {
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const pendingClients = useMemo(() => {
    const completionTotal = getClientProfileCompletionTotal();

    return users
      .filter(
        (user) =>
          user.role === 'CLIENT' &&
          user.walletStatus !== 'VERIFIED' &&
          getClientProfileCompletion(user) === completionTotal,
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [users]);

  async function handleValidate(user: UserRecord) {
    setSyncingId(user.id);
    setNotice(null);

    try {
      await requestJson(`/crypto/users/${user.id}/kyc/sync`, { method: 'POST' }, session);
      setNotice({ tone: 'success', message: `KYC validé pour ${summarizeName(user)}.` });
      onReloadResource();
    } catch (error) {
      setNotice({
        tone: 'error',
        message:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Validation KYC impossible.',
      });
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Conformité</div>
          <h2 className={styles.title}>Demandes KYC</h2>
          <p className={styles.subtitle}>
            Clients avec un profil complet, en attente de validation avant de pouvoir acheter des parts.
          </p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onReloadResource}>
          Actualiser
        </button>
      </div>

      {notice?.tone === 'error' ? <div className={styles.errorBanner}>{notice.message}</div> : null}

      {pendingClients.length === 0 ? (
        <div className={styles.empty}>Aucune demande en attente pour le moment.</div>
      ) : (
        <>
          <div className={styles.summaryBar}>
            <span>
              <strong>{pendingClients.length}</strong> client(s) en attente de validation
            </span>
            {notice?.tone === 'success' ? (
              <span className={styles.successText}>{notice.message}</span>
            ) : null}
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Wallet</th>
                  <th>Pays</th>
                  <th>En attente depuis</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClients.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{summarizeName(user)}</strong>
                      <div className={styles.email}>{user.email}</div>
                    </td>
                    <td className={styles.mono}>{shortenValue(user.walletAddress)}</td>
                    <td>{user.countryCode ?? '—'}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/utilisateurs/${user.id}`} className={styles.tableLink}>
                          Voir le profil
                        </Link>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => void handleValidate(user)}
                          disabled={syncingId === user.id}
                        >
                          {syncingId === user.id ? 'Validation...' : 'Valider le KYC'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
