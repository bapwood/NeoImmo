'use client';

import Link from 'next/link';
import type { RefObject } from 'react';
import { resolveAssetUrl } from '@/src/lib/api';
import type { ResourceConfig, ResourceKey } from '@/src/lib/dashboard-resources';
import type {
  ClientPortfolio,
  PanelUser,
  PropertyRecord,
  RefreshTokenRecord,
  UserRecord,
} from '@/src/lib/types';
import OpportunityCard from '../opportunity-card';
import RevenueForecastChart from './revenue-forecast-chart';
import { formatCurrency } from './utils';
import type { PanelKey, ResourceState } from './types';
import styles from './styles/overview-panel.module.css';

type DashboardOverviewPanelProps = {
  adminCount: number;
  availableProperties: PropertyRecord[];
  availablePropertiesError: string | null;
  availablePropertiesLoading: boolean;
  availableResources: ResourceConfig[];
  carouselRef: RefObject<HTMLDivElement | null>;
  clientPortfolio: ClientPortfolio | null;
  expiringSoonCount: number;
  isAdmin: boolean;
  onPanelChange: (panel: PanelKey) => void;
  onReloadAvailableProperties: () => void;
  onReloadResource: (resourceKey: ResourceKey) => void;
  onScrollAvailableProperties: (direction: 'previous' | 'next') => void;
  properties: PropertyRecord[];
  refreshTokens: RefreshTokenRecord[];
  resourceState: ResourceState;
  totalTokenValue: number;
  user: PanelUser;
  users: UserRecord[];
};

