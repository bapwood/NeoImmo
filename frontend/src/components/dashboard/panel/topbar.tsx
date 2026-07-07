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
  onWalletLinked?: (address: string) => void;
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
  onWalletLinked,
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
      alert('MetaMask non détecté. Installez l\'extension MetaMask pour continuer.');
      return;
    }

    try {
      await ensureSupportedChain();
      const accounts = await requestWalletAccounts();
      const connected = accounts[0] ?? null;
      setAccount(connected);

      if (connected) {
        onWalletLinked?.(connected);
      }
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
    ? 'Wallet non connectée'
    : expectedWallet && !walletMatchesProfile
      ? 'Wallet différente du profil'
      : session?.user.role === 'ADMIN'
        ? 'Wallet admin'
        : 'Wallet liée';
  const walletStatusClassName = !account
    ? styles.walletStatusDisconnected
    : expectedWallet && !walletMatchesProfile
      ? styles.walletStatusMismatch
      : styles.walletStatusConnected;

  const showSearch =
    activePanel === 'opportunities' ||
    (activeResource?.allowSearch && activePanel !== 'overview');

  const handleWalletButtonClick = () => void connectWallet();

  // Côté client, la connexion MetaMask se fait désormais depuis la page
  // Profil (pas besoin de ce bouton sur chaque page) — sauf si la wallet
  // actuellement connectée diffère de celle du profil : dans ce cas précis,
  // on garde un accès rapide pour corriger le problème depuis n'importe
  // quelle page. L'admin n'a pas cette contrainte et garde le bouton partout.
  const walletMismatch = Boolean(account) && Boolean(expectedWallet) && !walletMatchesProfile;
  const showWalletActionButton = isAdmin || walletMismatch;

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
              : activePanel === 'favorites'
                ? 'Favoris'
                : activeResource?.label ?? 'Panel'}
        </h2>
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
          <button
            type="button"
            className={`${styles.walletStatus} ${walletStatusClassName}`}
            onClick={onOpenWalletSettings}
            title="Voir la wallet enregistrée sur mon profil"
          >
            {walletStatusLabel}
          </button>
          <div className={styles.walletMeta}>
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : 'Aucune wallet front active'}
          </div>
          {showWalletActionButton ? (
            <button
              type="button"
              className={styles.walletButton}
              onClick={handleWalletButtonClick}
            >
              {account ? 'Changer de wallet' : 'Connecter MetaMask'}
            </button>
          ) : null}
        </div>

        <button type="button" className={styles.logoutButton} onClick={onLogout}>
          <LogoutIcon className={styles.buttonIcon} />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
