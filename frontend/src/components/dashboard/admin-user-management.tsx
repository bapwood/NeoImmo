'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getResourceConfigsForRole, type FieldConfig } from '@/src/lib/dashboard-resources';
import { ApiError, requestJson } from '@/src/lib/api';
import { clearStoredSession, readStoredSession } from '@/src/lib/auth';
import { buildExplorerTransactionUrl } from '@/src/lib/explorer';
import type {
  AuthSession,
  BlockchainOperationRecord,
  PanelUser,
} from '@/src/lib/types';
import {
  formatDate,
  getUserInitials,
  summarizeName,
} from './panel/utils';
import baseStyles from './panel/styles/profile-panel.module.css';
import styles from './styles/admin-user-management.module.css';

type ComplianceResponse = {
  user: {
    id: number;
    email: string;
    walletAddress: string | null;
    walletStatus: 'UNSET' | 'PENDING' | 'VERIFIED';
    walletVerifiedAt: string | null;
    kycSyncedAt: string | null;
    countryCode: string | null;
  };
  onChain: {
    available: boolean;
    walletRegistered: boolean;
    allowed: boolean | null;
    onChainCountryCode: string | null;
    walletBlocklisted: boolean | null;
    countryBlocked: boolean | null;
    error: string | null;
  };
  latestOperations: BlockchainOperationRecord[];
};

type FormState = Record<string, string>;
type NoticeState = { tone: 'success' | 'error'; message: string } | null;

type Props = {
  userId: number;
};

const sections: Array<{ key: string; title: string; description: string; fieldKeys: string[] }> = [
  {
    key: 'account',
    title: 'Compte',
    description: 'Identifiants de connexion et niveau d’habilitation.',
    fieldKeys: ['email', 'password', 'role'],
  },
  {
    key: 'identity',
    title: 'Identité',
    description: 'Informations civiles du client.',
    fieldKeys: ['firstName', 'lastName', 'number', 'day', 'month', 'year', 'birthPlace', 'nationality'],
  },
  {
    key: 'address',
    title: 'Coordonnées',
    description: 'Adresse de résidence et éléments fiscaux.',
    fieldKeys: ['address', 'postalCode', 'city', 'country', 'taxResidence'],
  },
  {
    key: 'investor',
    title: 'Profil investisseur',
    description: 'Utilisé pour préqualifier les parcours de conformité.',
    fieldKeys: ['occupation', 'annualIncomeRange', 'investmentObjective'],
  },
  {
    key: 'wallet',
    title: 'Wallet & on-chain',
    description: 'Modifier la wallet réinitialise le statut KYC (une nouvelle synchronisation sera nécessaire).',
    fieldKeys: ['walletAddress', 'countryCode'],
  },
];

function buildFormState(fields: FieldConfig[], user: PanelUser): FormState {
  return Object.fromEntries(
    fields.map((field) => {
      const value = user[field.key as keyof PanelUser];
      return [field.key, value == null ? '' : String(value)];
    }),
  );
}

function normalizeFieldValue(rawValue: string) {
  const trimmed = rawValue.trim();
  return trimmed === '' ? undefined : trimmed;
}

