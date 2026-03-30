'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError, requestJson } from '@/src/lib/api';
import {
  buildExplorerAddressUrl,
  buildExplorerTransactionUrl,
} from '@/src/lib/explorer';
import { getOpportunityAvailabilityLabel, isOpportunityOpenForPurchase } from '@/src/lib/opportunities';
import type {
  AuthSession,
  ExecutePrimaryBuyResponse,
  PreparePrimaryBuyResponse,
  PropertyRecord,
} from '@/src/lib/types';
import {
  ensureExpectedWallet,
  ensureSupportedChain,
  signTypedData,
} from '@/src/lib/wallet';
import styles from './styles/client-purchase-panel.module.css';

type ClientPurchasePanelProps = {
  property: PropertyRecord;
  session: AuthSession | null;
  onPurchaseSuccess?: () => void;
};

type NoticeState = {
  tone: 'success' | 'error';
  message: string;
} | null;

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const eip712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const;

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export default function ClientPurchasePanel({
  property,
  session,
  onPurchaseSuccess,
}: ClientPurchasePanelProps) {
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [latestTxHash, setLatestTxHash] = useState<string | null>(null);
  const purchaseOpen = isOpportunityOpenForPurchase(property);
  const availabilityLabel = getOpportunityAvailabilityLabel(property);

  const total = useMemo(() => {
    const amount = Number(quantity);

    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    return Math.round(amount * property.tokenPrice);
  }, [property.tokenPrice, quantity]);

  async function handlePurchase() {
    if (!session) {
      setNotice({
        tone: 'error',
        message: 'Votre session a expiré. Reconnectez-vous pour continuer.',
      });
      return;
    }

    if (!session.user.walletAddress) {
      setNotice({
        tone: 'error',
        message: 'Ajoutez votre wallet principale dans Mon compte avant de signer un achat.',
      });
      return;
    }

    const amount = Number(quantity);

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({
        tone: 'error',
        message: 'Le nombre de parts doit être supérieur à zéro.',
      });
      return;
    }

    setLoading(true);
    setNotice(null);
    setLatestTxHash(null);

    try {
      await ensureSupportedChain();
      const account = await ensureExpectedWallet(session.user.walletAddress);
      const prepared = await requestJson<PreparePrimaryBuyResponse>(
        '/crypto/client/marketplace/prepare-buy',
        {
          method: 'POST',
          body: JSON.stringify({
            propertyId: property.id,
            amount: quantity,
            price: String(property.tokenPrice),
            currency: 'EUR',
            deadlineMinutes: 20,
          }),
        },
        session,
      );

      const signature = await signTypedData(account, {
        domain: prepared.domain,
        types: {
          EIP712Domain: [...eip712Domain],
          ...prepared.types,
        },
        primaryType: 'MarketplaceAction',
        message: prepared.message,
      });

      const execution = await requestJson<ExecutePrimaryBuyResponse>(
        '/crypto/client/marketplace/execute',
        {
          method: 'POST',
          body: JSON.stringify({
            requestId: prepared.requestId,
            signature,
          }),
        },
        session,
      );

      setNotice({
        tone: 'success',
        message: 'Achat confirmé et enregistré on-chain.',
      });
      setLatestTxHash(execution.txHash);
      onPurchaseSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        setNotice({
          tone: 'error',
          message: error.message,
        });
      } else {
        setNotice({
          tone: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Impossible de finaliser cet achat.',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Achat client</div>
          <h3 className={styles.title}>Souscrire des parts</h3>
          <p className={styles.copy}>
            Signature EIP-712 avec votre wallet, puis exécution par le backend depuis la trésorerie admin.
          </p>
        </div>
        <span className={purchaseOpen ? styles.statusActive : styles.statusInactive}>
          {availabilityLabel}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Prix unitaire</span>
          <strong className={styles.metricValue}>{formatCurrency(property.tokenPrice)}</strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Wallet profil</span>
          <strong className={styles.metricValueSmall}>
            {session?.user.walletAddress ?? 'Non renseignée'}
          </strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Contrat actif</span>
          <strong className={styles.metricValueSmall}>
            {property.contractAddress ?? 'Non déployé'}
          </strong>
        </div>
      </div>

      <div className={styles.formBlock}>
        <label className={styles.label} htmlFor="purchase-quantity">
          Nombre de parts
        </label>
        <input
          id="purchase-quantity"
          className={styles.input}
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          disabled={loading || !purchaseOpen}
        />

        <div className={styles.totalCard}>
          <span className={styles.metricLabel}>Montant estimé</span>
          <strong className={styles.metricValue}>{formatCurrency(total)}</strong>
        </div>

        {!session?.user.walletAddress ? (
          <div className={styles.inlineWarning}>
            Votre profil n’a pas encore de wallet rattachée. Renseignez-la dans
            <Link href="/?panel=user" className={styles.inlineLink}>
              Mon compte
            </Link>
            .
          </div>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={purchaseOpen ? styles.primaryButton : styles.disabledButton}
            onClick={() => void handlePurchase()}
            disabled={loading || !purchaseOpen}
          >
            {loading ? 'Signature en cours...' : 'Acheter maintenant'}
          </button>

          <Link href="/?panel=property" className={styles.secondaryLink}>
            Voir mon portefeuille
          </Link>
          {property.contractAddress ? (
            <a
              href={buildExplorerAddressUrl(property.contractAddress)}
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryLink}
            >
              Voir le contrat
            </a>
          ) : null}
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
      </div>

      {notice?.tone === 'success' ? (
        <div className={styles.noticeSuccess}>
          <span>{notice.message}</span>
          {latestTxHash ? (
            <a
              href={buildExplorerTransactionUrl(latestTxHash)}
              target="_blank"
              rel="noreferrer"
              className={styles.noticeLink}
            >
              Voir la transaction
            </a>
          ) : null}
        </div>
      ) : null}
      {notice?.tone === 'error' ? (
        <div className={styles.noticeError}>{notice.message}</div>
      ) : null}
    </section>
  );
}
