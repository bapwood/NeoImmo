'use client';

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getResourceConfigsForRole,
  type ResourceConfig,
  type ResourceKey,
} from '@/src/lib/dashboard-resources';
import { API_URL, ApiError, requestJson } from '@/src/lib/api';
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '@/src/lib/auth';
import {
  fetchAvailableOpportunities,
  filterOpportunities,
} from '@/src/lib/opportunities';
import type {
  AuthSession,
  ClientPortfolio,
  PanelUser,
  PropertyRecord,
  RefreshTokenRecord,
  TableRow,
  UserRecord,
} from '@/src/lib/types';
import DashboardLoader from './panel/loader';
import DashboardOpportunitiesPanel from './panel/opportunities-panel';
import DashboardOverviewPanel from './panel/overview-panel';
import DashboardPortfolioPanel from './panel/portfolio-panel';
import DashboardProfilePanel from './panel/profile-panel';
import DashboardResourcePanel from './panel/resource-panel';
import DashboardSidebar from './panel/sidebar';
import DashboardTopbar from './panel/topbar';
import type { Notice, PanelKey, ResourceState } from './panel/types';
import {
  buildNavigationItems,
  createInitialResourceState,
  getClientProfileCompletion,
  getClientProfileCompletionTotal,
  stringifyValue,
} from './panel/utils';
import styles from './panel/styles/panel.module.css';

type DashboardPanelProps = {
  unauthenticatedRedirectPath?: string;
};

