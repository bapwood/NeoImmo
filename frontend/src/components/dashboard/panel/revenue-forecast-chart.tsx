'use client';

import { useState } from 'react';
import type { PortfolioRevenueBucket } from '@/src/lib/types';
import styles from './styles/revenue-forecast-chart.module.css';

type Props = {
  revenueSeries: PortfolioRevenueBucket[];
};

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}

export default function RevenueForecastChart({ revenueSeries }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...revenueSeries.map((entry) => entry.total), 1);
  const hasData = revenueSeries.some((entry) => entry.total > 0);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Prévisions</div>
          <h3 className={styles.title}>Revenus locatifs par mois</h3>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatchPaid} />
            Versé
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatchProjected} />
            Projeté
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className={styles.emptyState}>
          Aucune projection de loyer disponible pour le moment. Elle apparaîtra
          dès votre premier achat de parts.
        </div>
      ) : (
        <div className={styles.chartArea}>
          {revenueSeries.map((entry) => {
            const paidHeight = entry.paid > 0 ? Math.max((entry.paid / max) * 100, 6) : 0;
            const projectedHeight =
              entry.projected > 0 ? Math.max((entry.projected / max) * 100, 6) : 0;
            const isHovered = hovered === entry.month;

            return (
              <div
                key={entry.month}
                className={styles.column}
                onMouseEnter={() => setHovered(entry.month)}
                onMouseLeave={() => setHovered((current) => (current === entry.month ? null : current))}
                onFocus={() => setHovered(entry.month)}
                onBlur={() => setHovered((current) => (current === entry.month ? null : current))}
                tabIndex={0}
              >
                {isHovered ? (
                  <div className={styles.tooltip}>
                    <strong>{entry.label}</strong>
                    <span>
                      <span className={styles.tooltipKeyPaid} />
                      Versé : {formatEur(entry.paid)}
                    </span>
                    <span>
                      <span className={styles.tooltipKeyProjected} />
                      Projeté : {formatEur(entry.projected)}
                    </span>
                  </div>
                ) : null}

                <div className={styles.barTrack}>
                  {entry.projected > 0 ? (
                    <div className={styles.barProjected} style={{ height: `${projectedHeight}%` }} />
                  ) : null}
                  {entry.paid > 0 ? (
                    <div
                      className={entry.projected > 0 ? styles.barPaidStacked : styles.barPaidAlone}
                      style={{ height: `${paidHeight}%` }}
                    />
                  ) : null}
                </div>

                <span className={styles.columnLabel}>{entry.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
