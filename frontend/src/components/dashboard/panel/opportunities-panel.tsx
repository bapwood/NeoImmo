'use client';

import type { PropertyRecord } from '@/src/lib/types';
import OpportunityCard from '../opportunity-card';
import styles from './styles/opportunities-panel.module.css';

type DashboardOpportunitiesPanelProps = {
  availablePropertiesError: string | null;
  availablePropertiesLoading: boolean;
  properties: PropertyRecord[];
};

export default function DashboardOpportunitiesPanel({
  availablePropertiesError,
  availablePropertiesLoading,
  properties,
}: DashboardOpportunitiesPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Catalogue client</div>
          <h3 className={styles.title}>Ensemble des opportunités disponibles</h3>
          <p className={styles.copy}>
            Accédez à l’ensemble des actifs actuellement publiés et
            consultez chaque fiche pour approfondir votre lecture.
          </p>
        </div>
      </div>

      {availablePropertiesLoading ? (
        <div className={styles.emptyState}>Chargement du catalogue...</div>
      ) : availablePropertiesError ? (
        <div className={styles.emptyState}>{availablePropertiesError}</div>
      ) : properties.length === 0 ? (
        <div className={styles.emptyState}>
          Aucune opportunité ne correspond à votre recherche.
        </div>
      ) : (
        <div className={styles.grid}>
          {properties.map((property) => (
            <OpportunityCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </section>
  );
}
