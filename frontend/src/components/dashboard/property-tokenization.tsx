'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, requestJson, resolveAssetUrl } from '@/src/lib/api';
import { clearStoredSession, readStoredSession } from '@/src/lib/auth';
import {
  buildExplorerAddressUrl,
  buildExplorerTransactionUrl,
} from '@/src/lib/explorer';
import type {
  AuthSession,
  BlockchainOperationRecord,
  ExecutePropertyDeployResponse,
  PreparePropertyDeployResponse,
  PropertyRecord,
  PropertyTokenState,
  TokenizationStatus,
} from '@/src/lib/types';
import {
  ensureSupportedChain,
  requestWalletAccounts,
  sendNativeTransaction,
  signTypedData,
  waitForTransactionReceipt,
} from '@/src/lib/wallet';
import styles from './styles/property-tokenization.module.css';

type PropertyTokenizationProps = {
  propertyId: number;
};

type NoticeState = {
  tone: 'success' | 'error';
  message: string;
} | null;

const eip712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const;

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shortenValue(value: string | null | undefined, visible = 8) {
  if (!value) {
    return '—';
  }

  if (value.length <= visible * 2 + 3) {
    return value;
  }

  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function safeBigInt(value: string | null | undefined) {
  if (!value) {
    return BigInt(0);
  }

  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function formatTokenUnits(value: string | null | undefined, decimals: number) {
  if (!value) {
    return '—';
  }

  const raw = safeBigInt(value);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fractionText}`;
}

function formatNativeBalance(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  const raw = safeBigInt(value);
  const base = BigInt(10) ** BigInt(18);
  const whole = raw / base;
  const fraction = raw % base;
  const fractionText = fraction
    .toString()
    .padStart(18, '0')
    .slice(0, 4)
    .replace(/0+$/, '');

  if (!fractionText) {
    return `${whole.toString()} ETH`;
  }

  return `${whole.toString()}.${fractionText} ETH`;
}

function getStatusLabel(status: TokenizationStatus | null | undefined) {
  switch (status) {
    case 'ACTIVE':
      return 'Tokenisé et actif';
    case 'DEPLOYED':
      return 'Déployé, mint en attente';
    case 'PAUSED':
      return 'En pause';
    case 'ARCHIVED':
      return 'Archivé';
    case 'DRAFT':
    default:
      return 'Non tokenisé';
  }
}

function getOperationLabel(type: BlockchainOperationRecord['type']) {
  switch (type) {
    case 'DEPLOY_PROPERTY':
      return 'Déploiement';
    case 'MINT_PROPERTY':
      return 'Mint inventaire';
    case 'PREPARE_PRIMARY_BUY':
      return 'Préparation achat';
    case 'EXECUTE_PRIMARY_BUY':
      return 'Exécution achat';
    case 'SYNC_WALLET_KYC':
      return 'Sync KYC';
    case 'SET_BLOCKLIST':
      return 'Blocklist wallet';
    case 'SET_BLOCKED_COUNTRY':
      return 'Pays bloqué';
    default:
      return type;
  }
}

export default function PropertyTokenization({
  propertyId,
}: PropertyTokenizationProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [tokenState, setTokenState] = useState<PropertyTokenState | null>(null);
  const [mintAmount, setMintAmount] = useState('');
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [latestFundingTxHash, setLatestFundingTxHash] = useState<string | null>(null);

  async function redirectToSignin() {
    clearStoredSession();
    setSession(null);
    router.replace('/signin');
  }

  async function loadView(explicitSession?: AuthSession | null) {
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
      const [propertyResponse, tokenStateResponse] = await Promise.all([
        requestJson<PropertyRecord>(`/property/manage/${propertyId}`, undefined, currentSession),
        requestJson<PropertyTokenState>(
          `/crypto/properties/${propertyId}/state`,
          undefined,
          currentSession,
        ),
      ]);

      setProperty(propertyResponse);
      setTokenState(tokenStateResponse);
      setMintAmount((currentValue) =>
        currentValue.trim().length > 0
          ? currentValue
          : String(tokenStateResponse.property.tokenNumber),
      );
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
        await redirectToSignin();
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Impossible de charger la tokenisation de ce bien.',
      );
    } finally {
      setLoading(false);
      setBooting(false);
    }
  }

  useEffect(() => {
    void loadView();
  }, [propertyId]);

  async function handleDeploy() {
    if (!session) {
      return;
    }

    setNotice(null);
    setLoading(true);

    try {
      await ensureSupportedChain();
      const accounts = await requestWalletAccounts();
      const account = accounts[0];
      const prepared = await requestJson<PreparePropertyDeployResponse>(
        `/crypto/properties/${propertyId}/deploy/prepare`,
        {
          method: 'POST',
          body: JSON.stringify({
            adminWalletAddress: account,
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
        primaryType: 'AdminPropertyAction',
        message: prepared.message,
      });
      await requestJson<ExecutePropertyDeployResponse>(
        `/crypto/properties/${propertyId}/deploy/execute`,
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
        message: 'Le contrat du bien a été déployé après validation de la wallet admin.',
      });
      await loadView(session);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
        await redirectToSignin();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Déploiement impossible.',
      });
      setLoading(false);
    }
  }

  async function handleMint() {
    if (!session) {
      return;
    }

    setNotice(null);
    setLoading(true);

    try {
      const amount = mintAmount.trim();
      const payload = amount ? { amount } : {};

      await requestJson(
        `/crypto/properties/${propertyId}/mint`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        session,
      );

      setNotice({
        tone: 'success',
        message: 'L’inventaire primaire a bien été minté sur la trésorerie admin.',
      });
      await loadView(session);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
        await redirectToSignin();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error ? requestError.message : 'Mint impossible.',
      });
      setLoading(false);
    }
  }

  async function handleFundBackendWallet() {
    if (!session) {
      return;
    }

    const fundingSnapshot = tokenState?.onChain.funding;
    const backendWalletAddress =
      fundingSnapshot?.backendWalletAddress ||
      tokenState?.property.backendOperatorWalletAddress;
    const shortfallWei = safeBigInt(fundingSnapshot?.shortfallWei);

    if (!backendWalletAddress) {
      setNotice({
        tone: 'error',
        message: 'La wallet backend opérateur est indisponible pour ce financement.',
      });
      return;
    }

    if (shortfallWei <= BigInt(0)) {
      setNotice({
        tone: 'success',
        message: 'La wallet backend dispose déjà du solde nécessaire au déploiement.',
      });
      return;
    }

    setNotice(null);
    setLatestFundingTxHash(null);
    setLoading(true);

    try {
      await ensureSupportedChain();
      const accounts = await requestWalletAccounts();
      const account = accounts[0];
      const txHash = await sendNativeTransaction({
        from: account,
        to: backendWalletAddress,
        valueWei: shortfallWei,
      });

      await waitForTransactionReceipt(txHash);
      setLatestFundingTxHash(txHash);
      setNotice({
        tone: 'success',
        message:
          'Le financement de la wallet backend a été confirmé. Vous pouvez maintenant lancer le déploiement.',
      });
      await loadView(session);
    } catch (requestError) {
      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Financement du backend impossible.',
      });
      setLoading(false);
    }
  }

  async function handlePurchaseAvailabilityChange(available: boolean) {
    if (!session) {
      return;
    }

    setNotice(null);
    setLoading(true);

    try {
      await requestJson(
        `/crypto/properties/${propertyId}/purchase-availability`,
        {
          method: 'POST',
          body: JSON.stringify({ available }),
        },
        session,
      );

      setNotice({
        tone: 'success',
        message: available
          ? 'Le bien a été remis à l’achat client.'
          : 'Le bien a été retiré de l’achat client.',
      });
      await loadView(session);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
        await redirectToSignin();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de modifier la disponibilité achat.',
      });
      setLoading(false);
    }
  }

  const propertyRecord = tokenState?.property ?? null;
  const onChainSnapshot = tokenState?.onChain ?? null;
  const latestOperations = tokenState?.latestOperations ?? [];
  const fundingSnapshot = onChainSnapshot?.funding ?? null;
  const decimals = propertyRecord?.tokenDecimals ?? property?.tokenDecimals ?? 18;
  const totalSupplyRaw = safeBigInt(onChainSnapshot?.totalSupply);
  const treasuryBalanceRaw = safeBigInt(onChainSnapshot?.treasuryBalance);
  const soldRaw =
    totalSupplyRaw > treasuryBalanceRaw
      ? totalSupplyRaw - treasuryBalanceRaw
      : BigInt(0);
  const deploymentReady = Boolean(propertyRecord?.contractAddress);
  const tokenizedAndActive =
    propertyRecord?.tokenizationStatus === 'ACTIVE' && deploymentReady;
  const purchasePaused = propertyRecord?.tokenizationStatus === 'PAUSED' && deploymentReady;
  const purchaseAvailable =
    Boolean(onChainSnapshot?.available) &&
    Boolean(onChainSnapshot?.deployed) &&
    tokenizedAndActive &&
    treasuryBalanceRaw > BigInt(0);
  const soldRatio =
    totalSupplyRaw > BigInt(0)
      ? Number((soldRaw * BigInt(10000)) / totalSupplyRaw) / 100
      : 0;
  const primaryValue =
    (property?.tokenNumber ?? propertyRecord?.tokenNumber ?? 0) *
    (property?.tokenPrice ?? propertyRecord?.tokenPrice ?? 0);
  const coverImage = resolveAssetUrl(property?.images[0]);
  const backendWalletAddress =
    propertyRecord?.backendOperatorWalletAddress ?? fundingSnapshot?.backendWalletAddress ?? null;
  const fundingReady = fundingSnapshot?.ready ?? false;

  if (booting) {
    return (
      <main className={styles.shell}>
        <section className={styles.surface}>
          <p className={styles.loadingState}>Chargement de la tokenisation...</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <section className={styles.surface}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push('/?panel=property')}
          >
            Retour aux actifs
          </button>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.push(`/actifs/${propertyId}/modifier`)}
            >
              Modifier le bien
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void loadView(session)}
              disabled={loading}
            >
              Actualiser
            </button>
          </div>
        </header>

        {error ? <div className={styles.noticeError}>{error}</div> : null}
        {notice?.tone === 'success' ? (
          <div className={styles.noticeSuccess}>{notice.message}</div>
        ) : null}
        {notice?.tone === 'error' ? (
          <div className={styles.noticeError}>{notice.message}</div>
        ) : null}

        {property && propertyRecord && onChainSnapshot ? (
          <>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <div className={styles.eyebrow}>Tokenisation de l’actif</div>
                <h1 className={styles.title}>{property.name}</h1>
                <p className={styles.description}>{property.description}</p>

                <div className={styles.heroMeta}>
                  <span className={styles.metaPill}>{property.localization}</span>
                  <span className={styles.metaPill}>{property.livingArea}</span>
                  <span className={styles.metaPill}>{property.roomNumber} pièces</span>
                  <span className={styles.metaPill}>{property.bathroomNumber} sdb</span>
                </div>

                <div className={styles.statusRow}>
                  <span
                    className={
                      tokenizedAndActive
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive
                    }
                  >
                    {getStatusLabel(propertyRecord.tokenizationStatus)}
                  </span>
                  <span className={styles.scorePill}>Score {property.score}/100</span>
                </div>
              </div>

              <div className={styles.heroVisual}>
                {coverImage ? (
                  <div
                    className={styles.imageFrame}
                    style={{ backgroundImage: `url(${coverImage})` }}
                  />
                ) : (
                  <div className={styles.imageFallback}>Aucune image enregistrée</div>
                )}
              </div>
            </section>

            <section className={styles.metricsGrid}>
              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Découpage</div>
                <div className={styles.metricValue}>{propertyRecord.tokenNumber} parts</div>
                <p className={styles.metricCopy}>
                  Nombre total de divisions prévues pour cet actif.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Prix par token</div>
                <div className={styles.metricValue}>
                  {formatCurrency(propertyRecord.tokenPrice)}
                </div>
                <p className={styles.metricCopy}>
                  Prix nominal utilisé pour la vente primaire.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Achat client</div>
                <div
                  className={
                    purchaseAvailable ? styles.metricStatePositive : styles.metricStateNegative
                  }
                >
                  {purchaseAvailable ? 'Ouvert à l’achat' : 'Fermé à l’achat'}
                </div>
                <p className={styles.metricCopy}>
                  Status du contract.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Parts déjà vendues</div>
                <div className={styles.metricValue}>
                  {formatTokenUnits(soldRaw.toString(), decimals)}
                </div>
                <p className={styles.metricCopy}>
                  Soit {percentFormatter.format(soldRatio)}% du supply déjà sorti de la trésorerie.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Parts restantes</div>
                <div className={styles.metricValue}>
                  {formatTokenUnits(onChainSnapshot.treasuryBalance, decimals)}
                </div>
                <p className={styles.metricCopy}>
                  Solde encore disponible sur la wallet de trésorerie admin.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Valeur primaire totale</div>
                <div className={styles.metricValue}>{formatCurrency(primaryValue)}</div>
                <p className={styles.metricCopy}>
                  Valorisation nominale si l’ensemble des parts est placé au prix actuel.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Supply on-chain</div>
                <div className={styles.metricValue}>
                  {formatTokenUnits(onChainSnapshot.totalSupply, decimals)}
                </div>
                <p className={styles.metricCopy}>
                  Montant ERC-20 minté, converti avec {decimals} décimales.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Revenu moyen / token</div>
                <div className={styles.metricValue}>À renseigner</div>
                <p className={styles.metricCopy}>
                  Ce KPI pourra être alimenté quand le module loyers et rendement sera branché.
                </p>
              </article>
            </section>

            <section className={styles.contentGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.panelEyebrow}>Actions</div>
                    <h2 className={styles.panelTitle}>Pilotage on-chain</h2>
                  </div>
                </div>

                <div className={styles.actionBlock}>
                  <div className={styles.actionCopy}>
                    <h3 className={styles.actionTitle}>Financer la wallet backend</h3>
                    <p className={styles.actionText}>
                      Avant le déploiement, la wallet administrateur connectée envoie le gas nécessaire vers la wallet backend opérateur.
                    </p>
                    <p className={styles.actionText}>
                      Backend: {backendWalletAddress ? shortenValue(backendWalletAddress) : '—'} |
                      Solde actuel: {formatNativeBalance(fundingSnapshot?.backendBalanceWei)} |
                      Manque: {formatNativeBalance(fundingSnapshot?.shortfallWei)}
                    </p>
                  </div>

                  <div className={styles.actionButtons}>
                    <button
                      type="button"
                      className={fundingReady ? styles.disabledButton : styles.primaryButton}
                      onClick={() => void handleFundBackendWallet()}
                      disabled={loading || fundingReady || !backendWalletAddress}
                    >
                      {fundingReady ? 'Backend déjà financée' : 'Financer la wallet backend'}
                    </button>
                    {latestFundingTxHash ? (
                      <a
                        href={buildExplorerTransactionUrl(latestFundingTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.secondaryButton}
                      >
                        Voir la transaction
                      </a>
                    ) : null}
                  </div>

                  {fundingSnapshot?.error ? (
                    <div className={styles.inlineWarning}>
                      Estimation du financement indisponible: {fundingSnapshot.error}
                    </div>
                  ) : null}
                </div>

                <div className={styles.actionBlock}>
                  <div className={styles.actionCopy}>
                    <h3 className={styles.actionTitle}>Déployer le contrat</h3>
                  </div>
                  <button
                    type="button"
                    className={
                      deploymentReady || !fundingReady
                        ? styles.disabledButton
                        : styles.primaryButton
                    }
                    onClick={() => void handleDeploy()}
                    disabled={loading || deploymentReady || !fundingReady}
                  >
                    {deploymentReady
                      ? 'Déjà déployé'
                      : fundingReady
                        ? 'Déployer'
                        : 'Financement requis'}
                  </button>
                </div>

                {!fundingReady ? (
                  <div className={styles.inlineWarning}>
                    Connectez la wallet administrateur dans le header puis financez la wallet backend avant le déploiement.
                  </div>
                ) : null}

                <div className={styles.actionBlock}>
                  <div className={styles.actionCopy}>
                    <h3 className={styles.actionTitle}>Minter l’inventaire</h3>
                    <p className={styles.actionText}>
                      Place les parts sur la wallet de trésorerie admin et prépare l’allowance du backend opérateur.
                    </p>
                  </div>

                  <div className={styles.mintControls}>
                    <label className={styles.inputLabel} htmlFor="mint-amount">
                      Quantité à minter
                    </label>
                    <input
                      id="mint-amount"
                      className={styles.input}
                      type="text"
                      value={mintAmount}
                      onChange={(event) => setMintAmount(event.target.value)}
                      placeholder={String(propertyRecord.tokenNumber)}
                    />
                    <button
                      type="button"
                      className={
                        !deploymentReady || tokenizedAndActive
                          ? styles.disabledButton
                          : styles.primaryButton
                      }
                      onClick={() => void handleMint()}
                      disabled={loading || !deploymentReady || tokenizedAndActive}
                    >
                      {tokenizedAndActive ? 'Déjà tokenisé' : 'Minter'}
                    </button>
                  </div>
                </div>

                <div className={styles.actionBlock}>
                  <div className={styles.actionCopy}>
                    <h3 className={styles.actionTitle}>Disponibilité achat client</h3>
                    <p className={styles.actionText}>
                      Retire temporairement le bien de l’achat sans supprimer le contrat ni les parts déjà mintées.
                    </p>
                  </div>

                  <div className={styles.actionButtons}>
                    <button
                      type="button"
                      className={
                        tokenizedAndActive ? styles.secondaryDangerButton : styles.disabledButton
                      }
                      onClick={() => void handlePurchaseAvailabilityChange(false)}
                      disabled={loading || !tokenizedAndActive}
                    >
                      Retirer de l’achat
                    </button>
                    <button
                      type="button"
                      className={
                        purchasePaused ? styles.primaryButton : styles.disabledButton
                      }
                      onClick={() => void handlePurchaseAvailabilityChange(true)}
                      disabled={loading || !purchasePaused}
                    >
                      Remettre à l’achat
                    </button>
                  </div>
                </div>

                {onChainSnapshot.error ? (
                  <div className={styles.inlineWarning}>
                    Lecture on-chain partielle: {onChainSnapshot.error}
                  </div>
                ) : null}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.panelEyebrow}>Infrastructure</div>
                    <h2 className={styles.panelTitle}>Données blockchain</h2>
                  </div>
                </div>

                <div className={styles.detailList}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Statut DB</span>
                    <span className={styles.detailValue}>
                      {getStatusLabel(propertyRecord.tokenizationStatus)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Contrat</span>
                    <div className={styles.valueWithAction}>
                      <span className={styles.detailValue}>
                        {shortenValue(propertyRecord.contractAddress)}
                      </span>
                      {propertyRecord.contractAddress ? (
                        <a
                          href={buildExplorerAddressUrl(propertyRecord.contractAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.explorerLink}
                        >
                          Voir le contrat
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Symbole</span>
                    <span className={styles.detailValue}>{propertyRecord.symbol ?? '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Chain ID</span>
                    <span className={styles.detailValue}>
                      {propertyRecord.chainId ?? '—'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Wallet trésorerie</span>
                    <div className={styles.valueWithAction}>
                      <span className={styles.detailValue}>
                        {shortenValue(propertyRecord.treasuryWalletAddress)}
                      </span>
                      {propertyRecord.treasuryWalletAddress ? (
                        <a
                          href={buildExplorerAddressUrl(propertyRecord.treasuryWalletAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.explorerLink}
                        >
                          Voir l’adresse wallet
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Wallet backend</span>
                    <div className={styles.valueWithAction}>
                      <span className={styles.detailValue}>
                        {shortenValue(backendWalletAddress)}
                      </span>
                      {backendWalletAddress ? (
                        <a
                          href={buildExplorerAddressUrl(backendWalletAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.explorerLink}
                        >
                          Voir l’adresse wallet
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Solde wallet backend</span>
                    <span className={styles.detailValue}>
                      {formatNativeBalance(fundingSnapshot?.backendBalanceWei)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Financement déploiement</span>
                    <span className={styles.detailValue}>
                      {fundingReady
                        ? 'Prêt pour le déploiement'
                        : `Manque ${formatNativeBalance(fundingSnapshot?.shortfallWei)}`}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Allowance backend</span>
                    <span className={styles.detailValue}>
                      {formatTokenUnits(onChainSnapshot.backendAllowance, decimals)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Metadata signées</span>
                    <span className={styles.detailValue}>
                      {propertyRecord.metadataSignature ? 'Oui' : 'Non'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Hash metadata</span>
                    <span className={styles.detailValue}>
                      {shortenValue(propertyRecord.metadataHash)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tx de déploiement</span>
                    <div className={styles.valueWithAction}>
                      <span className={styles.detailValue}>
                        {shortenValue(propertyRecord.deployTxHash)}
                      </span>
                      {propertyRecord.deployTxHash ? (
                        <a
                          href={buildExplorerTransactionUrl(propertyRecord.deployTxHash)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.explorerLink}
                        >
                          Voir la transaction
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.panelEyebrow}>Historique</div>
                  <h2 className={styles.panelTitle}>Dernières opérations blockchain</h2>
                </div>
              </div>

              {latestOperations.length === 0 ? (
                <div className={styles.emptyState}>
                  Aucune opération enregistrée pour ce bien.
                </div>
              ) : (
                <div className={styles.operationList}>
                  {latestOperations.map((operation) => (
                    <article key={operation.id} className={styles.operationCard}>
                      <div className={styles.operationHeader}>
                        <div>
                          <div className={styles.operationTitle}>
                            {getOperationLabel(operation.type)}
                          </div>
                          <div className={styles.operationDate}>
                            {formatDate(operation.updatedAt)}
                          </div>
                        </div>
                        <span
                          className={
                            operation.status === 'CONFIRMED'
                              ? styles.operationStatusSuccess
                              : operation.status === 'FAILED'
                                ? styles.operationStatusError
                                : styles.operationStatusPending
                          }
                        >
                          {operation.status}
                        </span>
                      </div>

                      <div className={styles.operationBody}>
                        <div className={styles.operationRow}>
                          <span className={styles.operationLabel}>Request ID</span>
                          <span className={styles.operationValue}>
                            {shortenValue(operation.requestId, 10)}
                          </span>
                        </div>
                        <div className={styles.operationRow}>
                          <span className={styles.operationLabel}>Tx hash</span>
                          <div className={styles.valueWithAction}>
                            <span className={styles.operationValue}>
                              {shortenValue(operation.txHash, 10)}
                            </span>
                            {operation.txHash ? (
                              <a
                                href={buildExplorerTransactionUrl(operation.txHash)}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.explorerLink}
                              >
                                Voir la transaction
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <div className={styles.operationRow}>
                          <span className={styles.operationLabel}>Montant</span>
                          <span className={styles.operationValue}>
                            {operation.amount ?? '—'}
                          </span>
                        </div>
                        <div className={styles.operationRow}>
                          <span className={styles.operationLabel}>Erreur</span>
                          <span className={styles.operationValue}>
                            {operation.errorMessage ?? '—'}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
