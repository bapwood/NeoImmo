'use client';

import { useState } from 'react';
import type { TokenSalesMonth } from '@/src/lib/types';
import styles from './styles/sales-trend-chart.module.css';

type Props = {
  months: TokenSalesMonth[];
};

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}

export default function SalesTrendChart({ months }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...months.map((entry) => entry.amountRaised), 1);
  const hasData = months.some((entry) => entry.amountRaised > 0);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Ventes</div>
          <h3 className={styles.title}>Montant levé par mois</h3>
        </div>
      </div>

      {!hasData ? (
        <div className={styles.emptyState}>
          Aucune vente de parts enregistrée sur la période.
        </div>
      ) : (
        <div className={styles.chartArea}>
          {months.map((entry) => {
            const barHeight =
              entry.amountRaised > 0 ? Math.max((entry.amountRaised / max) * 100, 6) : 0;
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
                    <span>Levé : {formatEur(entry.amountRaised)}</span>
                    <span>Tokens vendus : {entry.tokensSold}</span>
                    <span>Transactions : {entry.salesCount}</span>
                  </div>
                ) : null}

                <div className={styles.barTrack}>
                  {entry.amountRaised > 0 ? (
                    <div className={styles.bar} style={{ height: `${barHeight}%` }} />
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
