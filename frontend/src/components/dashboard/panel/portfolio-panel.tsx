'use client';

import Link from 'next/link';
import { resolveAssetUrl } from '@/src/lib/api';
import {
  buildExplorerAddressUrl,
  buildExplorerTransactionUrl,
} from '@/src/lib/explorer';
import type { ClientPortfolio } from '@/src/lib/types';
import styles from './styles/portfolio-panel.module.css';

type DashboardPortfolioPanelProps = {
  error: string | null;
  loading: boolean;
  onOpenOpportunities: () => void;
  onReload: () => void;
  portfolio: ClientPortfolio | null;
  walletAddress?: string | null;
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function DashboardPortfolioPanel({
  error,
  loading,
  onOpenOpportunities,
  onReload,
  portfolio,
  walletAddress,
}: DashboardPortfolioPanelProps) {
  const revenueMax = Math.max(
    ...(portfolio?.revenueSeries.map((entry) => entry.total) ?? [0]),
    1,
  );

  return (
    <section className={styles.stack}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Portefeuille investisseur</div>
          <h3 className={styles.title}>Vue consolidée de vos positions</h3>
          <p className={styles.copy}>
            Suivez vos parts détenues, vos revenus mensuels projetés et la valeur
            actuelle de votre exposition immobilière.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={onReload}>
            Actualiser
          </button>
          {walletAddress ? (
            <a
              href={buildExplorerAddressUrl(walletAddress)}
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryLink}
            >
              Voir l’adresse wallet
            </a>
          ) : null}
          <Link href="/portefeuille/historique" className={styles.secondaryLink}>
            Historique d’achat
          </Link>
          <button type="button" className={styles.primaryButton} onClick={onOpenOpportunities}>
            Explorer les opportunités
          </button>
        </div>
      </div>

      {loading ? <div className={styles.emptyState}>Chargement du portefeuille...</div> : null}
      {!loading && error ? <div className={styles.emptyState}>{error}</div> : null}
      {!loading && !error && portfolio && portfolio.positions.length === 0 ? (
        <div className={styles.emptyState}>
          Aucun actif n’a encore été acheté. Commencez par explorer les opportunités publiées.
        </div>
      ) : null}

      {!loading && !error && portfolio && portfolio.positions.length > 0 ? (
        <>
          <div className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Investissement total</span>
              <strong className={styles.metricValue}>
                {formatCurrency(portfolio.summary.totalInvested)}
              </strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Valeur détenue</span>
              <strong className={styles.metricValue}>
                {formatCurrency(portfolio.summary.currentValuation)}
              </strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Revenu mensuel projeté</span>
              <strong className={styles.metricValue}>
                {formatCurrency(portfolio.summary.projectedMonthlyIncome)}
              </strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Rendement annuel projeté</span>
              <strong className={styles.metricValue}>
                {portfolio.summary.projectedAnnualYieldPercent}%
              </strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Positions</span>
              <strong className={styles.metricValue}>{portfolio.summary.positionsCount}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Parts détenues</span>
              <strong className={styles.metricValue}>{portfolio.summary.totalTokensHeld}</strong>
            </article>
          </div>

          <div className={styles.contentGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>Projection mensuelle</div>
                  <h3 className={styles.sectionTitle}>Revenus par mois</h3>
                </div>
                <div className={styles.legend}>
                  <span className={styles.legendPaid}>Versé</span>
                  <span className={styles.legendProjected}>Projeté</span>
                </div>
              </div>

              <div className={styles.chart}>
                {portfolio.revenueSeries.map((entry) => {
                  const paidHeight = Math.max((entry.paid / revenueMax) * 100, entry.paid > 0 ? 8 : 0);
                  const projectedHeight = Math.max(
                    (entry.projected / revenueMax) * 100,
                    entry.projected > 0 ? 8 : 0,
                  );

                  return (
                    <div key={entry.month} className={styles.chartColumn}>
                      <div className={styles.chartBarTrack}>
                        {entry.paid > 0 ? (
                          <div
                            className={styles.chartBarPaid}
                            style={{ height: `${paidHeight}%` }}
                            title={`${entry.label}: ${formatCurrency(entry.paid)} versés`}
                          />
                        ) : null}
                        {entry.projected > 0 ? (
                          <div
                            className={styles.chartBarProjected}
                            style={{ height: `${projectedHeight}%` }}
                            title={`${entry.label}: ${formatCurrency(entry.projected)} projetés`}
                          />
                        ) : null}
                      </div>
                      <strong className={styles.chartValue}>{formatCurrency(entry.total)}</strong>
                      <span className={styles.chartLabel}>{entry.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>Lecture globale</div>
                  <h3 className={styles.sectionTitle}>Repères utiles</h3>
                </div>
              </div>

              <div className={styles.insightList}>
                <div className={styles.insightCard}>
                  <span className={styles.metricLabel}>Revenu annuel projeté</span>
                  <strong className={styles.metricValue}>
                    {formatCurrency(portfolio.summary.projectedAnnualIncome)}
                  </strong>
                </div>
                <div className={styles.insightCard}>
                  <span className={styles.metricLabel}>Diversification</span>
                  <strong className={styles.metricValue}>
                    {portfolio.summary.diversificationCount} marché(s)
                  </strong>
                </div>
                <div className={styles.insightCard}>
                  <span className={styles.metricLabel}>Tendance actuelle</span>
                  <strong className={styles.metricValue}>
                    {portfolio.summary.currentValuation >= portfolio.summary.totalInvested
                      ? 'Exposition stable'
                      : 'Sous le prix d’entrée'}
                  </strong>
                </div>
              </div>
            </article>
          </div>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.eyebrow}>Historique récent</div>
                <h3 className={styles.sectionTitle}>3 derniers achats</h3>
              </div>
              <Link href="/portefeuille/historique" className={styles.secondaryLink}>
                Voir tout
              </Link>
            </div>

            {portfolio.recentPurchases.length === 0 ? (
              <div className={styles.emptyState}>
                Aucun achat confirmé n’a encore été enregistré.
              </div>
            ) : (
              <div className={styles.recentList}>
                {portfolio.recentPurchases.map((purchase) => (
                  <article key={purchase.id} className={styles.recentCard}>
                    <div className={styles.recentHeader}>
                      <div>
                        <strong className={styles.recentTitle}>
                          {purchase.property.name}
                        </strong>
                        <div className={styles.recentMeta}>
                          {formatDate(purchase.purchasedAt)} · {purchase.amount} part(s)
                        </div>
                      </div>
                      <strong className={styles.recentAmount}>
                        {formatCurrency(purchase.totalPrice)}
                      </strong>
                    </div>

                    <div className={styles.recentActions}>
                      <Link
                        href={`/opportunites/${purchase.property.id}`}
                        className={styles.secondaryLink}
                      >
                        Voir l’actif
                      </Link>
                      <a
                        href={buildExplorerTransactionUrl(purchase.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.secondaryLink}
                      >
                        Voir la transaction
                      </a>
                      {purchase.property.contractAddress ? (
                        <a
                          href={buildExplorerAddressUrl(purchase.property.contractAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.secondaryLink}
                        >
                          Voir le contrat
                        </a>
                      ) : null}
                      {purchase.toWallet ? (
                        <a
                          href={buildExplorerAddressUrl(purchase.toWallet)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.secondaryLink}
                        >
                          Voir l’adresse wallet
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <div className={styles.positionList}>
            {portfolio.positions.map((position) => {
              const coverImage = resolveAssetUrl(position.property.images[0]);

              return (
                <article key={position.id} className={styles.positionCard}>
                  <div
                    className={coverImage ? styles.positionMedia : styles.positionMediaPlaceholder}
                    style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
                  />

                  <div className={styles.positionBody}>
                    <div className={styles.positionHeader}>
                      <div>
                        <h4 className={styles.positionTitle}>{position.property.name}</h4>
                        <p className={styles.positionLocation}>{position.property.localization}</p>
                      </div>
                      <span className={styles.positionPill}>
                        {position.tokenAmount} parts
                      </span>
                    </div>

                    <div className={styles.positionMetrics}>
                      <div className={styles.positionMetric}>
                        <span className={styles.metricLabel}>Investi</span>
                        <strong>{formatCurrency(position.investedTotal)}</strong>
                      </div>
                      <div className={styles.positionMetric}>
                        <span className={styles.metricLabel}>Valeur actuelle</span>
                        <strong>{formatCurrency(position.currentValuation)}</strong>
                      </div>
                      <div className={styles.positionMetric}>
                        <span className={styles.metricLabel}>Revenu mensuel projeté</span>
                        <strong>{formatCurrency(position.projectedMonthlyIncome)}</strong>
                      </div>
                      <div className={styles.positionMetric}>
                        <span className={styles.metricLabel}>Rendement annuel</span>
                        <strong>{position.projectedAnnualYieldPercent}%</strong>
                      </div>
                      <div className={styles.positionMetric}>
                        <span className={styles.metricLabel}>Prix moyen</span>
                        <strong>{formatCurrency(position.averageTokenPrice)}</strong>
                      </div>
                      <div className={styles.positionMetric}>
                        <span className={styles.metricLabel}>Dernier achat</span>
                        <strong>{formatDate(position.lastPurchaseAt)}</strong>
                      </div>
                    </div>

                    <div className={styles.positionFooter}>
                      <div className={styles.positionNext}>
                        <span className={styles.metricLabel}>Prochaine distribution</span>
                        <strong>
                          {position.nextRevenue
                            ? `${position.nextRevenue.label} · ${formatCurrency(position.nextRevenue.amount)}`
                            : 'À venir'}
                        </strong>
                      </div>

                      <div className={styles.positionActions}>
                        <Link
                          href={`/opportunites/${position.property.id}`}
                          className={styles.secondaryLink}
                        >
                          Voir l’actif
                        </Link>
                        {position.property.contractAddress ? (
                          <a
                            href={buildExplorerAddressUrl(position.property.contractAddress)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.secondaryLink}
                          >
                            Voir le contrat
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
