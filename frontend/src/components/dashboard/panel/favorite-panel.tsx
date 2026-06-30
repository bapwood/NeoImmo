"use client";

import styles from "./styles/opportunities-panel.module.css";
import type { AuthSession, PropertyRecord } from "@/src/lib/types";
import OpportunityCard from "../opportunity-card";
import { useEffect, useState } from "react";
import { requestJson } from "@/src/lib/api";

type DashboardFavoritesPanelProps = {
  session: AuthSession;
};

export default function DashboardFavoritesPanel({
  session,
}: DashboardFavoritesPanelProps) {
  const [favorites, setFavorites] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchFavorites() {
      setLoading(true);
      setError(null);

      try {
        const data = await requestJson<PropertyRecord[]>(
          "/favorites",
          undefined,
          session,
        );

        if (!cancelled) {
          setFavorites(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Impossible de charger vos favoris.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchFavorites();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading) {
    return <div className={styles.panel}>Chargement de vos favoris...</div>;
  }

  if (error) {
    return <div className={styles.panel}>{error}</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className={styles.panel}>
        <p>Vous n'avez pas encore de biens enregistrés en favoris.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        {favorites.map((property) => (
          <OpportunityCard
            key={property.id}
            property={property}
            initialIsFavorite={true}
          />
        ))}
      </div>
    </div>
    // <section className={styles.panel}>
    //   <div className={styles.header}>
    //     <div>
    //       <div className={styles.eyebrow}>Catalogue client</div>
    //       <h3 className={styles.title}>Ensemble des opportunités disponibles</h3>
    //     </div>
    //   </div>

    //   {availablePropertiesLoading ? (
    //     <div className={styles.emptyState}>Chargement du catalogue...</div>
    //   ) : availablePropertiesError ? (
    //     <div className={styles.emptyState}>{availablePropertiesError}</div>
    //   ) : properties.length === 0 ? (
    //     <div className={styles.emptyState}>
    //       Aucune opportunité ne correspond à votre recherche.
    //     </div>
    //   ) : (
    //     <div className={styles.grid}>
    //       {properties.map((property) => (
    //         <OpportunityCard key={property.id} property={property} />
    //       ))}
    //     </div>
    //   )}
    // </section>
  );
}
