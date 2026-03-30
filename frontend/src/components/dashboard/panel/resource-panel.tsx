'use client';

import type { ResourceConfig } from '@/src/lib/dashboard-resources';
import type { TableRow } from '@/src/lib/types';
import type { Notice, ResourceSlice } from './types';
import { formatCurrency, formatDate } from './utils';
import styles from './styles/resource-panel.module.css';

type DashboardResourcePanelProps = {
  activeResource: ResourceConfig;
  activeState: ResourceSlice;
  filteredRows: TableRow[];
  notice: Notice;
  onCreateProperty: () => void;
  onDeleteRow: (row: TableRow) => void;
  onEditRow: (row: TableRow) => void;
  onOpenPropertyStatus: (row: TableRow) => void;
  onReloadResource: () => void;
  onToggleUserRestriction: (row: TableRow) => void;
};

export default function DashboardResourcePanel({
  activeResource,
  activeState,
  filteredRows,
  notice,
  onCreateProperty,
  onDeleteRow,
  onEditRow,
  onOpenPropertyStatus,
  onReloadResource,
  onToggleUserRestriction,
}: DashboardResourcePanelProps) {
  const canEditInline =
    activeResource.allowEdit &&
    !activeResource.singleton &&
    activeResource.key !== 'user';
  const canDeleteInline = activeResource.allowDelete;
  const layoutClassName =
    activeResource.key === 'property' || activeResource.key === 'user'
      ? styles.singleColumnLayout
      : styles.layout;

  function renderCell(value: unknown, column: ResourceConfig['columns'][number]) {
    if (value == null || value === '') {
      return <span className={styles.cellMuted}>—</span>;
    }

    if (column.kind === 'date' && typeof value === 'string') {
      return formatDate(value);
    }

    if (column.kind === 'currency' && typeof value === 'number') {
      return formatCurrency(value);
    }

    if (column.kind === 'array' && Array.isArray(value)) {
      return value.length === 0 ? '—' : `${value.length} élément(s)`;
    }

    if (column.kind === 'token' && typeof value === 'string') {
      return value.length <= 20 ? value : `${value.slice(0, 10)}...${value.slice(-6)}`;
    }

    if (column.kind === 'role' && typeof value === 'string') {
      return (
        <span className={value === 'ADMIN' ? styles.rolePillAdmin : styles.rolePillClient}>
          {value}
        </span>
      );
    }

    if (column.key === 'isRestricted' && typeof value === 'boolean') {
      return (
        <span className={value ? styles.restrictedPill : styles.activePill}>
          {value ? 'Restreint' : 'Actif'}
        </span>
      );
    }

    return String(value);
  }

  return (
    <section className={layoutClassName}>
      <div className={styles.tablePanel}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Table active</div>
            <h3 className={styles.title}>{activeResource.label}</h3>
            <p className={styles.copy}>{activeResource.description}</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onReloadResource}
            >
              Actualiser
            </button>
            {activeResource.key === 'property' && activeResource.allowCreate ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onCreateProperty}
              >
                Ajouter un bien
              </button>
            ) : null}
          </div>
        </div>

        {activeResource.key === 'property' && notice ? (
          <div className={notice.tone === 'success' ? styles.noticeSuccess : styles.noticeError}>
            {notice.message}
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {activeResource.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeState.loading ? (
                <tr>
                  <td colSpan={activeResource.columns.length + 1} className={styles.emptyCell}>
                    Chargement en cours...
                  </td>
                </tr>
              ) : null}

              {!activeState.loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={activeResource.columns.length + 1} className={styles.emptyCell}>
                    {activeState.error ?? activeResource.emptyState}
                  </td>
                </tr>
              ) : null}

              {!activeState.loading
                ? filteredRows.map((row) => (
                    <tr key={String(row[activeResource.idKey])}>
                      {activeResource.columns.map((column) => (
                        <td key={column.key}>{renderCell(row[column.key], column)}</td>
                      ))}
                      <td>
                        <div className={styles.tableActions}>
                          {activeResource.key === 'property' ? (
                            <button
                              type="button"
                              className={
                                row.tokenizationStatus === 'ACTIVE' &&
                                typeof row.contractAddress === 'string' &&
                                row.contractAddress.length > 0
                                  ? styles.statusButtonActive
                                  : styles.statusButtonInactive
                              }
                              onClick={() => onOpenPropertyStatus(row)}
                            >
                              Statut
                            </button>
                          ) : null}
                          {activeResource.key === 'user' && row.role === 'CLIENT' ? (
                            <button
                              type="button"
                              className={
                                row.isRestricted ? styles.tableButton : styles.tableButtonDanger
                              }
                              onClick={() => onToggleUserRestriction(row)}
                            >
                              {row.isRestricted
                                ? 'Lever la restriction'
                                : 'Restreindre'}
                            </button>
                          ) : null}
                          {canEditInline ? (
                            <button
                              type="button"
                              className={styles.tableButton}
                              onClick={() => onEditRow(row)}
                            >
                              {activeResource.key === 'property' ? 'Modifier' : 'Éditer'}
                            </button>
                          ) : null}
                          {canDeleteInline ? (
                            <button
                              type="button"
                              className={styles.tableButtonDanger}
                              onClick={() => onDeleteRow(row)}
                            >
                              Supprimer
                            </button>
                          ) : null}
                          {!canEditInline &&
                          !canDeleteInline &&
                          !activeResource.singleton ? (
                            <span className={styles.cellMuted}>—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
