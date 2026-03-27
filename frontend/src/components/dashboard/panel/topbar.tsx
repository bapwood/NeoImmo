'use client';

import { useState } from 'react';
import type { ResourceConfig } from '@/src/lib/dashboard-resources';
import { LogoutIcon, SearchIcon } from '../icons';
import type { PanelKey } from './types';
import styles from './styles/topbar.module.css';

type DashboardTopbarProps = {
  activePanel: PanelKey;
  activeResource: ResourceConfig | null;
  isAdmin: boolean;
  onLogout: () => void;
  onQueryChange: (value: string) => void;
  query: string;
};

export default function DashboardTopbar({
  activePanel,
  activeResource,
  isAdmin,
  onLogout,
  onQueryChange,
  query,
}: DashboardTopbarProps) {
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask non détecté');
      return;
    }

    try {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const showSearch =
    activePanel === 'opportunities' ||
    (activeResource?.allowSearch && activePanel !== 'overview');

  return (
    <header className={styles.topbar}>
      <div className={styles.heading}>
        <div className={styles.eyebrow}>Mon espace :</div>
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
                  ? 'Rechercher une opportunité...'
                  : 'Filtrer la table active...'
              }
            />
          </label>
        ) : null}

        {/* Bouton MetaMask */}
        <button
          type="button"
          className={styles.logoutButton}
          onClick={connectWallet}
        >
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : 'Connecter MetaMask'}
        </button>

        <button type="button" className={styles.logoutButton} onClick={onLogout}>
          <LogoutIcon className={styles.buttonIcon} />
          Déconnexion
        </button>
      </div>
    </header>
  );
}