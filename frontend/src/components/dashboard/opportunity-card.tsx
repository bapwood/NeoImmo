'use client';

import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson, resolveAssetUrl } from '@/src/lib/api';
import {
  getOpportunityAvailabilityLabel,
  isOpportunityOpenForPurchase,
} from '@/src/lib/opportunities';
import { readStoredSession } from '@/src/lib/auth';
import { HeartIcon } from './icons';
import type { PropertyRecord } from '@/src/lib/types';
import styles from './styles/opportunity-card.module.css';

type OpportunityCardProps = {
  property: PropertyRecord;
  compact?: boolean;
  interactive?: boolean;
  initialIsFavorite?: boolean; 
};

function formatCurrency(cents: number) {
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)} €`;
}

export default function OpportunityCard({
  property,
  compact = false,
  interactive = true,
  initialIsFavorite = false,
}: OpportunityCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  
  const coverImage = resolveAssetUrl(property.images[0]);
  const openForPurchase = isOpportunityOpenForPurchase(property);
  const availabilityLabel = getOpportunityAvailabilityLabel(property);

  function openDetails() {
    router.push(`/opportunites/${property.id}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails();
    }
  }

  async function handleToggleFavorite(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const session = readStoredSession();
    
    if (!session) {
       router.push('/signin');
       return;
    }

    setIsFavoriteLoading(true);

    try {
      if (isFavorite) {
        await requestJson(`/favorites/${property.id}`, { method: 'DELETE' }, session);
        setIsFavorite(false);
      } else {
        await requestJson(`/favorites/${property.id}`, { method: 'POST' }, session);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error);
    } finally {
      setIsFavoriteLoading(false);
    }
  }

  return (
    <article
      className={interactive ? styles.interactiveCard : styles.card}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? openDetails : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      <div
        className={coverImage ? styles.media : styles.mediaPlaceholder}
        style={
          coverImage
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(var(--theme-ink-rgb), 0.04), rgba(var(--theme-ink-rgb), 0.28)), url(${coverImage})`,
              }
            : undefined
        }
      >
        <span className={openForPurchase ? styles.pillActive : styles.pillInactive}>
          {availabilityLabel}
        </span>
        
        <button 
          className={styles.favoriteButton} 
          onClick={handleToggleFavorite}
          disabled={isFavoriteLoading}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
           <HeartIcon 
              style={{ 
                fill: isFavorite ? 'red' : 'none', 
                stroke: isFavorite ? 'red' : 'black' 
              }} 
           />
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          <h3>{property.name}</h3>
          <p>{property.localization}</p>
        </div>

        <div className={styles.meta}>
          <span>{property.livingArea}</span>
          <span>{property.roomNumber} pièces</span>
          <span>Score {property.score}/100</span>
        </div>

        {!compact ? (
          <div className={styles.description}>
            <p>{property.description}</p>
          </div>
        ) : null}

        <div className={compact ? styles.footerCompact : styles.footer}>
          <div className={styles.footerInfo}>
            <strong>{formatCurrency(property.tokenPrice)}</strong>
            <small>par token</small>
          </div>
          <small>{property.tokenNumber} tokens</small>
        </div>

        <div className={styles.actions}>
          <span className={styles.linkLabel}>Consulter</span>
        </div>
      </div>
    </article>
  );
}