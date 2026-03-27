import styles from './styles/loader.module.css';

type DashboardLoaderProps = {
  message?: string;
};

export default function DashboardLoader({
  message = 'Chargement du panel NeoImmo...',
}: DashboardLoaderProps) {
  return (
    <main className={styles.loader}>
      <div className={styles.orb} />
      <p>{message}</p>
    </main>
  );
}
