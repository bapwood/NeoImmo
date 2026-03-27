'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, requestJson, resolveAssetUrl } from '@/src/lib/api';
import { readStoredSession } from '@/src/lib/auth';
import { propertyFields, type FieldConfig } from '@/src/lib/dashboard-resources';
import type { AuthSession, PropertyRecord } from '@/src/lib/types';
import OpportunityCard from './opportunity-card';
import styles from './styles/property-editor.module.css';

type PropertyEditorProps = {
  mode: 'create' | 'edit';
  propertyId?: number;
};

type FormState = Record<string, string>;
type Notice = {
  tone: 'error';
  message: string;
} | null;

type UploadedPropertyImages = {
  images: string[];
};

function buildEmptyForm(): FormState {
  return Object.fromEntries(propertyFields.map((field) => [field.key, '']));
}

function propertyToFormState(property: PropertyRecord): FormState {
  return Object.fromEntries(
    propertyFields.map((field) => {
      const value = property[field.key as keyof PropertyRecord];

      if (Array.isArray(value)) {
        return [field.key, value.join('\n')];
      }

      return [field.key, value == null ? '' : String(value)];
    }),
  );
}

function inputTypeFor(field: FieldConfig) {
  return field.kind === 'number' ? 'number' : 'text';
}

function normalizeFieldValue(field: FieldConfig, rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (field.kind === 'number') {
    return Number(trimmedValue);
  }

  if (field.kind === 'array') {
    return trimmedValue
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return trimmedValue;
}

function buildPayload(formState: FormState) {
  return Object.fromEntries(
    propertyFields.map((field) => [
      field.key,
      normalizeFieldValue(field, formState[field.key] ?? ''),
    ]),
  );
}

function parseNumberValue(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function parseArrayValue(value: string | undefined) {
  return (value ?? '')
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function PropertyEditor({
  mode,
  propertyId,
}: PropertyEditorProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [formState, setFormState] = useState<FormState>(() => buildEmptyForm());
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        router.replace('/signin');
        return;
      }

      setSession(storedSession);

      if (mode === 'create') {
        setLoading(false);
        return;
      }

      if (!propertyId || !Number.isFinite(propertyId)) {
        setNotice({
          tone: 'error',
          message: 'Bien introuvable.',
        });
        setLoading(false);
        return;
      }

      try {
        const property = await requestJson<PropertyRecord>(
          `/property/manage/${encodeURIComponent(String(propertyId))}`,
          undefined,
          storedSession,
        );

        if (cancelled) {
          return;
        }

        setFormState(propertyToFormState(property));
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError && error.code === 'AUTH_EXPIRED') {
          router.replace('/signin');
          return;
        }

        setNotice({
          tone: 'error',
          message:
            error instanceof Error ? error.message : 'Chargement du bien impossible.',
        });
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
  }, [mode, propertyId, router]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      await requestJson<PropertyRecord>(
        mode === 'edit'
          ? `/property/${encodeURIComponent(String(propertyId))}`
          : '/property',
        {
          method: mode === 'edit' ? 'PATCH' : 'POST',
          body: JSON.stringify(buildPayload(formState)),
        },
        session,
      );

      router.push('/?panel=property');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_EXPIRED') {
        router.replace('/signin');
        return;
      }

      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Enregistrement impossible.',
      });
    } finally {
      setSaving(false);
    }
  }

  function updateImages(nextImages: string[]) {
    setFormState((current) => ({
      ...current,
      images: nextImages.join('\n'),
    }));
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files ?? []);

    if (!session || files.length === 0) {
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    setUploadingImages(true);
    setImageUploadError(null);

    try {
      const response = await requestJson<UploadedPropertyImages>(
        '/property/images/upload',
        {
          method: 'POST',
          body: formData,
        },
        session,
      );

      updateImages([...imagePreviewUrls, ...response.images]);
    } catch (error) {
      setImageUploadError(
        error instanceof Error ? error.message : 'Upload des images impossible.',
      );
    } finally {
      setUploadingImages(false);
      input.value = '';
    }
  }

  function moveImage(imageIndex: number, direction: -1 | 1) {
    const nextIndex = imageIndex + direction;

    if (nextIndex < 0 || nextIndex >= imagePreviewUrls.length) {
      return;
    }

    const nextImages = [...imagePreviewUrls];
    const [movedImage] = nextImages.splice(imageIndex, 1);
    nextImages.splice(nextIndex, 0, movedImage);
    updateImages(nextImages);
  }

  function removeImage(imageIndex: number) {
    updateImages(imagePreviewUrls.filter((_, index) => index !== imageIndex));
  }

  const imagePreviewUrls = parseArrayValue(formState.images);
  const keyPointPreview = parseArrayValue(formState.keyPoints);
  const previewProperty: PropertyRecord = {
    id: propertyId ?? 0,
    createdAt: new Date().toISOString(),
    ownerId: session?.user.id ?? null,
    name: formState.name?.trim() || 'Nom du bien',
    localization: formState.localization?.trim() || 'Localisation à compléter',
    livingArea: formState.livingArea?.trim() || 'Surface à compléter',
    score: parseNumberValue(formState.score, 0),
    description:
      formState.description?.trim() ||
      'La description client apparaîtra ici dès que vous aurez renseigné le contenu du bien.',
    roomNumber: parseNumberValue(formState.roomNumber, 0),
    bathroomNumber: parseNumberValue(formState.bathroomNumber, 0),
    tokenNumber: parseNumberValue(formState.tokenNumber, 0),
    tokenPrice: parseNumberValue(formState.tokenPrice, 0),
    images: imagePreviewUrls,
    keyPoints: keyPointPreview,
  };

  return (
    <main className={styles.pageShell}>
      <header className={styles.headerCard}>
        <div>
          <div className={styles.eyebrow}>Actifs</div>
          <h1>
            {mode === 'edit'
              ? `Actif modifier : ${propertyId}`
              : 'Ajouter un bien'}
          </h1>        
          </div>
        <div className={styles.headerActions}>
          <Link href="/?panel=property" className={styles.ghostLink}>
            Retour aux actifs
          </Link>
          <Link href="/" className={styles.dashboardLink} aria-label="Retour au tableau de bord">
            <span className={styles.dashboardLogo} aria-hidden="true">
              N
            </span>
          </Link>
        </div>
      </header>

      <section className={styles.grid}>
        <article className={styles.formCard}>
          <div className={styles.resourceHeader}>
            <div>
              <div className={styles.eyebrow}>Formulaire</div>
              <h3>{mode === 'edit' ? 'Édition de l’actif' : 'Création de l’actif'}</h3>
              <p className={styles.sectionCopy}>
                Tous les champs ci-dessous alimentent directement la présentation
                du bien dans l’interface.
              </p>
            </div>
          </div>

          {notice ? (
            <div className={styles.noticeError}>{notice.message}</div>
          ) : null}

          {loading ? (
            <div className={styles.emptyState}>Chargement du bien...</div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.formGrid}>
              {propertyFields.map((field) => {
                if (field.key === 'images') {
                  return (
                    <div key={field.key} className={styles.fieldFull}>
                      <span className={styles.fieldLabel}>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>

                      <div className={styles.imageUploader}>
                        <div className={styles.uploadToolbar}>
                          <label className={styles.uploadButton}>
                            <input
                              className={styles.uploadInput}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              disabled={uploadingImages}
                            />
                            {uploadingImages ? 'Upload en cours...' : 'Uploader des images'}
                          </label>
                          <span className={styles.uploadHint}>
                            La première image sera utilisée comme visuel principal de la carte client.
                          </span>
                        </div>

                        {field.helperText ? (
                          <small className={styles.helperText}>{field.helperText}</small>
                        ) : null}

                        {imageUploadError ? (
                          <div className={styles.noticeError}>{imageUploadError}</div>
                        ) : null}

                        {imagePreviewUrls.length === 0 ? (
                          <div className={styles.emptyState}>
                            Aucune image uploadée pour le moment.
                          </div>
                        ) : (
                          <div className={styles.imageGrid}>
                            {imagePreviewUrls.map((imageUrl, index) => (
                              <article key={`${imageUrl}-${index}`} className={styles.imageCard}>
                                <div
                                  className={styles.imageCardMedia}
                                  style={{
                                    backgroundImage: `url(${resolveAssetUrl(imageUrl)})`,
                                  }}
                                />
                                <div className={styles.imageCardMeta}>
                                  <strong>Image {index + 1}</strong>
                                  <span>{index === 0 ? 'Image de couverture' : '  '}</span>
                                </div>
                                <div className={styles.imageCardActions}>
                                  <button
                                    type="button"
                                    className={styles.imageActionButton}
                                    onClick={() => moveImage(index, -1)}
                                    disabled={index === 0}
                                  >
                                    Monter
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.imageActionButton}
                                    onClick={() => moveImage(index, 1)}
                                    disabled={index === imagePreviewUrls.length - 1}
                                  >
                                    Descendre
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.removeImageButton}
                                    onClick={() => removeImage(index)}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                const isTextArea = field.kind === 'textarea' || field.kind === 'array';
                const fieldClassName = isTextArea ? styles.fieldFull : styles.field;

                return (
                  <label key={field.key} className={fieldClassName}>
                    <span className={styles.fieldLabel}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </span>

                    {isTextArea ? (
                      <textarea
                        name={field.key}
                        value={formState[field.key] ?? ''}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        required={field.required}
                        rows={field.kind === 'textarea' ? 6 : 5}
                      />
                    ) : (
                      <input
                        name={field.key}
                        type={inputTypeFor(field)}
                        value={formState[field.key] ?? ''}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}

                    {field.helperText ? <small className={styles.helperText}>{field.helperText}</small> : null}
                  </label>
                );
              })}

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving
                    ? 'Enregistrement...'
                    : mode === 'edit'
                      ? 'Mettre à jour'
                      : 'Créer le bien'}
                </button>
                <Link href="/?panel=property" className={styles.secondaryButton}>
                  Annuler
                </Link>
              </div>
            </form>
          )}
        </article>

        <aside className={styles.sideCard}>
          <div className={styles.eyebrow}>Aperçu client</div>
          {loading ? (
            <div className={styles.emptyState}>Préparation de l’aperçu...</div>
          ) : (
            <div className={styles.previewWrap}>
              <OpportunityCard property={previewProperty} interactive={false} />
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
