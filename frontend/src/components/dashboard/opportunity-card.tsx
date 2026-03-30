'use client';

import type { KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resolveAssetUrl } from '@/src/lib/api';
import {
  getOpportunityAvailabilityLabel,
  isOpportunityOpenForPurchase,
} from '@/src/lib/opportunities';
import type { PropertyRecord } from '@/src/lib/types';
import styles from './styles/opportunity-card.module.css';

type OpportunityCardProps = {
  property: PropertyRecord;
  compact?: boolean;
  interactive?: boolean;
};

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} €`;
}

export default function OpportunityCard({
  property,
  compact = false,
  interactive = true,
}: OpportunityCardProps) {
  const router = useRouter();
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
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          <h3>{property.name}</h3>
          <p>{property.localization}</p>
        </div>

        <div className={styles.meta}>
          <span>{property.livingArea}</span>
          <span>{property.roomNumber} pièces</span>
          <span>Score {property.score}/5</span>
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
