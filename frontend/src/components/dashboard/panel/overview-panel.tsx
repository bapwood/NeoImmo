'use client';

import type { RefObject } from 'react';
import type { ResourceConfig, ResourceKey } from '@/src/lib/dashboard-resources';
import type {
  PropertyRecord,
  RefreshTokenRecord,
  UserRecord,
} from '@/src/lib/types';
import OpportunityCard from '../opportunity-card';
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
  expiringSoonCount: number;
  isAdmin: boolean;
  onPanelChange: (panel: PanelKey) => void;
  onReloadAvailableProperties: () => void;
  onReloadResource: (resourceKey: ResourceKey) => void;
  onScrollAvailableProperties: (direction: 'previous' | 'next') => void;
  profileCompletion: number;
  profileCompletionTotal: number;
  properties: PropertyRecord[];
  refreshTokens: RefreshTokenRecord[];
  resourceState: ResourceState;
  totalTokenValue: number;
  users: UserRecord[];
};

export default function DashboardOverviewPanel({
  adminCount,
  availableProperties,
  availablePropertiesError,
  availablePropertiesLoading,
  availableResources,
  carouselRef,
  expiringSoonCount,
  isAdmin,
  onPanelChange,
  onReloadAvailableProperties,
  onReloadResource,
  onScrollAvailableProperties,
  profileCompletion,
  profileCompletionTotal,
  properties,
  refreshTokens,
  resourceState,
  totalTokenValue,
  users,
}: DashboardOverviewPanelProps) {
  return (
    <div className={styles.stack}>
      <section className={styles.heroPanel}>
        <div>
          <div className={styles.eyebrow}>Synthèse</div>
          <h3 className={styles.sectionTitle}>{isAdmin ? 'Centre de pilotage' : 'Espace d’analyse'}</h3>
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
                <span>Profil</span>
                <strong>
                  {profileCompletion}/{profileCompletionTotal}
                </strong>
                <p>Informations clés actuellement renseignées.</p>
              </article>
              <article className={styles.heroCard}>
                <span>Portefeuille</span>
                <strong>{properties.length}</strong>
                <p>Actif(s) actuellement rattaché(s) à votre compte.</p>
              </article>
              <article className={styles.heroCard}>
                <span>Opportunités</span>
                <strong>{availableProperties.length}</strong>
                <p>Actif(s) publiés et visibles dans le catalogue.</p>
              </article>
            </>
          )}
        </div>
      </section>

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