export default function DashboardOverviewPanel({
  adminCount,
  availableProperties,
  availablePropertiesError,
  availablePropertiesLoading,
  availableResources,
  carouselRef,
  clientPortfolio,
  expiringSoonCount,
  isAdmin,
  onPanelChange,
  onReloadAvailableProperties,
  onReloadResource,
  onScrollAvailableProperties,
  properties,
  refreshTokens,
  resourceState,
  totalTokenValue,
  user,
  users,
}: DashboardOverviewPanelProps) {
  const portfolioSummary = clientPortfolio?.summary;
  const walletVerified = user.walletStatus === 'VERIFIED';
  const positions = clientPortfolio?.positions ?? [];

  return (
    <div className={styles.stack}>
      <section className={styles.heroPanel}>
        <div>
          <div className={styles.eyebrow}>Synthèse</div>
          <h3 className={styles.sectionTitle}>{isAdmin ? 'Centre de pilotage' : ''}</h3>
          <p className={styles.sectionCopy}>
            {isAdmin
              ? 'Supervisez l’activité de la plateforme, la qualité du catalogue et la vie des comptes.'
              : 'Retrouvez votre portefeuille et les actifs actuellement ouverts à la consultation.'}
          </p>
        </div>

        <div className={styles.heroGrid}>
          {isAdmin ? (
            <>
              <article className={styles.heroCard}>
                <span>Utilisateurs</span>
                <strong>{users.length}</strong>
                <p>{adminCount} administrateur(s) enregistrés.</p>
              </article>
              <article className={styles.heroCard}>
                <span>Biens</span>
                <strong>{properties.length}</strong>
                <p>{formatCurrency(totalTokenValue)} de valeur tokenisée.</p>
              </article>
              <article className={styles.heroCard}>
                <span>Sessions</span>
                <strong>{refreshTokens.length}</strong>
                <p>{expiringSoonCount} expiration(s) dans les 72h.</p>
              </article>
            </>
          ) : (
            <>
              <article className={styles.heroCard}>
                <span>Valeur du portefeuille</span>
                <strong>{formatCurrency(portfolioSummary?.currentValuation ?? 0)}</strong>
                <p>{portfolioSummary?.positionsCount ?? 0} position(s) actuellement détenue(s).</p>
              </article>
              <article className={styles.heroCard}>
                <span>Revenu mensuel projeté</span>
                <strong>{formatCurrency(portfolioSummary?.projectedMonthlyIncome ?? 0)}</strong>
                <p>Projection locative actuelle de votre portefeuille.</p>
              </article>
              <article className={styles.heroCard}>
                <span>Rendement annuel projeté</span>
                <strong>{portfolioSummary?.projectedAnnualYieldPercent ?? 0}%</strong>
                <p>Estimation basée sur vos positions actuelles.</p>
              </article>
            </>
          )}
        </div>
      </section>

      {isAdmin ? (
        <section className={styles.quickGrid}>
          {availableResources.map((resource) => {
            const state = resourceState[resource.key];

            return (
              <article key={resource.key} className={styles.quickCard}>
                <div className={styles.quickCardTop}>
                  <div>
                    <div className={styles.eyebrow}>Périmètre</div>
                    <h3 className={styles.sectionTitle}>{resource.label}</h3>
                  </div>
                  <span
                    className={styles.quickBadge}
                    style={{ backgroundColor: resource.accentSoft, color: resource.accent }}
                  >
                    {state.items.length}
                  </span>
                </div>
                <p className={styles.sectionCopy}>{resource.description}</p>
                <div className={styles.quickActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => onPanelChange(resource.key)}
                  >
                    Accéder
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onReloadResource(resource.key)}
                  >
                    Actualiser
                  </button>
                </div>
                {state.error ? <div className={styles.inlineError}>{state.error}</div> : null}
              </article>
            );
          })}
        </section>
      ) : (
        <>
          {!user.walletAddress || !walletVerified ? (
            <section className={styles.accountBanner}>
              <div>
                <strong>
                  {!user.walletAddress
                    ? 'Wallet non connectée'
                    : 'KYC en attente de validation'}
                </strong>
                <p>
                  {!user.walletAddress
                    ? 'Connectez votre wallet MetaMask depuis la barre du haut pour pouvoir investir.'
                    : 'Votre KYC doit être validé par un administrateur avant de pouvoir acheter des parts.'}
                </p>
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => onPanelChange('user')}
              >
                Compléter mon profil
              </button>
            </section>
          ) : null}

          <section className={styles.panelCard}>
            <div className={styles.panelCardHeader}>
              <div>
                <div className={styles.eyebrow}>Portefeuille</div>
                <h3 className={styles.sectionTitle}>Vos positions</h3>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onPanelChange('property')}
              >
                Voir tout
              </button>
            </div>

            {positions.length === 0 ? (
              <div className={styles.emptyState}>
                Aucun actif détenu pour le moment. Explorez les opportunités pour
                investir dans votre premier bien.
              </div>
            ) : (
              <div className={styles.positionPreviewList}>
                {positions.slice(0, 3).map((position) => {
                  const coverImage = resolveAssetUrl(position.property.images[0]);

                  return (
                    <Link
                      key={position.id}
                      href={`/opportunites/${position.property.id}`}
                      className={styles.positionPreviewCard}
                    >
                      <div
                        className={
                          coverImage
                            ? styles.positionPreviewMedia
                            : styles.positionPreviewMediaPlaceholder
                        }
                        style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
                      />
                      <div className={styles.positionPreviewBody}>
                        <strong>{position.property.name}</strong>
                        <span>
                          {position.tokenAmount} parts · {formatCurrency(position.currentValuation)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {positions.length > 0 ? (
            <RevenueForecastChart revenueSeries={clientPortfolio?.revenueSeries ?? []} />
          ) : null}
        </>
      )}

      {!isAdmin ? (
        <section className={styles.catalogSection}>
          <div className={styles.catalogHeader}>
            <div>
              <div className={styles.eyebrow}>Marché primaire</div>
              <h3 className={styles.sectionTitle}>Opportunités actuellement ouvertes à la consultation</h3>
              <p className={styles.sectionCopy}>
                Consultez la sélection d’actifs publiée par l’administration
                et accédez aux fiches détaillées pour approfondir votre analyse.
              </p>
            </div>

            <div className={styles.catalogActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => onPanelChange('opportunities')}
              >
                Voir le catalogue
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onReloadAvailableProperties}
              >
                Actualiser
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onScrollAvailableProperties('previous')}
                disabled={availableProperties.length < 2}
              >
                Précédent
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onScrollAvailableProperties('next')}
                disabled={availableProperties.length < 2}
              >
                Suivant
              </button>
            </div>
          </div>

          {availablePropertiesLoading ? (
            <div className={styles.emptyState}>Chargement des biens disponibles...</div>
          ) : availablePropertiesError ? (
            <div className={styles.emptyState}>{availablePropertiesError}</div>
          ) : availableProperties.length === 0 ? (
            <div className={styles.emptyState}>
              Aucune opportunité n’est actuellement publiée.
            </div>
          ) : (
            <div className={styles.catalogCarousel} ref={carouselRef}>
              {availableProperties.map((property) => (
                <OpportunityCard key={property.id} property={property} compact />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
