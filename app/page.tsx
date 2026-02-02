'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.status) {
        throw new Error(data.message || 'Login failed');
      }

      // Redirect based on role
      const { role, eventSlug, hasMultipleEvents } = data.data;

      if (role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else if (hasMultipleEvents) {
        router.push('/dashboard');
      } else if (eventSlug) {
        router.push(`/events/${eventSlug}`);
      } else {
        setError('Your account is not associated with any active event.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      {/* Background Elements */}
      <div className={`${styles.blob} ${styles['blob-1']}`} />
      <div className={`${styles.blob} ${styles['blob-2']}`} />

      <div className={`glass-panel ${styles.panel}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            BoyzTracker
          </h1>
          <p className={styles.subtitle}>Admin Access Portal</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              placeholder="Enter username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  );
}
