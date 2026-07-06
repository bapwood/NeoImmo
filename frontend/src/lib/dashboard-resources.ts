import type { UserRole } from './types';

export type ResourceKey = 'user' | 'property' | 'refreshToken';
export type FieldKind =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'textarea'
  | 'array'
  | 'datetime-local'
  | 'select';
export type ColumnKind =
  | 'text'
  | 'number'
  | 'date'
  | 'array'
  | 'token'
  | 'currency'
  | 'role';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  requiredOnCreate?: boolean;
  requiredOnEdit?: boolean;
  placeholder?: string;
  helperText?: string;
  readOnlyOnEdit?: boolean;
  options?: FieldOption[];
  section?: string;
  /** Stored in cents in the DB/API; displayed and entered in euros in the form. */
  currency?: boolean;
}

export interface ColumnConfig {
  key: string;
  label: string;
  kind?: ColumnKind;
}

export interface ResourceConfig {
  key: ResourceKey;
  navLabel: string;
  navDescription: string;
  label: string;
  description: string;
  fetchEndpoint: string;
  fetchMode: 'list' | 'single';
  createEndpoint?: string;
  buildUpdateEndpoint: (rowId: string) => string;
  buildDeleteEndpoint?: (rowId: string) => string;
  idKey: string;
  updateMethod: 'PUT' | 'PATCH';
  accent: string;
  accentSoft: string;
  emptyState: string;
  allowCreate: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  allowSearch: boolean;
  singleton?: boolean;
  fields: FieldConfig[];
  columns: ColumnConfig[];
}

const userProfileFields: FieldConfig[] = [
  {
    key: 'email',
    label: 'Email',
    kind: 'email',
    required: true,
    placeholder: 'contact@neoimmo.fr',
  },
  {
    key: 'password',
    label: 'Mot de passe',
    kind: 'password',
    requiredOnCreate: true,
    requiredOnEdit: false,
    placeholder: 'Laisser vide pour conserver le mot de passe actuel',
    helperText: 'Uniquement requis à la création ou si tu veux le changer.',
  },
  { key: 'firstName', label: 'Prénom', kind: 'text', placeholder: 'Lina' },
  { key: 'lastName', label: 'Nom', kind: 'text', placeholder: 'Martin' },
  { key: 'address', label: 'Adresse', kind: 'text', placeholder: '14 rue des Archives' },
  { key: 'postalCode', label: 'Code postal', kind: 'text', placeholder: '75004' },
  { key: 'city', label: 'Ville', kind: 'text', placeholder: 'Paris' },
  { key: 'country', label: 'Pays de résidence', kind: 'text', placeholder: 'France' },
  { key: 'day', label: 'Jour', kind: 'text', placeholder: '09' },
  { key: 'month', label: 'Mois', kind: 'text', placeholder: '07' },
  { key: 'year', label: 'Année', kind: 'text', placeholder: '1996' },
  { key: 'birthPlace', label: 'Lieu de naissance', kind: 'text', placeholder: 'Lyon' },
  { key: 'nationality', label: 'Nationalité', kind: 'text', placeholder: 'Française' },
  { key: 'number', label: 'Téléphone', kind: 'text', placeholder: '+33 6 12 34 56 78' },
  {
    key: 'walletAddress',
    label: 'Wallet principale',
    kind: 'text',
    placeholder: '0x1234567890abcdef1234567890abcdef12345678',
    helperText: 'Une seule wallet par utilisateur. Elle sera utilisée pour les signatures et le KYC on-chain.',
  },
  {
    key: 'countryCode',
    label: 'Code pays ISO',
    kind: 'text',
    placeholder: 'FR',
    helperText: 'Code alpha-2 utilisé pour les contrôles de conformité on-chain.',
  },
  { key: 'occupation', label: 'Profession', kind: 'text', placeholder: 'Consultant' },
  {
    key: 'taxResidence',
    label: 'Résidence fiscale',
    kind: 'text',
    placeholder: 'France',
    helperText: 'Information utile pour les futurs parcours de conformité et de fiscalité.',
  },
  {
    key: 'annualIncomeRange',
    label: 'Tranche de revenus annuels',
    kind: 'select',
    options: [
      { label: 'Moins de 25 k€', value: 'UNDER_25K' },
      { label: '25 k€ à 50 k€', value: '25K_50K' },
      { label: '50 k€ à 100 k€', value: '50K_100K' },
      { label: '100 k€ à 250 k€', value: '100K_250K' },
      { label: 'Plus de 250 k€', value: 'OVER_250K' },
    ],
  },
  {
    key: 'investmentObjective',
    label: 'Objectif d’investissement',
    kind: 'select',
    options: [
      { label: 'Générer des revenus', value: 'INCOME' },
      { label: 'Valoriser le capital', value: 'GROWTH' },
      { label: 'Diversifier mon patrimoine', value: 'DIVERSIFICATION' },
      { label: 'Préparer un projet', value: 'PROJECT' },
      { label: 'Préparer la retraite', value: 'RETIREMENT' },
    ],
  },
];

