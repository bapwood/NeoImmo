'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { FieldConfig, ResourceConfig } from '@/src/lib/dashboard-resources';
import { ApiError, requestJson } from '@/src/lib/api';
import type { AuthSession, PanelUser } from '@/src/lib/types';
import type { Notice } from './types';
import {
  formatBirthDate,
  formatDate,
  getClientKycReadiness,
  getClientKycReadinessTotal,
  getClientProfileCompletion,
  getClientProfileCompletionTotal,
  getUserInitials,
  summarizeName,
} from './utils';
import styles from './styles/profile-panel.module.css';

type FormState = Record<string, string>;

type ProfileSection = {
  key: string;
  title: string;
  description: string;
  fieldKeys: string[];
};

type DashboardProfilePanelProps = {
  resource: ResourceConfig;
  session: AuthSession;
  user: PanelUser;
  onProfileUpdated: (user: PanelUser) => void;
  onSessionExpired: () => void;
};

const profileSections: ProfileSection[] = [
  {
    key: 'identity',
    title: 'Identité',
    description: 'Les informations civiles utilisées dans votre espace investisseur.',
    fieldKeys: [
      'firstName',
      'lastName',
      'email',
      'number',
      'day',
      'month',
      'year',
      'birthPlace',
      'nationality',
    ],
  },
  {
    key: 'address',
    title: 'Coordonnées',
    description: 'Vos coordonnées de résidence et les éléments de contact principaux.',
    fieldKeys: ['address', 'postalCode', 'city', 'country', 'taxResidence'],
  },
  {
    key: 'investor',
    title: 'Profil investisseur',
    description: 'Des données utiles pour préparer les futurs parcours de conformité et de KYC.',
    fieldKeys: ['occupation', 'annualIncomeRange', 'investmentObjective'],
  },
  {
    key: 'security',
    title: 'Sécurité',
    description: 'Laissez le mot de passe vide si vous ne souhaitez pas le modifier.',
    fieldKeys: ['password'],
  },
];

function buildFormState(resource: ResourceConfig, user: PanelUser): FormState {
  return Object.fromEntries(
    resource.fields.map((field) => {
      const value = user[field.key as keyof PanelUser];
      return [field.key, value == null ? '' : String(value)];
    }),
  );
}

function inputTypeFor(field: FieldConfig) {
  if (field.kind === 'email' || field.kind === 'password') {
    return field.kind;
  }

  return 'text';
}

function normalizeFieldValue(field: FieldConfig, rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === '') {
    return undefined;
  }

  return field.kind === 'select' ? trimmedValue : trimmedValue;
}

function fieldLabel(value: string | null | undefined, field?: FieldConfig) {
  if (!value || value.trim() === '') {
    return 'Non renseigné';
  }

  if (!field?.options) {
    return value;
  }

  return field.options.find((option) => option.value === value)?.label ?? value;
}

