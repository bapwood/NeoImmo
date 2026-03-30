'use client';

import { useEffect, useState } from 'react';
import type { ResourceConfig } from '@/src/lib/dashboard-resources';
import type { AuthSession } from '@/src/lib/types';
import {
  ensureSupportedChain,
  readConnectedWalletAccount,
  requestWalletAccounts,
  subscribeWalletEvents,
} from '@/src/lib/wallet';
import { LogoutIcon, SearchIcon } from '../icons';
import type { PanelKey } from './types';
import styles from './styles/topbar.module.css';

type DashboardTopbarProps = {
  activePanel: PanelKey;
  activeResource: ResourceConfig | null;
  isAdmin: boolean;
  onLogout: () => void;
  onOpenWalletSettings: () => void;
  onQueryChange: (value: string) => void;
  query: string;
  session: AuthSession | null;
};

export default function DashboardTopbar({
  activePanel,
  activeResource,
  isAdmin,
  onLogout,
  onOpenWalletSettings,
  onQueryChange,
  query,
  session,
}: DashboardTopbarProps) {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncWalletState = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        if (!cancelled) {
          setAccount(null);
        }
        return;
      }

      try {
        const nextAccount = await readConnectedWalletAccount();

        if (!cancelled) {
          setAccount(nextAccount);
        }
      } catch {
        if (!cancelled) {
          setAccount(null);
        }
      }
    };

    void syncWalletState();
    const unsubscribe = subscribeWalletEvents(() => {
      void syncWalletState();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask non détecté');
      return;
    }

    try {
      await ensureSupportedChain();
      const accounts = await requestWalletAccounts();
      setAccount(accounts[0] ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  const expectedWallet =
    session?.user.role === 'CLIENT' ? session.user.walletAddress?.trim() || null : null;
  const walletMatchesProfile =
    Boolean(account) &&
    Boolean(expectedWallet) &&
    account!.toLowerCase() === expectedWallet!.toLowerCase();
  const walletStatusLabel = !account
    ? 'Wallet déconnectée'
    : expectedWallet && !walletMatchesProfile
      ? 'Wallet différente du profil'
      : session?.user.role === 'ADMIN'
        ? 'Wallet admin connectée'
      : 'Wallet connectée';
  const walletStatusClassName = !account
    ? styles.walletStatusDisconnected
    : expectedWallet && !walletMatchesProfile
      ? styles.walletStatusMismatch
      : styles.walletStatusConnected;

  const showSearch =
    activePanel === 'opportunities' ||
    (activeResource?.allowSearch && activePanel !== 'overview');
  const shouldRedirectToWalletSettings =
    session?.user.role === 'CLIENT' && Boolean(account);
  const handleWalletButtonClick = shouldRedirectToWalletSettings
    ? onOpenWalletSettings
    : () => void connectWallet();

  return (
    <header className={styles.topbar}>
      <div className={styles.heading}>
        <div className={styles.eyebrow}>Bienvenue :</div>
        <h2 className={styles.title}>
          {activePanel === 'overview'
            ? isAdmin
              ? 'Général'
              : 'Espace client'
            : activePanel === 'opportunities'
              ? 'Catalogue des opportunités'
              : activeResource?.label ?? 'Panel'}
        </h2>
        <p className={styles.copy}>
          {activePanel === 'overview'
            ? isAdmin
              ? 'Vue consolidée des comptes, des actifs et des sessions opérationnelles.'
              : 'Accès à votre profil, à votre portefeuille et au catalogue d’opportunités disponibles.'
            : activePanel === 'opportunities'
              ? 'Ensemble des actifs actuellement publiés à destination des clients.'
              : activeResource?.description}
        </p>
      </div>

      <div className={styles.actions}>
        {showSearch ? (
          <label className={styles.searchField}>
            <SearchIcon className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={
                activePanel === 'opportunities'
                  ? 'Recherche d\'un bien'
                  : 'Filtrer la table active...'
              }
            />
          </label>
        ) : null}

        <div className={styles.walletCluster}>
          <div className={`${styles.walletStatus} ${walletStatusClassName}`}>
            {walletStatusLabel}
          </div>
          <div className={styles.walletMeta}>
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : 'Aucune wallet front active'}
          </div>
          <button
            type="button"
            className={styles.walletButton}
            onClick={handleWalletButtonClick}
          >
            {account ? 'Changer de wallet' : 'Connecter la wallet'}
          </button>
        </div>

        <button type="button" className={styles.logoutButton} onClick={onLogout}>
          <LogoutIcon className={styles.buttonIcon} />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