export const propertyFields: FieldConfig[] = [
  { key: 'name', label: 'Nom', kind: 'text', required: true, placeholder: 'Appartement Paris 13', section: 'Présentation' },
  { key: 'localization', label: 'Localisation', kind: 'text', required: true, placeholder: 'Paris 13e', section: 'Présentation' },
  { key: 'livingArea', label: 'Surface', kind: 'text', required: true, placeholder: '72 m²', section: 'Présentation' },
  { key: 'description', label: 'Description', kind: 'textarea', required: true, placeholder: 'Belle exposition, proche métro...', section: 'Présentation' },
  { key: 'roomNumber', label: 'Pièces', kind: 'number', required: true, placeholder: '3', section: 'Présentation' },
  { key: 'bathroomNumber', label: 'Salles de bain', kind: 'number', required: true, placeholder: '2', section: 'Présentation' },

  { key: 'tokenNumber', label: 'Nombre de tokens', kind: 'number', required: true, placeholder: '100000', section: 'Tokenisation' },
  { key: 'tokenPrice', label: 'Prix du token (€)', kind: 'number', required: true, placeholder: '1', currency: true, helperText: 'Peut être aligné sur le prix suggéré affiché dans l’analyse financière une fois les données d’acquisition renseignées.', section: 'Tokenisation' },

  { key: 'purchasePrice', label: "Prix d'achat hors frais (€)", kind: 'number', placeholder: '250000', currency: true, section: 'Acquisition' },
  { key: 'notaryFeesPct', label: 'Frais de notaire (%)', kind: 'number', placeholder: '7.5', section: 'Acquisition' },
  { key: 'agencyFeesPct', label: "Frais d'agence (%)", kind: 'number', placeholder: '4', section: 'Acquisition' },
  { key: 'diagnosticFees', label: 'Frais de diagnostics (€)', kind: 'number', placeholder: '500', currency: true, section: 'Acquisition' },
  { key: 'renovationCost', label: 'Coût des travaux (€)', kind: 'number', placeholder: '15000', currency: true, section: 'Acquisition' },
  { key: 'furnitureCost', label: 'Coût du mobilier (€)', kind: 'number', placeholder: '3000', currency: true, section: 'Acquisition' },

  { key: 'platformEquity', label: 'Apport en fonds propres plateforme (€)', kind: 'number', placeholder: '0', currency: true, section: 'Financement' },
  { key: 'loanAmount', label: 'Montant emprunt bancaire (€)', kind: 'number', placeholder: '0', currency: true, section: 'Financement' },
  { key: 'loanRatePct', label: "Taux d'intérêt emprunt (%)", kind: 'number', placeholder: '3.5', section: 'Financement' },
  { key: 'loanDurationYears', label: "Durée de l'emprunt (années)", kind: 'number', placeholder: '15', section: 'Financement' },

  { key: 'monthlyRent', label: 'Loyer mensuel prévisionnel (€)', kind: 'number', placeholder: '1200', currency: true, section: 'Revenus locatifs' },
  { key: 'occupancyRatePct', label: "Taux d'occupation prévisionnel (%)", kind: 'number', placeholder: '95', section: 'Revenus locatifs' },
  { key: 'rentType', label: 'Type de location', kind: 'text', placeholder: 'Nue, meublée, saisonnière...', section: 'Revenus locatifs' },

  { key: 'nonRecoverableCharges', label: 'Charges copropriété non récupérables (€/an)', kind: 'number', placeholder: '800', currency: true, section: 'Charges d’exploitation' },
  { key: 'propertyTax', label: 'Taxe foncière (€/an)', kind: 'number', placeholder: '1200', currency: true, section: 'Charges d’exploitation' },
  { key: 'insurancePnoAnnual', label: 'Assurance PNO (€/an)', kind: 'number', placeholder: '150', currency: true, section: 'Charges d’exploitation' },
  { key: 'insuranceGliPct', label: 'Assurance loyers impayés (% du loyer)', kind: 'number', placeholder: '3', section: 'Charges d’exploitation' },
  { key: 'managementFeePct', label: 'Frais de gestion locative (% du loyer)', kind: 'number', placeholder: '7', section: 'Charges d’exploitation' },
  { key: 'maintenanceProvisionPct', label: 'Provision entretien (% du loyer)', kind: 'number', placeholder: '3', section: 'Charges d’exploitation' },
  { key: 'majorRepairsProvisionPct', label: 'Provision grosses réparations (% du loyer)', kind: 'number', placeholder: '5', section: 'Charges d’exploitation' },

  { key: 'subscriptionFeePct', label: "Frais d'entrée investisseur (%)", kind: 'number', placeholder: '2', section: 'Frais plateforme' },
  { key: 'platformAnnualFeePct', label: 'Frais de gestion annuels plateforme (% du montant levé)', kind: 'number', placeholder: '1', section: 'Frais plateforme' },
  { key: 'exitFeePct', label: 'Frais de sortie/revente (%)', kind: 'number', placeholder: '2', section: 'Frais plateforme' },
  { key: 'rentDistributionCommissionPct', label: 'Commission sur loyers distribués (%)', kind: 'number', placeholder: '5', section: 'Frais plateforme' },

  { key: 'holdingPeriodYears', label: 'Durée de détention prévisionnelle (années)', kind: 'number', placeholder: '10', section: 'Sortie / revente' },
  { key: 'exitAppreciationPct', label: 'Valorisation annuelle anticipée du marché (%)', kind: 'number', placeholder: '2', section: 'Sortie / revente' },
  { key: 'resaleFeesPct', label: 'Frais de revente côté vendeur (%)', kind: 'number', placeholder: '6', section: 'Sortie / revente' },

  {
    key: 'images',
    label: 'Images',
    kind: 'array',
    placeholder: 'Uploader des images',
    helperText: 'Ajoutez des images, réorganisez leur ordre puis validez pour enregistrer la carte client.',
    section: 'Présentation',
  },
  {
    key: 'keyPoints',
    label: 'Points clés',
    kind: 'array',
    placeholder: 'Piscine\nLumineux',
    helperText: 'Un point clé par ligne ou séparé par des virgules.',
    section: 'Présentation',
  },
];

