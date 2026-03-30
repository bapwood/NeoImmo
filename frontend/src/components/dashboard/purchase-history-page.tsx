'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, requestJson, resolveAssetUrl } from '@/src/lib/api';
import { readStoredSession } from '@/src/lib/auth';
import {
  buildExplorerAddressUrl,
  buildExplorerTransactionUrl,
} from '@/src/lib/explorer';
import type { AuthSession, PurchaseHistoryRecord } from '@/src/lib/types';
import styles from './styles/purchase-history-page.module.css';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function PurchaseHistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [history, setHistory] = useState<PurchaseHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        router.replace('/signin');
        return;
      }

      if (storedSession.user.role !== 'CLIENT') {
        router.replace('/');
        return;
      }

      setSession(storedSession);

      try {
        const historyItems = await requestJson<PurchaseHistoryRecord[]>(
          '/portfolio/me/history',
          undefined,
          storedSession,
        );

        if (!cancelled) {
          setHistory(historyItems);
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
          router.replace('/signin');
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de charger l’historique des achats.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className={styles.shell}>
      <section className={styles.surface}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Portefeuille client</div>
            <h1 className={styles.title}>Historique d’achat</h1>
            <p className={styles.copy}>
              Suivez chaque souscription confirmée, le montant investi, le contrat associé et la wallet destinataire.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/?panel=property" className={styles.secondaryLink}>
              Retour au portefeuille
            </Link>
            {session?.user.walletAddress ? (
              <a
                href={buildExplorerAddressUrl(session.user.walletAddress)}
                target="_blank"
                rel="noreferrer"
                className={styles.secondaryLink}
              >
                Voir l’adresse wallet
              </a>
            ) : null}
          </div>
        </header>

        {loading ? <div className={styles.emptyState}>Chargement de l’historique...</div> : null}
        {!loading && error ? <div className={styles.emptyState}>{error}</div> : null}
        {!loading && !error && history.length === 0 ? (
          <div className={styles.emptyState}>
            Aucun achat confirmé n’a encore été enregistré sur ce compte.
          </div>
        ) : null}

        {!loading && !error && history.length > 0 ? (
          <div className={styles.historyList}>
            {history.map((entry) => {
              const coverImage = resolveAssetUrl(entry.property.images[0]);

              return (
                <article key={entry.id} className={styles.historyCard}>
                  <div
                    className={coverImage ? styles.media : styles.mediaPlaceholder}
                    style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
                  />

                  <div className={styles.body}>
                    <div className={styles.topRow}>
                      <div>
                        <h2 className={styles.cardTitle}>{entry.property.name}</h2>
                        <p className={styles.cardMeta}>
                          {entry.property.localization} · {formatDate(entry.purchasedAt)}
                        </p>
                      </div>
                      <strong className={styles.totalPrice}>
                        {formatCurrency(entry.totalPrice)}
                      </strong>
                    </div>

                    <div className={styles.metricGrid}>
                      <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Parts</span>
                        <strong>{entry.amount}</strong>
                      </div>
                      <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Prix unitaire</span>
                        <strong>{formatCurrency(entry.unitPrice)}</strong>
                      </div>
                      <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Devise</span>
                        <strong>{entry.currency}</strong>
                      </div>
                      <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Tx hash</span>
                        <strong className={styles.hashText}>{entry.txHash}</strong>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <Link
                        href={`/opportunites/${entry.property.id}`}
                        className={styles.secondaryLink}
                      >
                        Voir l’actif
                      </Link>
                      <a
                        href={buildExplorerTransactionUrl(entry.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.secondaryLink}
                      >
                        Voir la transaction
                      </a>
                      {entry.property.contractAddress ? (
                        <a
                          href={buildExplorerAddressUrl(entry.property.contractAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.secondaryLink}
                        >
                          Voir le contrat
                        </a>
                      ) : null}
                      {entry.toWallet ? (
                        <a
                          href={buildExplorerAddressUrl(entry.toWallet)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.secondaryLink}
                        >
                          Voir l’adresse wallet
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
