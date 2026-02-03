'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import styles from './settings.module.css'; // I'll create this or use shared
import loginStyles from '../login.module.css';


export default function SettingsPage() {
    const { data: user, mutate } = useSWR('/api/user/me', fetcher); // Need to create 'me' endpoint

    const [username, setUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Update username local state when user data loads
    if (user && !username && !loading && !message.text) {
        setUsername(user.username);
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/user/settings', {
                method: 'PATCH',
                body: JSON.stringify({ username })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            setMessage({ type: 'success', text: 'Username updated successfully!' });
            mutate();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/user/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={loginStyles.container}>
            <div className={`glass-panel ${loginStyles.panel}`} style={{ maxWidth: '500px', width: '100%' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <button onClick={() => window.history.back()} style={{ background: 'transparent', color: 'hsl(var(--primary))', border: 'none', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        ← Back
                    </button>
                    <h1 className={loginStyles.title}>Account Settings</h1>
                    <p className={loginStyles.subtitle}>Manage your profile and security</p>
                </header>

                {message.text && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1.5rem',
                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: message.type === 'success' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        fontSize: '0.875rem'
                    }}>
                        {message.text}
                    </div>
                )}

                <section style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Display Name</h2>
                    <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '1rem' }}>
                        <div className={loginStyles.field}>
                            <label className={loginStyles.label}>Username</label>
                            <input
                                className={loginStyles.input}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading || username === user?.username} className={loginStyles.button}>
                            Update Username
                        </button>
                    </form>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '2rem 0' }} />

                <section>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Change Password</h2>
                    <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '1rem' }}>
                        <div className={loginStyles.field}>
                            <label className={loginStyles.label}>Current Password</label>
                            <input
                                type="password"
                                className={loginStyles.input}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className={loginStyles.field}>
                            <label className={loginStyles.label}>New Password</label>
                            <input
                                type="password"
                                className={loginStyles.input}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className={loginStyles.field}>
                            <label className={loginStyles.label}>Confirm New Password</label>
                            <input
                                type="password"
                                className={loginStyles.input}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading || !newPassword} className={loginStyles.button}>
                            Update Password
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
