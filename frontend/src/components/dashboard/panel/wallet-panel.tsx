'use client';

import { useCallback, useEffect, useState } from 'react';
import { requestJson } from '@/src/lib/api';
import { buildExplorerAddressUrl, buildExplorerTransactionUrl } from '@/src/lib/explorer';
import { ensureSupportedChain, requestWalletAccounts, sendNativeTransaction, waitForTransactionReceipt } from '@/src/lib/wallet';
import type { AuthSession } from '@/src/lib/types';
import styles from './styles/wallet-panel.module.css';

type WalletInfo = {
  address: string;
  balanceWei: string;
};

type PropertyOverview = {
  id: number;
  name: string;
  tokenizationStatus: string;
  contractAddress: string | null;
  tokenNumber: number;
  tokenPrice: number;
  tokenDecimals: number;
  treasuryTokenBalance: string | null;
  tokensSold: string | null;
  totalSupplyRaw: string;
};

type SystemOverview = {
  wallets: {
    backendOperator: WalletInfo;
    treasury: WalletInfo;
  };
  blockchain: {
    enabled: boolean;
    error: string | null;
  };
  properties: PropertyOverview[];
  rent: {
    totalProjectedMonthly: number;
    thisMonth: {
      paid: number;
      projected: number;
    };
  };
  fundingEstimate: {
    rent: { remainingCents: number; estimatedWei: string };
    kycSync: { pendingCount: number; estimatedWei: string };
    deployment: { pendingCount: number; estimatedWei: string };
    totalWei: string;
    error: string | null;
  };
};

function formatEth(wei: string): string {
  try {
    const eth = Number(BigInt(wei)) / 1e18;
    return `${eth.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ETH`;
  } catch {
    return '— ETH';
  }
}

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatTokens(raw: string, decimals: number): string {
  try {
    const value = Number(BigInt(raw)) / 10 ** decimals;
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  } catch {
    return '—';
  }
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function soldPercent(sold: string | null, total: string, decimals: number): number {
  if (!sold) return 0;
  try {
    const s = Number(BigInt(sold)) / 10 ** decimals;
    const t = Number(BigInt(total)) / 10 ** decimals;
    return t === 0 ? 0 : Math.min(100, Math.round((s / t) * 100));
  } catch {
    return 0;
  }
}

type Props = {
  session: AuthSession;
};

async function fetchMetaMaskBalance(address: string): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) return '0';
  const hex = await window.ethereum.request({
    method: 'eth_getBalance',
    params: [address, 'latest'],
  }) as string;
  return BigInt(hex).toString();
}

