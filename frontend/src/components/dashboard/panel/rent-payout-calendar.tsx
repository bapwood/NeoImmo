'use client';

import type { RentCalendarMonth } from '@/src/lib/types';
import styles from './styles/rent-payout-calendar.module.css';

type Props = {
  months: RentCalendarMonth[];
  onOpenRents: () => void;
};

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}

function monthStatus(month: RentCalendarMonth): 'paid' | 'partial' | 'due' {
  if (month.totalProjected === 0) {
    return 'paid';
  }

  if (month.totalPaid >= month.totalProjected) {
    return 'paid';
  }

  return month.totalPaid > 0 ? 'partial' : 'due';
}

export default function RentPayoutCalendar({ months, onOpenRents }: Props) {
  const hasData = months.some((month) => month.totalProjected > 0);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Échéancier</div>
          <h3 className={styles.title}>Prochains versements de loyers</h3>
        </div>
        <button type="button" className={styles.linkButton} onClick={onOpenRents}>
          Gérer les loyers
        </button>
      </div>

      {!hasData ? (
        <div className={styles.emptyState}>Aucune échéance de loyer à venir.</div>
      ) : (
        <div className={styles.strip}>
          {months.map((month, index) => {
            const status = monthStatus(month);
            const remaining = month.totalProjected - month.totalPaid;

            return (
              <button
                type="button"
                key={month.month}
                className={`${styles.monthCard} ${styles[`monthCard--${status}`]}`}
                onClick={onOpenRents}
              >
                <span className={styles.monthLabel}>
                  {index === 0 ? 'Ce mois-ci' : month.label}
                </span>
                <strong className={styles.monthAmount}>
                  {month.totalProjected === 0 ? '—' : formatEur(remaining)}
                </strong>
                <span className={styles.monthHint}>
                  {month.totalProjected === 0
                    ? 'Aucune échéance'
                    : status === 'paid'
                      ? 'Versé'
                      : `${month.properties.length} bien(s)`}
                </span>

                {month.properties.length > 0 ? (
                  <span className={styles.propertyChips}>
                    {month.properties.slice(0, 2).map((property) => (
                      <span key={property.propertyId} className={styles.propertyChip}>
                        {property.propertyName}
                      </span>
                    ))}
                    {month.properties.length > 2 ? (
                      <span className={styles.propertyChip}>
                        +{month.properties.length - 2}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
