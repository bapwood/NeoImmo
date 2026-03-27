'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson } from '@/src/lib/api';
import { readStoredSession, writeStoredSession } from '@/src/lib/auth';
import type { AuthSession } from '@/src/lib/types';
import styles from './styles/login.module.css';

export default function DashboardLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();

    if (session) {
      router.replace('/');
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const session = await requestJson<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      writeStoredSession(session);
      router.replace('/');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Connexion impossible.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel}>
        <div className={styles.panelTop}>
        </div>
        <div className={styles.eyebrow}>Connexion</div>
        <h2>Connexion à NeoImmo</h2>
        <p className={styles.copy}>
          Connectez-vous
        </p>

        {error ? <div className={styles.noticeError}>{error}</div> : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="test@test.fr"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Mot de passe</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
            />
          </label>

          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            Retour
          </button>
        </form>
      </section>
    </main>
  );
}