export default function DashboardPanel({
  unauthenticatedRedirectPath = '/signin',
}: DashboardPanelProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [hasAppliedPanelParam, setHasAppliedPanelParam] = useState(false);
  const [panelParam, setPanelParam] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey>('overview');
  const [activeResourceKey, setActiveResourceKey] = useState<ResourceKey>('user');
  const [resourceState, setResourceState] = useState<ResourceState>(() =>
    createInitialResourceState(),
  );
  const [availableProperties, setAvailableProperties] = useState<PropertyRecord[]>([]);
  const [availablePropertiesLoading, setAvailablePropertiesLoading] = useState(false);
  const [availablePropertiesError, setAvailablePropertiesError] = useState<string | null>(
    null,
  );
  const [clientPortfolio, setClientPortfolio] = useState<ClientPortfolio | null>(null);
  const [clientPortfolioLoading, setClientPortfolioLoading] = useState(false);
  const [clientPortfolioError, setClientPortfolioError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const availableCarouselRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  const role = session?.user.role ?? 'CLIENT';
  const isAdmin = role === 'ADMIN';
  const availableResources = session ? getResourceConfigsForRole(role) : [];
  const resourceMap = Object.fromEntries(
    availableResources.map((resource) => [resource.key, resource]),
  ) as Partial<Record<ResourceKey, ResourceConfig>>;
  const navigationItems = buildNavigationItems(role);
  const activeResource = resourceMap[activeResourceKey] ?? null;
  const activeState = activeResource
    ? resourceState[activeResource.key]
    : createInitialResourceState().user;
  const activeUserProfile =
    activeResource?.key === 'user' && activeResource.singleton
      ? (activeState.items[0] as PanelUser | undefined)
      : undefined;
  const users = resourceState.user.items as UserRecord[];
  const properties = resourceState.property.items as PropertyRecord[];
  const refreshTokens = resourceState.refreshToken.items as RefreshTokenRecord[];
  const filteredAvailableProperties = filterOpportunities(
    availableProperties,
    activePanel === 'opportunities' ? deferredQuery : '',
  );
  const filteredRows = activeResource
    ? activeState.items.filter((row) => {
        const needle = deferredQuery.trim().toLowerCase();

        if (!needle) {
          return true;
        }

        return activeResource.columns.some((column) =>
          stringifyValue(row[column.key]).toLowerCase().includes(needle),
        );
      })
    : [];

  async function kickToLogin() {
    clearStoredSession();
    setSession(null);
    setAvailableProperties([]);
    setAvailablePropertiesError(null);
    setAvailablePropertiesLoading(false);
    setClientPortfolio(null);
    setClientPortfolioError(null);
    setClientPortfolioLoading(false);
    router.replace(unauthenticatedRedirectPath);
  }

  async function fetchResourceItems(
    resource: ResourceConfig,
    currentSession: AuthSession,
  ): Promise<TableRow[]> {
    if (resource.fetchMode === 'single') {
      const item = await requestJson<TableRow>(
        resource.fetchEndpoint,
        undefined,
        currentSession,
      );
      return item ? [item] : [];
    }

    return requestJson<TableRow[]>(resource.fetchEndpoint, undefined, currentSession);
  }

  async function refreshCurrentUser(currentSession: AuthSession) {
    const currentUser = await requestJson<PanelUser>(
      '/user/me',
      undefined,
      currentSession,
    );
    const nextSession = {
      ...currentSession,
      user: currentUser,
    };

    writeStoredSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }

  async function reloadAvailableProperties() {
    setAvailablePropertiesLoading(true);
    setAvailablePropertiesError(null);

    try {
      const items = await fetchAvailableOpportunities();
      setAvailableProperties(items);
    } catch (error) {
      setAvailableProperties([]);
      setAvailablePropertiesError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les biens disponibles.',
      );
    } finally {
      setAvailablePropertiesLoading(false);
    }
  }

  async function loadClientPortfolio(currentSession: AuthSession) {
    if (currentSession.user.role !== 'CLIENT') {
      setClientPortfolio(null);
      setClientPortfolioError(null);
      setClientPortfolioLoading(false);
      return;
    }

    setClientPortfolioLoading(true);
    setClientPortfolioError(null);

    try {
      const portfolio = await requestJson<ClientPortfolio>(
        '/portfolio/me',
        undefined,
        currentSession,
      );
      setClientPortfolio(portfolio);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_EXPIRED') {
        await kickToLogin();
        return;
      }

      setClientPortfolio(null);
      setClientPortfolioError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger le portefeuille client.',
      );
    } finally {
      setClientPortfolioLoading(false);
    }
  }

  function scrollAvailableProperties(direction: 'previous' | 'next') {
    const node = availableCarouselRef.current;

    if (!node) {
      return;
    }

    const offset = node.clientWidth * 0.82;

    node.scrollBy({
      left: direction === 'next' ? offset : -offset,
      behavior: 'smooth',
    });
  }

  async function ensureSession(storedSession: AuthSession) {
    const nextSession = await refreshCurrentUser(storedSession);
    return nextSession;
  }

  async function loadAllResources(currentSession: AuthSession) {
    const resources = getResourceConfigsForRole(currentSession.user.role);
    const nextState = createInitialResourceState();

    for (const resource of resources) {
      nextState[resource.key] = {
        items: [],
        loading: true,
        error: null,
      };
    }

    setResourceState(nextState);

    const results = await Promise.allSettled(
      resources.map(async (resource) => ({
        resourceKey: resource.key,
        items: await fetchResourceItems(resource, currentSession),
      })),
    );

    setResourceState((current) => {
      const mergedState = { ...current };

      results.forEach((result, index) => {
        const resource = resources[index];

        if (result.status === 'fulfilled') {
          mergedState[result.value.resourceKey] = {
            items: result.value.items,
            loading: false,
            error: null,
          };
          return;
        }

        mergedState[resource.key] = {
          items: [],
          loading: false,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : 'Impossible de charger la table.',
        };
      });

      return mergedState;
    });
  }

  async function reloadResource(resourceKey: ResourceKey) {
    if (!session) {
      return;
    }

    const resource = resourceMap[resourceKey];

    if (!resource) {
      return;
    }

    setResourceState((current) => ({
      ...current,
      [resourceKey]: {
        ...current[resourceKey],
        loading: true,
        error: null,
      },
    }));

    try {
      const items = await fetchResourceItems(resource, session);

      setResourceState((current) => ({
        ...current,
        [resourceKey]: {
          items,
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_EXPIRED') {
        await kickToLogin();
        return;
      }

      setResourceState((current) => ({
        ...current,
        [resourceKey]: {
          ...current[resourceKey],
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Impossible de charger la table.',
        },
      }));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        router.replace(unauthenticatedRedirectPath);
        setBooting(false);
        return;
      }

      try {
        const nextSession = await ensureSession(storedSession);

        if (cancelled) {
          return;
        }

        setSession(nextSession);
        setActiveResourceKey(
          getResourceConfigsForRole(nextSession.user.role)[0]?.key ?? 'user',
        );
        await Promise.all([
          loadAllResources(nextSession),
          loadClientPortfolio(nextSession),
        ]);
      } catch {
        if (!cancelled) {
          clearStoredSession();
          setSession(null);
          router.replace(unauthenticatedRedirectPath);
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router, unauthenticatedRedirectPath]);

  useEffect(() => {
    let cancelled = false;

    if (!session || session.user.role !== 'CLIENT') {
      setAvailableProperties([]);
      setAvailablePropertiesError(null);
      setAvailablePropertiesLoading(false);
      return;
    }

    async function bootstrapAvailableProperties() {
      setAvailablePropertiesLoading(true);
      setAvailablePropertiesError(null);

      try {
        const items = await fetchAvailableOpportunities();

        if (!cancelled) {
          setAvailableProperties(items);
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableProperties([]);
          setAvailablePropertiesError(
            error instanceof Error
              ? error.message
              : 'Impossible de charger les biens disponibles.',
          );
        }
      } finally {
        if (!cancelled) {
          setAvailablePropertiesLoading(false);
        }
      }
    }

    void bootstrapAvailableProperties();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!availableResources.some((resource) => resource.key === activeResourceKey)) {
      const firstResource = availableResources[0];

      if (firstResource) {
        setActiveResourceKey(firstResource.key);
      }
    }
  }, [activeResourceKey, availableResources]);

  useEffect(() => {
    if (!activeResource) {
      return;
    }

    setNotice(null);
    setQuery('');
  }, [activeResource]);

  function handlePanelChange(panel: PanelKey) {
    startTransition(() => {
      setActivePanel(panel);
      setQuery('');
      setPanelParam(panel === 'overview' ? null : panel);
      router.replace(panel === 'overview' ? '/' : `/?panel=${panel}`);

      if (panel === 'user' || panel === 'property' || panel === 'refreshToken') {
        setActiveResourceKey(panel);
      }
    });
  }

  function handleOpenWalletSettings() {
    startTransition(() => {
      setActivePanel('user');
      setActiveResourceKey('user');
      setQuery('');
      setPanelParam('user');
      router.replace('/?panel=user#wallet-on-chain');
    });
  }

  function handleEdit(row: TableRow) {
    if (!activeResource?.allowEdit) {
      return;
    }

    const rowId = String(row[activeResource.idKey]);

    if (activeResource.key === 'property') {
      router.push(`/actifs/${encodeURIComponent(rowId)}/modifier`);
      return;
    }

    setNotice(null);
  }

  function handleOpenPropertyStatus(row: TableRow) {
    const rowId = row[activeResource?.idKey ?? 'id'];

    if (activeResource?.key !== 'property' || rowId == null) {
      return;
    }

    router.push(`/actifs/${encodeURIComponent(String(rowId))}/tokenisation`);
  }

  async function handleDelete(row: TableRow) {
    if (!session || !activeResource?.allowDelete || !activeResource.buildDeleteEndpoint) {
      return;
    }

    const rowId = row[activeResource.idKey];

    if (
      !window.confirm(
        `Supprimer cette entrée de ${activeResource.label.toLowerCase()} ?`,
      )
    ) {
      return;
    }

    setNotice(null);

    try {
      await requestJson(
        activeResource.buildDeleteEndpoint(String(rowId)),
        {
          method: 'DELETE',
        },
        session,
      );

      if (activeResource.key === 'user' && Number(rowId) === session.user.id) {
        await kickToLogin();
        return;
      }

      await reloadResource(activeResource.key);

      setNotice({
        tone: 'success',
        message: 'Ligne supprimée.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_EXPIRED') {
        await kickToLogin();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Suppression impossible.',
      });
    }
  }

  async function handleToggleUserRestriction(row: TableRow) {
    if (!session || activeResource?.key !== 'user') {
      return;
    }

    const rowId = Number(row[activeResource.idKey]);
    const currentlyRestricted = Boolean(row.isRestricted);
    const actionLabel = currentlyRestricted
      ? 'lever la restriction'
      : 'restreindre ce compte';

    if (!window.confirm(`Confirmer: ${actionLabel} ?`)) {
      return;
    }

    setNotice(null);

    try {
      await requestJson<UserRecord>(
        `/user/${encodeURIComponent(String(rowId))}/restriction`,
        {
          method: 'POST',
          body: JSON.stringify({
            restricted: !currentlyRestricted,
          }),
        },
        session,
      );

      await reloadResource('user');
      setNotice({
        tone: 'success',
        message: currentlyRestricted
          ? 'La restriction a été levée.'
          : 'L’utilisateur a été restreint.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_EXPIRED') {
        await kickToLogin();
        return;
      }

      setNotice({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de modifier la restriction utilisateur.',
      });
    }
  }

  function handleLogout() {
    clearStoredSession();
    router.replace('/signin');
  }

  function syncCurrentUser(updatedUser: PanelUser) {
    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      user: updatedUser,
    };

    writeStoredSession(nextSession);
    setSession(nextSession);
    setResourceState((current) => ({
      ...current,
      user: {
        ...current.user,
        items: [updatedUser],
        loading: false,
        error: null,
      },
    }));
  }

  const totalTokenValue = properties.reduce(
    (sum, property) =>
      typeof property.tokenNumber === 'number' && typeof property.tokenPrice === 'number'
        ? sum + property.tokenNumber * property.tokenPrice
        : sum,
    0,
  );
  const expiringSoonCount = refreshTokens.filter((token) => {
    const expiration = new Date(token.expiryDate).getTime();
    return expiration > Date.now() && expiration - Date.now() <= 86_400_000 * 3;
  }).length;
  const adminCount = users.filter((user) => user.role === 'ADMIN').length;
  const profileCompletion = getClientProfileCompletion(session?.user);
  const profileCompletionTotal = getClientProfileCompletionTotal();
  const isClientPortfolioPanel =
    !isAdmin &&
    activePanel !== 'overview' &&
    activePanel !== 'opportunities' &&
    activeResource?.key === 'property';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentPanel = new URLSearchParams(window.location.search).get('panel');
    setPanelParam(currentPanel);
  }, []);

  useEffect(() => {
    if (!session || hasAppliedPanelParam) {
      return;
    }

    if (!panelParam) {
      setHasAppliedPanelParam(true);
      return;
    }

    const matchesResource = availableResources.some(
      (resource) => resource.key === panelParam,
    );

    if (panelParam === 'overview' || panelParam === 'opportunities' || matchesResource) {
      setActivePanel(panelParam as PanelKey);

      if (matchesResource) {
        setActiveResourceKey(panelParam as ResourceKey);
      }
    }

    setHasAppliedPanelParam(true);
  }, [availableResources, hasAppliedPanelParam, panelParam, session]);

  if (booting || !session) {
    return <DashboardLoader />;
  }

  return (
    <main className={styles.shell}>
      <DashboardSidebar
        activePanel={activePanel}
        apiUrl={API_URL}
        navigationItems={navigationItems}
        onPanelChange={handlePanelChange}
        session={session}
      />

      <section className={styles.main}>
        <DashboardTopbar
          activePanel={activePanel}
          activeResource={activeResource}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onOpenWalletSettings={handleOpenWalletSettings}
          onQueryChange={setQuery}
          query={query}
          session={session}
        />

        {activePanel === 'overview' ? (
          <DashboardOverviewPanel
            adminCount={adminCount}
            availableProperties={availableProperties}
            availablePropertiesError={availablePropertiesError}
            availablePropertiesLoading={availablePropertiesLoading}
            availableResources={availableResources}
            carouselRef={availableCarouselRef}
            clientPortfolio={clientPortfolio}
            expiringSoonCount={expiringSoonCount}
            isAdmin={isAdmin}
            onPanelChange={handlePanelChange}
            onReloadAvailableProperties={() => void reloadAvailableProperties()}
            onReloadResource={(resourceKey) => void reloadResource(resourceKey)}
            onScrollAvailableProperties={scrollAvailableProperties}
            profileCompletion={profileCompletion}
            profileCompletionTotal={profileCompletionTotal}
            properties={properties}
            refreshTokens={refreshTokens}
            resourceState={resourceState}
            totalTokenValue={totalTokenValue}
            users={users}
          />
        ) : null}

        {activePanel === 'opportunities' ? (
          <DashboardOpportunitiesPanel
            availablePropertiesError={availablePropertiesError}
            availablePropertiesLoading={availablePropertiesLoading}
            properties={filteredAvailableProperties}
          />
        ) : null}

        {activePanel !== 'overview' &&
        activePanel !== 'opportunities' &&
        isClientPortfolioPanel ? (
          <DashboardPortfolioPanel
            error={clientPortfolioError}
            loading={clientPortfolioLoading}
            onOpenOpportunities={() => handlePanelChange('opportunities')}
            onReload={() => void loadClientPortfolio(session)}
            portfolio={clientPortfolio}
            walletAddress={session.user.walletAddress}
          />
        ) : null}

        {activePanel !== 'overview' &&
        activePanel !== 'opportunities' &&
        activeResource?.key === 'user' &&
        activeResource.singleton &&
        activeUserProfile ? (
          <DashboardProfilePanel
            resource={activeResource}
            session={session}
            user={activeUserProfile}
            onProfileUpdated={syncCurrentUser}
            onSessionExpired={() => void kickToLogin()}
          />
        ) : null}

        {activePanel !== 'overview' &&
        activePanel !== 'opportunities' &&
        activeResource &&
        !isClientPortfolioPanel &&
        !(activeResource.key === 'user' && activeResource.singleton) ? (
          <DashboardResourcePanel
            activeResource={activeResource}
            activeState={activeState}
            filteredRows={filteredRows}
            notice={notice}
            onCreateProperty={() => router.push('/actifs/nouveau')}
            onDeleteRow={(row) => void handleDelete(row)}
            onEditRow={handleEdit}
            onOpenPropertyStatus={handleOpenPropertyStatus}
            onReloadResource={() => void reloadResource(activeResource.key)}
            onToggleUserRestriction={(row) => void handleToggleUserRestriction(row)}
          />
        ) : null}
      </section>
    </main>
  );
}
