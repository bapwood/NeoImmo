'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { FieldConfig, ResourceConfig } from '@/src/lib/dashboard-resources';
import { ApiError, requestJson } from '@/src/lib/api';
import type { AuthSession, PanelUser } from '@/src/lib/types';
import {
  PropertyIcon,
  ShieldIcon,
  TokenIcon,
  UsersIcon,
  WalletIcon,
} from '../icons';
import type { Notice, PanelIcon } from './types';
import {
  formatBirthDate,
  formatDate,
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
  icon: PanelIcon;
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
    icon: UsersIcon,
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
    icon: PropertyIcon,
    fieldKeys: ['address', 'postalCode', 'city', 'country', 'taxResidence'],
  },
  {
    key: 'investor',
    title: 'Profil investisseur',
    description: 'Des données utiles pour préparer les futurs parcours de conformité et de KYC.',
    icon: TokenIcon,
    fieldKeys: ['occupation', 'annualIncomeRange', 'investmentObjective'],
  },
  {
    key: 'wallet',
    title: 'Wallet & on-chain',
    description: 'La wallet principale et le code pays qui serviront au futur parcours crypto/KYC.',
    icon: WalletIcon,
    fieldKeys: ['walletAddress', 'countryCode'],
  },
  {
    key: 'security',
    title: 'Sécurité',
    icon: ShieldIcon,
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
  const fieldsByKey = useMemo(
    () => Object.fromEntries(resource.fields.map((field) => [field.key, field])),
    [resource.fields],
  );
  const [canModify, setCanModify] = useState<boolean>(false);

  useEffect(() => {
    setFormState(buildFormState(resource, user));
  }, [resource, user]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#wallet-on-chain') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      document
        .getElementById('wallet-on-chain')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
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

        {session.user.role === 'CLIENT' && user.walletStatus !== 'VERIFIED' ? (
          <div className={styles.kycBanner}>
            <strong>Compte en attente de validation</strong>
            <p>
              Votre KYC doit encore être validé par un administrateur avant de
              pouvoir acheter des parts. Complétez votre profil ci-dessous si
              ce n’est pas déjà fait — vous serez notifié une fois votre
              compte validé.
            </p>
          </div>
        ) : null}

        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Complétude</span>
            <strong>
              {profileCompletion}/{profileCompletionTotal}
            </strong>
            <p>Champs stratégiques actuellement renseignés.</p>
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

        <article className={styles.formCard}>
          <div>
            <div className={styles.divHeader}>
              <div>
                <div className={styles.eyebrow}>Édition</div>
                <h3>Fiche profil client</h3>
              </div>
              <button
                type="button"
                className={canModify ? styles.modifyButtonClicked : styles.modifyButton}
                onClick={() => setCanModify(!canModify)}
              >
                {canModify ? 'Verrouiller' : 'Modifier'}
              </button>
            </div>
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

              const Icon = section.icon;

              return (
                <section
                  key={section.key}
                  id={section.key === 'wallet' ? 'wallet-on-chain' : undefined}
                  className={
                    section.key === 'wallet'
                      ? `${styles.sectionCard} ${styles.anchorSection}`
                      : styles.sectionCard
                  }
                >
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                      <Icon className={styles.sectionIconGlyph} />
                    </div>
                    <div>
                      <h4>{section.title}</h4>
                      <p>{section.description}</p>
                    </div>
                  </div>

                  {section.key === 'wallet' ? (
                    <div className={styles.fieldsGrid}>
                      <div className={styles.fieldFull}>
                        <span>Wallet liée au compte</span>
                        <div
                          className={styles.walletAddressBox}
                          data-empty={!user.walletAddress || undefined}
                        >
                          {user.walletAddress || 'Aucune wallet liée'}
                        </div>
                        <small>
                          Connectez MetaMask depuis la barre en haut — l&apos;adresse est automatiquement sauvegardée.
                        </small>
                      </div>
                      {sectionFields.filter(f => f.key !== 'walletAddress').map((field) => (
                        <label key={field.key} className={styles.field}>
                          <span>{field.label}{field.required ? ' *' : ''}</span>
                          <input
                            name={field.key}
                            type={inputTypeFor(field)}
                            value={formState[field.key] ?? ''}
                            onChange={handleInputChange}
                            placeholder={field.placeholder}
                            required={field.required}
                            disabled={!canModify}
                          />
                          {field.helperText ? <small>{field.helperText}</small> : null}
                        </label>
                      ))}
                    </div>
                  ) : (
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
                              disabled={!canModify}
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
                              disabled={!canModify}
                            />
                          )}

                          {field.helperText ? <small>{field.helperText}</small> : null}
                        </label>
                      );
                    })}
                  </div>
                  )}
                </section>
              );
            })}

            {canModify ? (
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
                    setCanModify(false);
                  }}
                >
                  Annuler
                </button>
              </div>
            ) : null}
          </form>
        </article>
    </section>
  );
}