function shortenAddress(value: string | null | undefined) {
  if (!value) return '—';
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function walletStatusBadge(status: ComplianceResponse['user']['walletStatus']) {
  if (status === 'VERIFIED') return { label: 'Wallet vérifiée', cls: 'badgePositive' as const };
  if (status === 'PENDING') return { label: 'Vérification en attente', cls: 'badgeWarning' as const };
  return { label: 'Wallet non liée', cls: 'badgeNeutral' as const };
}

export default function AdminUserManagement({ userId }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<PanelUser | null>(null);
  const [compliance, setCompliance] = useState<ComplianceResponse | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({});
  const [booting, setBooting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingKyc, setSyncingKyc] = useState(false);
  const [togglingRestriction, setTogglingRestriction] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const fields = useMemo(
    () => getResourceConfigsForRole('ADMIN').find((resource) => resource.key === 'user')?.fields ?? [],
    [],
  );
  const fieldsByKey = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.key, field])),
    [fields],
  );

  async function redirectToSignin() {
    clearStoredSession();
    setSession(null);
    router.replace('/signin');
  }

  const loadCompliance = useCallback(
    async (currentSession: AuthSession) => {
      try {
        const result = await requestJson<ComplianceResponse>(
          `/crypto/users/${userId}/compliance`,
          undefined,
          currentSession,
        );
        setCompliance(result);
        setComplianceError(null);
      } catch (requestError) {
        setCompliance(null);
        setComplianceError(
          requestError instanceof Error
            ? requestError.message
            : 'Lecture de la conformité on-chain indisponible.',
        );
      }
    },
    [userId],
  );

  const loadAll = useCallback(
    async (explicitSession?: AuthSession | null) => {
      const currentSession = explicitSession ?? readStoredSession();

      if (!currentSession) {
        await redirectToSignin();
        return;
      }

      if (currentSession.user.role !== 'ADMIN') {
        router.replace('/');
        return;
      }

      if (!Number.isFinite(userId) || userId <= 0) {
        setError('Identifiant utilisateur invalide.');
        setBooting(false);
        return;
      }

      setSession(currentSession);
      setError(null);

      try {
        const userResponse = await requestJson<PanelUser>(
          `/user/${userId}`,
          undefined,
          currentSession,
        );
        setUser(userResponse);
        setFormState(buildFormState(fields, userResponse));
        await loadCompliance(currentSession);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
          await redirectToSignin();
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de charger cet utilisateur.',
        );
      } finally {
        setBooting(false);
      }
    },
    [fields, loadCompliance, router, userId],
  );

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  const walletChanged =
    user != null && (formState.walletAddress ?? '') !== (user.walletAddress ?? '');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (walletChanged && user?.kycSyncedAt) {
      const confirmed = window.confirm(
        'Modifier la wallet réinitialise le statut KYC de ce client (il faudra resynchroniser). Continuer ?',
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const payload = Object.fromEntries(
        fields
          .map((field) => [field.key, normalizeFieldValue(formState[field.key] ?? '')])
          .filter(([, value]) => value !== undefined),
      );

      const updatedUser = await requestJson<PanelUser>(
        `/user/${userId}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        session,
      );

      setUser(updatedUser);
      setFormState(buildFormState(fields, updatedUser));
      setNotice({ tone: 'success', message: 'Fiche utilisateur mise à jour.' });
      if (session) await loadCompliance(session);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'AUTH_EXPIRED') {
        await redirectToSignin();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error ? requestError.message : 'Mise à jour impossible.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRestriction() {
    if (!session || !user) return;

    const nextRestricted = !user.isRestricted;
    const label = nextRestricted ? 'restreindre ce compte' : 'lever la restriction';

    if (!window.confirm(`Confirmer : ${label} ?`)) return;

    setTogglingRestriction(true);
    setNotice(null);

    try {
      const updatedUser = await requestJson<PanelUser>(
        `/user/${userId}/restriction`,
        {
          method: 'POST',
          body: JSON.stringify({ restricted: nextRestricted }),
        },
        session,
      );
      setUser(updatedUser);
      setNotice({
        tone: 'success',
        message: nextRestricted ? 'Compte restreint.' : 'Restriction levée.',
      });
    } catch (requestError) {
      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de modifier la restriction.',
      });
    } finally {
      setTogglingRestriction(false);
    }
  }

  async function handleSyncKyc() {
    if (!session) return;

    setSyncingKyc(true);
    setNotice(null);

    try {
      await requestJson(
        `/crypto/users/${userId}/kyc/sync`,
        { method: 'POST' },
        session,
      );
      setNotice({ tone: 'success', message: 'KYC synchronisé on-chain.' });
      await loadCompliance(session);
    } catch (requestError) {
      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error ? requestError.message : 'Synchronisation KYC impossible.',
      });
    } finally {
      setSyncingKyc(false);
    }
  }

  async function handleDelete() {
    if (!session || !user) return;

    if (
      !window.confirm(
        `Supprimer définitivement le compte ${user.email} ? Cette action est irréversible.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setNotice(null);

    try {
      await requestJson(`/user/${userId}`, { method: 'DELETE' }, session);
      router.push('/?panel=user');
    } catch (requestError) {
      setNotice({
        tone: 'error',
        message:
          requestError instanceof Error ? requestError.message : 'Suppression impossible.',
      });
      setDeleting(false);
    }
  }

  if (booting) {
    return (
      <main className={styles.shell}>
        <section className={styles.surface}>
          <p className={styles.loadingState}>Chargement de la fiche utilisateur...</p>
        </section>
      </main>
    );
  }

  const walletBadge = compliance ? walletStatusBadge(compliance.user.walletStatus) : null;

  return (
    <main className={styles.shell}>
      <section className={styles.surface}>
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => router.push('/?panel=user')}>
            Retour aux utilisateurs
          </button>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={baseStyles.secondaryButton}
              onClick={() => void loadAll(session)}
            >
              Actualiser
            </button>
            {user && user.role !== 'ADMIN' && (
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Suppression...' : 'Supprimer le compte'}
              </button>
            )}
          </div>
        </header>

        {error ? <div className={baseStyles.noticeError}>{error}</div> : null}
        {notice?.tone === 'success' && <div className={baseStyles.noticeSuccess}>{notice.message}</div>}
        {notice?.tone === 'error' && <div className={baseStyles.noticeError}>{notice.message}</div>}

        {user ? (
          <section className={baseStyles.profileLayout}>
            <article className={baseStyles.heroCard}>
              <div className={baseStyles.heroTop}>
                <div className={baseStyles.identity}>
                  <div className={baseStyles.avatar}>{getUserInitials(user)}</div>
                  <div>
                    <div className={baseStyles.eyebrow}>Gestion utilisateur</div>
                    <h3>{summarizeName(user)}</h3>
                    <div className={baseStyles.metaLine}>
                      <span className={user.role === 'ADMIN' ? baseStyles.rolePillAdmin : baseStyles.rolePillClient}>
                        {user.role}
                      </span>
                      <span className={baseStyles.metaPill}>{user.email}</span>
                      <span className={baseStyles.metaPill}>Membre depuis {formatDate(user.createdAt)}</span>
                    </div>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${user.isRestricted ? styles.badgeDanger : styles.badgePositive}`}>
                        {user.isRestricted ? 'Compte restreint' : 'Compte actif'}
                      </span>
                      {walletBadge && (
                        <span className={`${styles.badge} ${styles[walletBadge.cls]}`}>{walletBadge.label}</span>
                      )}
                    </div>
                  </div>
                </div>
                {user.role !== 'ADMIN' && (
                  <button
                    type="button"
                    className={user.isRestricted ? baseStyles.primaryButton : styles.dangerButton}
                    onClick={() => void handleToggleRestriction()}
                    disabled={togglingRestriction}
                  >
                    {togglingRestriction
                      ? 'En cours...'
                      : user.isRestricted
                        ? 'Lever la restriction'
                        : 'Restreindre le compte'}
                  </button>
                )}
              </div>
            </article>

            <div className={styles.contentGrid}>
              <article className={baseStyles.formCard}>
                <div>
                  <div className={baseStyles.eyebrow}>Édition</div>
                  <h3>Fiche complète</h3>
                  <p>Tous les champs sont modifiables par l’administrateur, y compris le rôle.</p>
                </div>

                <form onSubmit={handleSubmit} className={baseStyles.sectionGrid}>
                  {sections.map((section) => {
                    const sectionFields = section.fieldKeys
                      .map((key) => fieldsByKey[key])
                      .filter((field): field is FieldConfig => Boolean(field));

                    return (
                      <section key={section.key} className={baseStyles.sectionCard}>
                        <div>
                          <div className={baseStyles.eyebrow}>{section.title}</div>
                          <h4>{section.title}</h4>
                          <p>{section.description}</p>
                        </div>

                        {section.key === 'wallet' && walletChanged && (
                          <div className={styles.walletWarning}>
                            La wallet a été modifiée — enregistrer réinitialisera le statut KYC de ce client.
                          </div>
                        )}

                        <div className={baseStyles.fieldsGrid}>
                          {sectionFields.map((field) => {
                            const isFullWidth = field.key === 'address' || field.key === 'password';
                            const fieldClassName = isFullWidth ? baseStyles.fieldFull : baseStyles.field;

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
                                    type={field.kind === 'email' || field.kind === 'password' ? field.kind : 'text'}
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

                  <div className={baseStyles.actions}>
                    <button type="submit" className={baseStyles.primaryButton} disabled={saving}>
                      {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                    <button
                      type="button"
                      className={baseStyles.secondaryButton}
                      onClick={() => {
                        setFormState(buildFormState(fields, user));
                        setNotice(null);
                      }}
                    >
                      Réinitialiser
                    </button>
                  </div>
                </form>
              </article>

              <aside className={baseStyles.sideCard}>
                <div>
                  <div className={baseStyles.eyebrow}>Conformité KYC</div>
                  <h3>État on-chain</h3>
                  <p>Statut de vérification stocké en base et sur le registre KYC on-chain.</p>
                </div>

                {complianceError ? (
                  <div className={baseStyles.noticeError}>{complianceError}</div>
                ) : compliance ? (
                  <>
                    <div className={baseStyles.sideList}>
                      <div className={baseStyles.sideListRow}>
                        <span>Wallet</span>
                        <strong title={compliance.user.walletAddress ?? undefined} className={styles.mono}>
                          {shortenAddress(compliance.user.walletAddress)}
                        </strong>
                      </div>
                      <div className={baseStyles.sideListRow}>
                        <span>Code pays</span>
                        <strong>{compliance.user.countryCode ?? '—'}</strong>
                      </div>
                      <div className={baseStyles.sideListRow}>
                        <span>Vérifiée le</span>
                        <strong>
                          {compliance.user.walletVerifiedAt
                            ? formatDate(compliance.user.walletVerifiedAt)
                            : '—'}
                        </strong>
                      </div>
                      <div className={baseStyles.sideListRow}>
                        <span>Synchro KYC</span>
                        <strong>
                          {compliance.user.kycSyncedAt ? formatDate(compliance.user.kycSyncedAt) : 'Jamais'}
                        </strong>
                      </div>
                      <div className={baseStyles.sideListRow}>
                        <span>Autorisé on-chain</span>
                        <strong>
                          {compliance.onChain.allowed == null
                            ? '—'
                            : compliance.onChain.allowed
                              ? 'Oui'
                              : 'Non'}
                        </strong>
                      </div>
                      <div className={baseStyles.sideListRow}>
                        <span>Bloqué (wallet/pays)</span>
                        <strong>
                          {compliance.onChain.walletBlocklisted || compliance.onChain.countryBlocked
                            ? 'Oui'
                            : 'Non'}
                        </strong>
                      </div>
                    </div>

                    {compliance.onChain.error && (
                      <div className={styles.walletWarning}>{compliance.onChain.error}</div>
                    )}

                    <button
                      type="button"
                      className={baseStyles.secondaryButton}
                      onClick={() => void handleSyncKyc()}
                      disabled={syncingKyc || !compliance.user.walletAddress || !compliance.user.countryCode}
                    >
                      {syncingKyc ? 'Synchronisation...' : 'Synchroniser le KYC on-chain'}
                    </button>
                    {(!compliance.user.walletAddress || !compliance.user.countryCode) && (
                      <small>Wallet et code pays requis avant synchronisation.</small>
                    )}
                  </>
                ) : (
                  <div className={baseStyles.noticeError}>Conformité indisponible.</div>
                )}

                {compliance && compliance.latestOperations.length > 0 && (
                  <section>
                    <div className={baseStyles.eyebrow}>Dernières opérations</div>
                    <div className={styles.opsList}>
                      {compliance.latestOperations.map((op) => (
                        <div key={op.id} className={styles.opsRow}>
                          <div>
                            <div className={styles.opsType}>{op.type}</div>
                            <div className={styles.opsMeta}>{formatDate(op.updatedAt)} — {op.status}</div>
                          </div>
                          {op.txHash && (
                            <a
                              href={buildExplorerTransactionUrl(op.txHash)}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.explorerLink}
                            >
                              Tx ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </aside>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