export default function WalletPanel({ session }: Props) {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminBalanceWei, setAdminBalanceWei] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('0.1');
  const [fundingState, setFundingState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [fundingTxHash, setFundingTxHash] = useState<string | null>(null);

  const adminWalletAddress = session.user.walletAddress ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data] = await Promise.all([
        requestJson<SystemOverview>('/crypto/system/overview', undefined, session),
      ]);
      setOverview(data);

      if (adminWalletAddress) {
        try {
          const bal = await fetchMetaMaskBalance(adminWalletAddress);
          setAdminBalanceWei(bal);
        } catch {
          setAdminBalanceWei(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [session, adminWalletAddress]);

  useEffect(() => { void load(); }, [load]);

  async function handleFundTreasury() {
    if (!overview || !adminWalletAddress) return;
    const treasuryAddress = overview.wallets.treasury.address;
    const amountEth = parseFloat(fundAmount);
    if (isNaN(amountEth) || amountEth <= 0) {
      setFundingError('Montant invalide.');
      return;
    }

    setFundingState('pending');
    setFundingError(null);

    try {
      await ensureSupportedChain();
      const accounts = await requestWalletAccounts();
      const from = accounts[0];
      const valueWei = BigInt(Math.round(amountEth * 1e18));
      const txHash = await sendNativeTransaction({ from, to: treasuryAddress, valueWei });
      await waitForTransactionReceipt(txHash, 60_000);
      setFundingTxHash(txHash);
      setFundingState('success');
      void load();
    } catch (e) {
      setFundingState('error');
      setFundingError(e instanceof Error ? e.message : 'Transaction échouée.');
    }
  }

  if (loading) {
    return <div className={styles.empty}>Chargement de la trésorerie…</div>;
  }

  if (error || !overview) {
    return (
      <div className={styles.stack}>
        <div className={styles.errorBanner}>{error ?? 'Données indisponibles.'}</div>
        <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
          Réessayer
        </button>
      </div>
    );
  }

  const { wallets, blockchain, properties, rent } = overview;
  const remaining = rent.thisMonth.projected - rent.thisMonth.paid;

  return (
    <div className={styles.stack}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Administration</div>
          <h2 className={styles.title}>Trésorerie & Loyers</h2>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      {blockchain.error && (
        <div className={styles.errorBanner}>
          RPC indisponible : {blockchain.error}
        </div>
      )}

      {/* Wallet cards */}
      <section>
        <div className={styles.sectionLabel}>Wallets</div>
        <div className={styles.walletGrid}>
          <div className={styles.walletCard}>
            <div className={styles.walletRole}>wallet admin</div>
            {!adminWalletAddress ? (
              <div className={styles.warningBadge}>Aucun wallet connecté — connecter MetaMask depuis le tableau de bord</div>
            ) : (
              <>
                <div className={styles.walletBalance}>
                  {adminBalanceWei !== null ? formatEth(adminBalanceWei) : '—'}
                </div>
                <div className={styles.walletAddress}>
                  <a
                    href={buildExplorerAddressUrl(adminWalletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.explorerLink}
                    title={adminWalletAddress}
                  >
                    {shortAddress(adminWalletAddress)} ↗
                  </a>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => void navigator.clipboard.writeText(adminWalletAddress)}
                  >
                    Copier
                  </button>
                </div>
                {adminBalanceWei !== null && Number(BigInt(adminBalanceWei)) / 1e18 < 0.05 && (
                  <div className={styles.warningBadge}>Solde faible — recharger</div>
                )}
              </>
            )}
          </div>

          <div className={styles.walletCard}>
            <div className={styles.walletRole}>Treasury</div>
            <div className={styles.walletBalance}>
              {blockchain.error ? '—' : formatEth(wallets.treasury.balanceWei)}
            </div>
            <div className={styles.walletAddress}>
              <a
                href={buildExplorerAddressUrl(wallets.treasury.address)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.explorerLink}
                title={wallets.treasury.address}
              >
                {shortAddress(wallets.treasury.address)} ↗
              </a>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => void navigator.clipboard.writeText(wallets.treasury.address)}
              >
                Copier
              </button>
            </div>

            {overview.fundingEstimate.error ? (
              <div className={styles.warningBadge}>
                Estimation du besoin indisponible : {overview.fundingEstimate.error}
              </div>
            ) : (
              <div className={styles.fundingEstimate}>
                <div className={styles.fundingEstimateHeader}>
                  <span>Besoin estimé ce mois-ci</span>
                  <strong>{formatEth(overview.fundingEstimate.totalWei)}</strong>
                </div>
                <ul className={styles.fundingEstimateList}>
                  <li>
                    <span>Loyers restant à verser</span>
                    <span>{formatEth(overview.fundingEstimate.rent.estimatedWei)}</span>
                  </li>
                  <li>
                    <span>
                      Sync KYC en attente
                      {overview.fundingEstimate.kycSync.pendingCount > 0
                        ? ` (${overview.fundingEstimate.kycSync.pendingCount})`
                        : ''}
                    </span>
                    <span>{formatEth(overview.fundingEstimate.kycSync.estimatedWei)}</span>
                  </li>
                  <li>
                    <span>
                      Déploiements/mints en attente
                      {overview.fundingEstimate.deployment.pendingCount > 0
                        ? ` (${overview.fundingEstimate.deployment.pendingCount})`
                        : ''}
                    </span>
                    <span>{formatEth(overview.fundingEstimate.deployment.estimatedWei)}</span>
                  </li>
                </ul>
                <p className={styles.fundingEstimateNote}>
                </p>
              </div>
            )}

            <div className={styles.fundRow}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fundAmount}
                onChange={(e) => {
                  setFundAmount(e.target.value);
                  setFundingState('idle');
                  setFundingError(null);
                }}
                className={styles.fundInput}
                placeholder="0.1"
                disabled={fundingState === 'pending'}
              />
              <span className={styles.fundUnit}>ETH</span>
              <button
                type="button"
                className={styles.fundButton}
                onClick={() => void handleFundTreasury()}
                disabled={fundingState === 'pending' || !adminWalletAddress}
              >
                {fundingState === 'pending' ? 'En cours…' : 'Approvisionner'}
              </button>
            </div>

            {fundingState === 'success' && fundingTxHash && (
              <div className={styles.fundSuccess}>
                Transaction confirmée —{' '}
                <a
                  href={buildExplorerTransactionUrl(fundingTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.explorerLink}
                >
                  {fundingTxHash.slice(0, 10)}…{fundingTxHash.slice(-6)} ↗
                </a>
              </div>
            )}
            {fundingError && (
              <div className={styles.warningBadge}>{fundingError}</div>
            )}
          </div>
        </div>
      </section>

      {/* Rent summary */}
      <section>
        <div className={styles.sectionLabel}>Loyers — mois en cours</div>
        <div className={styles.rentGrid}>
          <div className={styles.rentCard}>
            <span>Projection mensuelle totale</span>
            <strong>{formatEur(rent.totalProjectedMonthly)}</strong>
            <p>Somme des revenus projetés sur toutes les positions actives.</p>
          </div>
          <div className={styles.rentCard}>
            <span>Versé ce mois</span>
            <strong className={rent.thisMonth.paid > 0 ? styles.positive : undefined}>
              {formatEur(rent.thisMonth.paid)}
            </strong>
            <p>Loyers effectivement marqués comme payés pour le mois courant.</p>
          </div>
          <div className={styles.rentCard}>
            <span>Reste à payer</span>
            <strong className={remaining > 0 ? styles.warning : styles.positive}>
              {formatEur(remaining > 0 ? remaining : 0)}
            </strong>
            <p>
              {remaining > 0
                ? `${formatEur(remaining)} de loyers projetés non encore versés ce mois.`
                : 'Tous les loyers projetés de ce mois sont versés.'}
            </p>
          </div>
        </div>
      </section>

      {/* Properties inventory */}
      <section>
        <div className={styles.sectionLabel}>Inventaire des biens</div>
        {properties.length === 0 ? (
          <div className={styles.empty}>
            Aucun bien déployé ou actif pour le moment.
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Bien</th>
                  <th>Statut</th>
                  <th>Total tokens</th>
                  <th>Treasury</th>
                  <th>Vendus</th>
                  <th>% vendu</th>
                  <th>Valeur totale</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => {
                  const pct = soldPercent(p.tokensSold, p.totalSupplyRaw, p.tokenDecimals);
                  const totalValue = p.tokenNumber * p.tokenPrice;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.propertyName}>{p.name}</div>
                        {p.contractAddress && (
                          <div className={styles.contractAddress}>
                            <a
                              href={buildExplorerAddressUrl(p.contractAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.explorerLink}
                            >
                              {shortAddress(p.contractAddress)} ↗
                            </a>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status_${p.tokenizationStatus.toLowerCase()}`]}`}>
                          {p.tokenizationStatus}
                        </span>
                      </td>
                      <td>{p.tokenNumber.toLocaleString('fr-FR')}</td>
                      <td>
                        {p.treasuryTokenBalance !== null
                          ? formatTokens(p.treasuryTokenBalance, p.tokenDecimals)
                          : '—'}
                      </td>
                      <td>
                        {p.tokensSold !== null
                          ? formatTokens(p.tokensSold, p.tokenDecimals)
                          : '—'}
                      </td>
                      <td>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${pct}%` }}
                          />
                          <span className={styles.progressLabel}>{pct}%</span>
                        </div>
                      </td>
                      <td>{(totalValue / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
