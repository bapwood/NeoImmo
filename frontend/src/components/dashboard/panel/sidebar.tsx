'use client';

import type { AuthSession } from '@/src/lib/types';
import type { NavigationItem, PanelKey } from './types';
import styles from './styles/sidebar.module.css';

type DashboardSidebarProps = {
  activePanel: PanelKey;
  apiUrl: string;
  navigationItems: NavigationItem[];
  onPanelChange: (panel: PanelKey) => void;
  session: AuthSession;
};

export default function DashboardSidebar({
  activePanel,
  navigationItems,
  onPanelChange,
}: DashboardSidebarProps) {

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandLockup}>
        <div className={styles.brandIcon}>N</div>
        <div className={styles.brandCopy}>
          <div className={styles.eyebrow}>NeoImmo</div>
          <h1 className={styles.brandTitle}>Plateforme</h1>
        </div>
      </div>

      <nav className={styles.nav}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activePanel;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onPanelChange(item.key)}
              className={isActive ? styles.navButtonActive : styles.navButton}
            >
              <Icon className={styles.navIcon} />
              <span className={styles.navButtonCopy}>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