const adminUserResource: ResourceConfig = {
  key: 'user',
  navLabel: 'Utilisateurs',
  navDescription: 'Comptes & habilitations',
  label: 'Utilisateurs',
  description: 'Administration des comptes et de leurs niveaux d’habilitation.',
  fetchEndpoint: '/user',
  fetchMode: 'list',
  createEndpoint: '/user',
  buildUpdateEndpoint: (rowId) => `/user/${encodeURIComponent(rowId)}`,
  buildDeleteEndpoint: (rowId) => `/user/${encodeURIComponent(rowId)}`,
  idKey: 'id',
  updateMethod: 'PUT',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  emptyState: 'Aucun utilisateur en base.',
  allowCreate: true,
  allowEdit: true,
  allowDelete: true,
  allowSearch: true,
  fields: [
    ...userProfileFields.slice(0, 2),
    {
      key: 'role',
      label: 'Rôle',
      kind: 'select',
      required: true,
      options: [
        { label: 'Client', value: 'CLIENT' },
        { label: 'Admin', value: 'ADMIN' },
      ],
    },
    ...userProfileFields.slice(2),
  ],
  columns: [
    { key: 'id', label: 'ID', kind: 'number' },
    { key: 'email', label: 'Email' },
    { key: 'isRestricted', label: 'Statut' },
    { key: 'role', label: 'Rôle', kind: 'role' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'city', label: 'Ville' },
    { key: 'postalCode', label: 'Code postal' },
    { key: 'createdAt', label: 'Créé le', kind: 'date' },
  ],
};

const clientUserResource: ResourceConfig = {
  key: 'user',
  navLabel: 'Profil',
  navDescription: 'Profil & conformité',
  label: 'Mon compte',
  description: 'Mise à jour de vos informations personnelles, fiscales et investisseur.',
  fetchEndpoint: '/user/me',
  fetchMode: 'single',
  buildUpdateEndpoint: () => '/user/me',
  idKey: 'id',
  updateMethod: 'PUT',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  emptyState: 'Profil introuvable.',
  allowCreate: false,
  allowEdit: true,
  allowDelete: false,
  allowSearch: false,
  singleton: true,
  fields: userProfileFields,
  columns: [
    { key: 'email', label: 'Email' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'city', label: 'Ville' },
    { key: 'postalCode', label: 'Code postal' },
    { key: 'country', label: 'Pays' },
    { key: 'createdAt', label: 'Créé le', kind: 'date' },
  ],
};