export default function DashboardProfilePanel({
  resource,
  session,
  user,
  onProfileUpdated,
  onSessionExpired,
}: DashboardProfilePanelProps) {
  const [formState, setFormState] = useState<FormState>(() => buildFormState(resource, user));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const profileCompletion = getClientProfileCompletion(user);
  const profileCompletionTotal = getClientProfileCompletionTotal();
  const kycReadiness = getClientKycReadiness(user);
  const kycReadinessTotal = getClientKycReadinessTotal();
  const fieldsByKey = useMemo(
    () => Object.fromEntries(resource.fields.map((field) => [field.key, field])),
    [resource.fields],
  );

  useEffect(() => {
    setFormState(buildFormState(resource, user));
  }, [resource, user]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const payload = Object.fromEntries(
        resource.fields
          .map((field) => [
            field.key,
            normalizeFieldValue(field, formState[field.key] ?? ''),
          ])
          .filter(([, value]) => value !== undefined),
      );

      const updatedUser = await requestJson<PanelUser>(
        '/user/me',
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        session,
      );

      onProfileUpdated(updatedUser);
      setFormState(buildFormState(resource, updatedUser));
      setNotice({
        tone: 'success',
        message: 'Votre profil a été mis à jour.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_EXPIRED') {
        onSessionExpired();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Mise à jour du profil impossible.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.profileLayout}>
      <article className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.identity}>
            <div className={styles.avatar}>{getUserInitials(user)}</div>
            <div>
              <div className={styles.eyebrow}>Mon compte</div>
              <h3>{summarizeName(user)}</h3>
              <p>
                Centralisez vos informations personnelles, fiscales et investisseur
                pour préparer les futurs parcours KYC sans repasser par plusieurs écrans.
              </p>
              <div className={styles.metaLine}>
                <span
                  className={
                    session.user.role === 'ADMIN'
                      ? styles.rolePillAdmin
                      : styles.rolePillClient
                  }
                >
                  {session.user.role}
                </span>
                <span className={styles.metaPill}>{user.email}</span>
                <span className={styles.metaPill}>Membre depuis {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Complétude</span>
            <strong>
              {profileCompletion}/{profileCompletionTotal}
            </strong>
            <p>Champs stratégiques actuellement renseignés.</p>
          </div>
          <div className={styles.statCard}>
            <span>KYC-ready</span>
            <strong>
              {kycReadiness}/{kycReadinessTotal}
            </strong>
            <p>Données déjà exploitables pour un futur parcours de conformité.</p>
          </div>
          <div className={styles.statCard}>
            <span>Naissance</span>
            <strong>{formatBirthDate(user)}</strong>
            <p>
              {user.birthPlace?.trim()
                ? `Lieu de naissance: ${user.birthPlace}`
                : 'Lieu de naissance non renseigné.'}
            </p>
          </div>
        </div>
      </article>

      <div className={styles.contentGrid}>
        <article className={styles.formCard}>
          <div>
            <div className={styles.eyebrow}>Édition</div>
            <h3>Fiche profil client</h3>
            <p>
              Cette page remplace la table brute pour vous proposer un espace profil
              directement exploitable, plus lisible et plus proche d’un vrai onboarding.
            </p>
          </div>

          {notice ? (
            <div className={notice.tone === 'success' ? styles.noticeSuccess : styles.noticeError}>
              {notice.message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={styles.sectionGrid}>
            {profileSections.map((section) => {
              const sectionFields = section.fieldKeys
                .map((fieldKey) => fieldsByKey[fieldKey])
                .filter((field): field is FieldConfig => Boolean(field));

              return (
                <section key={section.key} className={styles.sectionCard}>
                  <div>
                    <div className={styles.eyebrow}>{section.title}</div>
                    <h4>{section.title}</h4>
                    <p>{section.description}</p>
                  </div>

                  <div className={styles.fieldsGrid}>
                    {sectionFields.map((field) => {
                      const isFullWidth =
                        field.key === 'address' || field.key === 'password';
                      const fieldClassName = isFullWidth ? styles.fieldFull : styles.field;

                      return (
                        <label key={field.key} className={fieldClassName}>
                          <span>
                            {field.label}
                            {field.required ? ' *' : ''}
                          </span>

                          {field.kind === 'select' ? (
                            <select
                              name={field.key}
                              value={formState[field.key] ?? ''}
                              onChange={handleInputChange}
                              required={field.required}
                            >
                              <option value="">Sélectionner</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
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

                          {field.helperText ? <small>{field.helperText}</small> : null}
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setFormState(buildFormState(resource, user));
                  setNotice(null);
                }}
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </article>

        <aside className={styles.sideCard}>
          <div>
            <div className={styles.eyebrow}>Synthèse</div>
            <h3>Lecture rapide</h3>
            <p>
              Un point de lecture métier sur les informations déjà saisies et celles
              qu’il faudra stabiliser pour un vrai workflow KYC.
            </p>
          </div>

          <section className={styles.sideSection}>
            <div className={styles.eyebrow}>Identité client</div>
            <div className={styles.sideList}>
              <div className={styles.sideListRow}>
                <span>Nom complet</span>
                <strong>{summarizeName(user)}</strong>
              </div>
              <div className={styles.sideListRow}>
                <span>Téléphone</span>
                <strong>{user.number?.trim() ? user.number : 'Non renseigné'}</strong>
              </div>
              <div className={styles.sideListRow}>
                <span>Nationalité</span>
                <strong>{user.nationality?.trim() ? user.nationality : 'Non renseignée'}</strong>
              </div>
              <div className={styles.sideListRow}>
                <span>Profession</span>
                <strong>{user.occupation?.trim() ? user.occupation : 'Non renseignée'}</strong>
              </div>
            </div>
          </section>

          <section className={styles.sideSection}>
            <div className={styles.eyebrow}>Préparation KYC</div>
            <p>
              Les données déjà présentes permettent de préremplir une bonne partie
              d’un futur parcours de vérification.
            </p>
            <ul className={styles.readyList}>
              <li>Identité civile et coordonnées de résidence</li>
              <li>Nationalité et lieu de naissance</li>
              <li>Résidence fiscale et profession</li>
              <li>Tranche de revenus et objectif d’investissement</li>
            </ul>
          </section>

          <section className={styles.sideSection}>
            <div className={styles.eyebrow}>Profil investisseur</div>
            <div className={styles.sideList}>
              <div className={styles.sideListRow}>
                <span>Revenus annuels</span>
                <strong>
                  {fieldLabel(user.annualIncomeRange, fieldsByKey.annualIncomeRange)}
                </strong>
              </div>
              <div className={styles.sideListRow}>
                <span>Objectif</span>
                <strong>
                  {fieldLabel(
                    user.investmentObjective,
                    fieldsByKey.investmentObjective,
                  )}
                </strong>
              </div>
              <div className={styles.sideListRow}>
                <span>Résidence fiscale</span>
                <strong>{user.taxResidence?.trim() ? user.taxResidence : 'Non renseignée'}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
