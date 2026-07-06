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

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
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
    case 'RENT_PAYOUT':
      return 'Versement de loyer';
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
        message: `Le contrat du bien a été déployé après validation de la wallet admin.`,
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
        message: "L'inventaire primaire a bien été minté sur la trésorerie admin.",
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
        message: `La wallet backend opérateur est indisponible pour ce financement.`,
      });
      return;
    }

    if (shortfallWei <= BigInt(0)) {
      setNotice({
        tone: 'success',
        message: `La wallet backend dispose déjà du solde nécessaire au déploiement.`,
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
          ? "Le bien a été remis à l'achat client."
          : "Le bien a été retiré de l'achat client.",
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

  const step1Done = deploymentReady;
  const step2Done = tokenizedAndActive || purchasePaused;

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
              {loading ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
        </header>

        {error ? <div className={styles.noticeError}>{error}</div> : null}
        {notice?.tone === 'success' && <div className={styles.noticeSuccess}>{notice.message}</div>}
        {notice?.tone === 'error' && <div className={styles.noticeError}>{notice.message}</div>}

        {property && propertyRecord && onChainSnapshot ? (
          <>
            {/* Hero */}
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <div className={styles.eyebrow}>Tokenisation de l&apos;actif</div>
                <h1 className={styles.title}>{property.name}</h1>
                <div className={styles.heroMeta}>
                  <span className={styles.metaPill}>{property.localization}</span>
                  <span className={styles.metaPill}>{property.livingArea}</span>
                  <span className={styles.metaPill}>{property.roomNumber} pièces</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={tokenizedAndActive ? styles.statusBadgeActive : styles.statusBadgeInactive}>
                    {getStatusLabel(propertyRecord.tokenizationStatus)}
                  </span>
                  <span className={styles.scorePill}>{formatCurrency(primaryValue)} total</span>
                </div>
              </div>
              <div className={styles.heroVisual}>
                {coverImage
                  ? <div className={styles.imageFrame} style={{ backgroundImage: `url(${coverImage})` }} />
                  : <div className={styles.imageFallback}>Aucune image</div>}
              </div>
            </section>

            {/* Métriques rapides */}
            <section className={styles.metricsGrid}>
              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Parts totales</div>
                <div className={styles.metricValue}>{propertyRecord.tokenNumber}</div>
              </article>
              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Prix / part</div>
                <div className={styles.metricValue}>{formatCurrency(propertyRecord.tokenPrice)}</div>
              </article>
              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Vendues</div>
                <div className={styles.metricValue}>{formatTokenUnits(soldRaw.toString(), decimals)} <small>({percentFormatter.format(soldRatio)}%)</small></div>
              </article>
              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>En trésorerie</div>
                <div className={styles.metricValue}>{formatTokenUnits(onChainSnapshot.treasuryBalance, decimals)}</div>
              </article>
              <article className={styles.metricCard}>
                <div className={styles.metricLabel}>Achat client</div>
                <div className={purchaseAvailable ? styles.metricStatePositive : styles.metricStateNegative}>
                  {purchaseAvailable ? 'Ouvert' : 'Fermé'}
                </div>
              </article>
            </section>

            {property.financials ? (
              <section className={styles.metricsGrid}>
                <article className={styles.metricCard}>
                  <div className={styles.metricLabel}>Prix suggéré / part</div>
                  <div className={styles.metricValue}>
                    {property.financials.suggestedTokenPrice != null
                      ? formatCurrency(property.financials.suggestedTokenPrice)
                      : '—'}
                  </div>
                </article>
                <article className={styles.metricCard}>
                  <div className={styles.metricLabel}>Rendement brut</div>
                  <div className={styles.metricValue}>
                    {property.financials.grossYieldPct != null
                      ? `${percentFormatter.format(property.financials.grossYieldPct)} %`
                      : '—'}
                  </div>
                </article>
                <article className={styles.metricCard}>
                  <div className={styles.metricLabel}>Rendement net</div>
                  <div className={styles.metricValue}>
                    {property.financials.netYieldPct != null
                      ? `${percentFormatter.format(property.financials.netYieldPct)} %`
                      : '—'}
                  </div>
                </article>
                <article className={styles.metricCard}>
                  <div className={styles.metricLabel}>Cash-on-cash</div>
                  <div className={styles.metricValue}>
                    {property.financials.cashOnCashPct != null
                      ? `${percentFormatter.format(property.financials.cashOnCashPct)} %`
                      : '—'}
                  </div>
                </article>
                <article className={styles.metricCard}>
                  <div className={styles.metricLabel}>Cash-flow / part / mois</div>
                  <div className={styles.metricValue}>
                    {formatCurrency(property.financials.perTokenMonthlyIncome)}
                  </div>
                </article>
                <article className={styles.metricCard}>
                  <div className={styles.metricLabel}>MOIC (sortie)</div>
                  <div className={styles.metricValue}>
                    {property.financials.moic != null
                      ? `${percentFormatter.format(property.financials.moic)}x`
                      : '—'}
                  </div>
                </article>
                <article className={styles.metricCard}>
                  <div className={styles.metricLabel}>Payback</div>
                  <div className={styles.metricValue}>
                    {property.financials.paybackYears != null
                      ? `${percentFormatter.format(property.financials.paybackYears)} ans`
                      : '—'}
                  </div>
                </article>
              </section>
            ) : null}

            {/* Stepper 2 étapes */}
            <div className={styles.stepper}>
              <div className={`${styles.stepConnector} ${step1Done ? styles.stepConnectorDone : ``}`} />
            </div>

            <section className={styles.contentGrid}>
              {/* Étape 1 : Déploiement */}
              <article className={`${styles.panel} ${step1Done ? styles.panelDone : ``}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.panelEyebrow}>Étape 1</div>
                    <h2 className={styles.panelTitle}>
                      {step1Done ? 'Contrat déployé' : 'Déployer le contrat'}
                    </h2>
                  </div>
                  {step1Done && propertyRecord.contractAddress && (
                    <a
                      href={buildExplorerAddressUrl(propertyRecord.contractAddress)}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.explorerLink}
                    >
                      {shortenValue(propertyRecord.contractAddress)} ↗
                    </a>
                  )}
                </div>

                {!step1Done && (
                  <>
                    {/* Financement wallet backend */}
                    <div className={styles.actionBlock}>
                      <div className={styles.actionCopy}>
                        <h3 className={styles.actionTitle}>
                          {fundingReady ? 'Wallet backend financée' : '1a Financer la wallet backend'}
                        </h3>
                        {!fundingReady && (
                          <p className={styles.actionText}>
                            La wallet backend a besoin de gas pour déployer le contrat.
                            {backendWalletAddress && (
                              <> Destination : <code>{shortenValue(backendWalletAddress)}</code> — Manque : <strong>{formatNativeBalance(fundingSnapshot?.shortfallWei)}</strong>.</>
                            )}
                          </p>
                        )}
                        {fundingSnapshot?.error && (
                          <div className={styles.inlineWarning}>Estimation indisponible : {fundingSnapshot.error}</div>
                        )}
                      </div>
                      {!fundingReady && (
                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => void handleFundBackendWallet()}
                            disabled={loading || !backendWalletAddress}
                          >
                            Envoyer le gas
                          </button>
                          {latestFundingTxHash && (
                            <a
                              href={buildExplorerTransactionUrl(latestFundingTxHash)}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.secondaryButton}
                            >
                              Voir la tx
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Déploiement du contrat */}
                    <div className={styles.actionBlock}>
                      <div className={styles.actionCopy}>
                        <h3 className={styles.actionTitle}>1b — Déployer et signer</h3>
                        <p className={styles.actionText}>
                          MetaMask vous demandera de signer la transaction EIP-712. Le contrat ERC-20 de ce bien sera créé on-chain.
                        </p>
                        {!fundingReady && (
                          <div className={styles.inlineWarning}>
                            Financer la wallet backend (étape 1a) avant de déployer.
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={fundingReady ? styles.primaryButton : styles.disabledButton}
                        onClick={() => void handleDeploy()}
                        disabled={loading || !fundingReady}
                      >
                        {loading ? 'Déploiement...' : 'Déployer le contrat'}
                      </button>
                    </div>
                  </>
                )}

                {step1Done && (
                  <div className={styles.detailList}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Symbole</span>
                      <span className={styles.detailValue}>{propertyRecord.symbol ?? '—'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Chain ID</span>
                      <span className={styles.detailValue}>{propertyRecord.chainId ?? '—'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Tx déploiement</span>
                      <span className={styles.detailValue}>
                        {propertyRecord.deployTxHash ? (
                          <a href={buildExplorerTransactionUrl(propertyRecord.deployTxHash)} target="_blank" rel="noreferrer" className={styles.explorerLink}>
                            {shortenValue(propertyRecord.deployTxHash)} ↗
                          </a>
                        ) : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </article>

              {/* Étape 2 : Mise en vente */}
              <article className={`${styles.panel} ${!step1Done ? styles.panelLocked : ''} ${step2Done ? styles.panelDone : ''}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.panelEyebrow}>Étape 2</div>
                    <h2 className={styles.panelTitle}>
                      {tokenizedAndActive
                        ? 'Bien en vente'
                        : purchasePaused
                          ? 'Vente suspendue'
                          : 'Mettre en vente'}
                    </h2>
                  </div>
                </div>

                {!step1Done && (
                  <p className={styles.actionText} style={{ color: 'var(--muted)' }}>
                    Déployez d&apos;abord le contrat (étape 1) pour activer la vente.
                  </p>
                )}

                {step1Done && !tokenizedAndActive && !purchasePaused && (
                  <div className={styles.actionBlock}>
                    <div className={styles.actionCopy}>
                      <h3 className={styles.actionTitle}>Minter et activer</h3>
                      <p className={styles.actionText}>
                        Crée les {propertyRecord.tokenNumber} parts sur la trésorerie admin et ouvre l&apos;achat aux clients.
                      </p>
                    </div>
                    <div className={styles.mintControls}>
                      <label className={styles.inputLabel} htmlFor="mint-amount">
                        Quantité à minter (défaut : {propertyRecord.tokenNumber})
                      </label>
                      <input
                        id="mint-amount"
                        className={styles.input}
                        type="text"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        placeholder={String(propertyRecord.tokenNumber)}
                      />
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => void handleMint()}
                        disabled={loading}
                      >
                        {loading ? 'Mint en cours...' : 'Lancer la vente'}
                      </button>
                    </div>
                  </div>
                )}

                {(tokenizedAndActive || purchasePaused) && (
                  <div className={styles.actionBlock}>
                    <div className={styles.actionCopy}>
                      <h3 className={styles.actionTitle}>
                        {purchasePaused ? 'Vente actuellement suspendue' : 'Vente ouverte aux clients'}
                      </h3>
                      <p className={styles.actionText}>
                        Vous pouvez suspendre ou reprendre la vente sans affecter les parts déjà vendues ni détruire le contrat.
                      </p>
                    </div>
                    <div className={styles.actionButtons}>
                      {purchasePaused ? (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => void handlePurchaseAvailabilityChange(true)}
                          disabled={loading}
                        >
                          Reprendre la vente
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.secondaryDangerButton}
                          onClick={() => void handlePurchaseAvailabilityChange(false)}
                          disabled={loading}
                        >
                          Suspendre la vente
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {onChainSnapshot.error && (
                  <div className={styles.inlineWarning}>Lecture on-chain partielle : {onChainSnapshot.error}</div>
                )}
              </article>
            </section>

            {/* Historique des opérations */}
            {latestOperations.length > 0 && (
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.panelEyebrow}>Historique</div>
                    <h2 className={styles.panelTitle}>Dernières opérations</h2>
                  </div>
                </div>
                <div className={styles.operationList}>
                  {latestOperations.map((operation) => (
                    <article key={operation.id} className={styles.operationCard}>
                      <div className={styles.operationHeader}>
                        <div>
                          <div className={styles.operationTitle}>{getOperationLabel(operation.type)}</div>
                          <div className={styles.operationDate}>{formatDate(operation.updatedAt)}</div>
                        </div>
                        <span className={
                          operation.status === 'CONFIRMED' ? styles.operationStatusSuccess
                          : operation.status === 'FAILED' ? styles.operationStatusError
                          : styles.operationStatusPending
                        }>
                          {operation.status}
                        </span>
                      </div>
                      {(operation.txHash || operation.errorMessage) && (
                        <div className={styles.operationBody}>
                          {operation.txHash && (
                            <div className={styles.operationRow}>
                              <span className={styles.operationLabel}>Tx</span>
                              <a href={buildExplorerTransactionUrl(operation.txHash)} target="_blank" rel="noreferrer" className={styles.explorerLink}>
                                {shortenValue(operation.txHash, 10)} ↗
                              </a>
                            </div>
                          )}
                          {operation.errorMessage && (
                            <div className={styles.operationRow}>
                              <span className={styles.operationLabel}>Erreur</span>
                              <span className={styles.operationValue}>{operation.errorMessage}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
