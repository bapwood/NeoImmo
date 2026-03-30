'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { readStoredSession } from '@/src/lib/auth';
import { ApiError, resolveAssetUrl } from '@/src/lib/api';
import { buildExplorerAddressUrl } from '@/src/lib/explorer';
import {
  fetchOpportunityById,
  getOpportunityAvailabilityLabel,
  isOpportunityOpenForPurchase,
} from '@/src/lib/opportunities';
import type { AuthSession, PropertyRecord } from '@/src/lib/types';
import ClientPurchasePanel from '@/src/components/dashboard/client-purchase-panel';
import styles from './styles/page.module.css';

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} €`;
}

function GalleryArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}
      aria-hidden="true"
    >
      <path
        d="M9 18L15 12L9 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = readStoredSession();

      if (!session) {
        router.replace('/signin');
        return;
      }

      setSession(session);

      const propertyId = Number(params.id);

      if (!Number.isFinite(propertyId)) {
        setError('Fiche introuvable.');
        setLoading(false);
        return;
      }

      try {
        const item = await fetchOpportunityById(propertyId, session);

        if (cancelled) {
          return;
        }

        if (!item) {
          setError('Cette opportunité n’est pas disponible à la consultation.');
          setLoading(false);
          return;
        }

        setProperty(item);
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        if (caughtError instanceof ApiError && caughtError.code === 'AUTH_EXPIRED') {
          router.replace('/signin');
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Impossible de charger la fiche actif.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [property?.id]);

  if (loading) {
    return (
      <main className={styles.pageShell}>
        <div className={styles.pageHeader}>
          <Link href="/?panel=opportunities" className={styles.ghostLink}>
            Retour au catalogue
          </Link>
        </div>
        <section className={styles.emptyStateCard}>
          Chargement de la fiche actif...
        </section>
      </main>
    );
  }

  if (!property) {
    return (
      <main className={styles.pageShell}>
        <div className={styles.pageHeader}>
          <Link href="/?panel=opportunities" className={styles.ghostLink}>
            Retour au catalogue
          </Link>
        </div>
        <section className={styles.emptyStateCard}>
          {error ?? 'Fiche actif introuvable.'}
        </section>
      </main>
    );
  }

  const galleryImages =
    property.images.length > 0
      ? property.images.map((image) => resolveAssetUrl(image))
      : [null, null, null];
  const hasGallery = property.images.length > 0;
  const imageCount = property.images.length;
  const safeActiveImageIndex =
    hasGallery && activeImageIndex >= imageCount ? 0 : activeImageIndex;
  const heroImage = hasGallery ? property.images[safeActiveImageIndex] : null;
  const openForPurchase = isOpportunityOpenForPurchase(property);
  const availabilityLabel = getOpportunityAvailabilityLabel(property);

  function showPreviousImage() {
    if (imageCount <= 1) {
      return;
    }

    setActiveImageIndex((currentIndex) =>
      currentIndex === 0 ? imageCount - 1 : currentIndex - 1,
    );
  }

  function showNextImage() {
    if (imageCount <= 1) {
      return;
    }

    setActiveImageIndex((currentIndex) =>
      currentIndex === imageCount - 1 ? 0 : currentIndex + 1,
    );
  }

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{property.name}</h1>
          <p className={styles.headerCopy}>
            Analyse détaillée d’un actif disponible au catalogue NeoImmo.
          </p>
        </div>

        <div className={styles.pageActions}>
          <Link href="/?panel=opportunities" className={styles.ghostLink}>
            Retour au catalogue
          </Link>
          <Link
            href="/"
            className={styles.dashboardLink}
            aria-label="Retour au tableau de bord"
            title="Retour au tableau de bord"
          >
            <span className={styles.dashboardLogo} aria-hidden="true">
              N
            </span>
          </Link>
        </div>
      </div>

      <section className={styles.heroGrid}>
        <article className={styles.heroCard}>
          <div
            className={heroImage ? styles.heroMedia : styles.heroMediaPlaceholder}
            style={
              heroImage
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(20, 32, 51, 0.08), rgba(20, 32, 51, 0.44)), url(${heroImage})`,
                  }
                : undefined
            }
          >
            <span className={openForPurchase ? styles.statusPillActive : styles.statusPillInactive}>
              {availabilityLabel}
            </span>
            {imageCount > 1 ? (
              <>
                <button
                  type="button"
                  className={styles.mediaArrowLeft}
                  onClick={showPreviousImage}
                  aria-label="Voir l’image précédente"
                >
                  <GalleryArrowIcon direction="left" />
                </button>
                <button
                  type="button"
                  className={styles.mediaArrowRight}
                  onClick={showNextImage}
                  aria-label="Voir l’image suivante"
                >
                  <GalleryArrowIcon direction="right" />
                </button>
                <div className={styles.mediaCounter}>
                  {safeActiveImageIndex + 1} / {imageCount}
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.gallery}>
            {galleryImages.map((image, index) => (
              <button
                type="button"
                key={`${image ?? 'placeholder'}-${index}`}
                className={
                  !image
                    ? styles.galleryItemPlaceholder
                    : index === safeActiveImageIndex
                      ? styles.galleryItemActive
                      : styles.galleryItem
                }
                style={
                  image
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(20, 32, 51, 0.08), rgba(20, 32, 51, 0.32)), url(${image})`,
                      }
                    : undefined
                }
                onClick={image ? () => setActiveImageIndex(index) : undefined}
                aria-label={
                  image
                    ? `Afficher la photo ${index + 1}`
                    : `Visuel indisponible ${index + 1}`
                }
                aria-pressed={image ? index === safeActiveImageIndex : undefined}
                disabled={!image}
              />
            ))}
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.eyebrow}>Synthèse d’investissement</div>
          <h2>{property.localization}</h2>
          <p className={styles.summaryCopy}>
            {property.description}
          </p>

          <div className={styles.kpis}>
            <div>
              <span>Surface</span>
              <strong>{property.livingArea}</strong>
            </div>
            <div>
              <span>Pièces</span>
              <strong>{property.roomNumber}</strong>
            </div>
            <div>
              <span>Salles de bain</span>
              <strong>{property.bathroomNumber}</strong>
            </div>
            <div>
              <span>Score</span>
              <strong>{property.score}/5</strong>
            </div>
          </div>

          <div className={styles.tokenBox}>
            <div>
              <span>Prix facial du token</span>
              <strong>{formatCurrency(property.tokenPrice)}</strong>
            </div>
            <div>
              <span>Volume proposé</span>
              <strong>{property.tokenNumber} tokens</strong>
            </div>
            <div>
              <span>Statut achat</span>
              <strong>{openForPurchase ? 'Ouvert aux clients' : 'Retiré de l’achat'}</strong>
            </div>
          </div>

          {(property.contractAddress || session?.user.walletAddress) ? (
            <div className={styles.summaryActions}>
              {property.contractAddress ? (
                <a
                  href={buildExplorerAddressUrl(property.contractAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.summaryLink}
                >
                  Voir le contrat
                </a>
              ) : null}
              {session?.user.walletAddress ? (
                <a
                  href={buildExplorerAddressUrl(session.user.walletAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.summaryLink}
                >
                  Voir l’adresse wallet
                </a>
              ) : null}
            </div>
          ) : null}

          {!openForPurchase ? (
            <div className={styles.purchaseNotice}>
              Cet actif reste visible au catalogue, mais il n’est pas actuellement ouvert à l’achat client.
            </div>
          ) : null}
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.sectionCard}>
          <div className={styles.eyebrow}>Positionnement</div>
          <h3>Lecture de l’actif</h3>
          <p className={styles.sectionCopy}>
            Cette fiche centralise les informations clés utiles à l’analyse:
            emplacement, niveau de qualité perçu, configuration du bien et
            structure de l’offre. Elle sert de base de lecture commune pour
            l’étude de chaque actif publié au catalogue.
          </p>
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.eyebrow}>Points clés</div>
          <h3>Attributs distinctifs</h3>
          {property.keyPoints.length > 0 ? (
            <ul className={styles.detailList}>
              {property.keyPoints.map((keyPoint) => (
                <li key={keyPoint}>{keyPoint}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.sectionCopy}>
              Les attributs différenciants de cet actif seront précisés
              prochainement par l’équipe de gestion.
            </p>
          )}
        </article>
      </section>

      <ClientPurchasePanel
        property={property}
        session={session}
        onPurchaseSuccess={() => router.push('/?panel=property')}
      />
    </main>
  );
}