const adminPropertyResource: ResourceConfig = {
  key: 'property',
  navLabel: 'Actifs',
  navDescription: 'Inventaire immobilier',
  label: 'Actifs',
  description: 'Pilotage du catalogue immobilier avec visibilité sur les propriétaires.',
  fetchEndpoint: '/property/manage',
  fetchMode: 'list',
  createEndpoint: '/property',
  buildUpdateEndpoint: (rowId) => `/property/${encodeURIComponent(rowId)}`,
  buildDeleteEndpoint: (rowId) => `/property/${encodeURIComponent(rowId)}`,
  idKey: 'id',
  updateMethod: 'PATCH',
  accent: 'var(--foreground)',
  accentSoft: 'var(--accent-secondary-soft)',
  emptyState: 'Aucun bien enregistré.',
  allowCreate: true,
  allowEdit: true,
  allowDelete: true,
  allowSearch: true,
  fields: propertyFields,
  columns: [
    { key: 'id', label: 'ID', kind: 'number' },
    { key: 'name', label: 'Nom' },
    { key: 'ownerId', label: 'Propriétaire', kind: 'number' },
    { key: 'localization', label: 'Localisation' },
    { key: 'score', label: 'Score (/100)', kind: 'number' },
    { key: 'keyPoints', label: 'Points clés', kind: 'array' },
    { key: 'tokenPrice', label: 'Prix token', kind: 'currency' },
    { key: 'tokenNumber', label: 'Tokens', kind: 'number' },
    { key: 'createdAt', label: 'Créé le', kind: 'date' },
  ],
};

const clientPropertyResource: ResourceConfig = {
  key: 'property',
  navLabel: 'Portefeuille',
  navDescription: 'Actifs rattachés',
  label: 'Mon portefeuille',
  description: 'Suivi des parts détenues, des revenus mensuels projetés et de la valeur de votre exposition.',
  fetchEndpoint: '/portfolio/me/positions',
  fetchMode: 'list',
  buildUpdateEndpoint: () => '/portfolio/me',
  idKey: 'id',
  updateMethod: 'PATCH',
  accent: 'var(--foreground)',
  accentSoft: 'var(--accent-secondary-soft)',
  emptyState: 'Aucun actif n’est actuellement rattaché à votre compte.',
  allowCreate: false,
  allowEdit: false,
  allowDelete: false,
  allowSearch: false,
  fields: [],
  columns: [
    { key: 'id', label: 'ID', kind: 'number' },
    { key: 'tokenAmount', label: 'Parts' },
    { key: 'investedTotal', label: 'Investi', kind: 'currency' },
    { key: 'currentValuation', label: 'Valeur', kind: 'currency' },
    { key: 'projectedMonthlyIncome', label: 'Revenu mensuel', kind: 'currency' },
    { key: 'lastPurchaseAt', label: 'Dernier achat', kind: 'date' },
  ],
};

const refreshTokenResource: ResourceConfig = {
  key: 'refreshToken',
  navLabel: 'Sessions',
  navDescription: 'Jetons actifs',
  label: 'Sessions',
  description: 'Supervision des jetons de renouvellement actuellement actifs.',
  fetchEndpoint: '/refresh-token',
  fetchMode: 'list',
  createEndpoint: '/refresh-token',
  buildUpdateEndpoint: (rowId) => `/refresh-token/${encodeURIComponent(rowId)}`,
  buildDeleteEndpoint: (rowId) => `/refresh-token/${encodeURIComponent(rowId)}`,
  idKey: 'userId',
  updateMethod: 'PUT',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  emptyState: 'Aucun refresh token disponible.',
  allowCreate: true,
  allowEdit: true,
  allowDelete: true,
  allowSearch: true,
  fields: [
    { key: 'userId', label: 'ID utilisateur', kind: 'number', required: true, placeholder: '1', readOnlyOnEdit: true },
    { key: 'token', label: 'Token', kind: 'text', required: true, placeholder: 'uuid-ou-token' },
    { key: 'expiryDate', label: 'Expiration', kind: 'datetime-local', required: true },
  ],
  columns: [
    { key: 'userId', label: 'ID utilisateur', kind: 'number' },
    { key: 'token', label: 'Token', kind: 'token' },
    { key: 'expiryDate', label: 'Expiration', kind: 'date' },
  ],
};

export function getResourceConfigsForRole(role: UserRole): ResourceConfig[] {
  if (role === 'ADMIN') {
    return [adminUserResource, adminPropertyResource, refreshTokenResource];
  }

  return [clientUserResource, clientPropertyResource];
}
