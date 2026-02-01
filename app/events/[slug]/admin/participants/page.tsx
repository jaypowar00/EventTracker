'use client';

import { useState, use } from 'react';
import useSWR from 'swr';
import Modal from '@/components/Modal';
import styles from '@/app/admin/dashboard.module.css';
import modalStyles from '@/components/Modal.module.css';
import loginStyles from '@/app/login.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (!data.status) throw new Error(data.message);
    return data.data;
});

export default function EventParticipantsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { data: users, mutate: mutateUsers } = useSWR(`/api/events/${slug}/participants`, fetcher);

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [resettingUser, setResettingUser] = useState<any>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetCreds, setResetCreds] = useState<any>(null);
    const [manualPassword, setManualPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // New User Form State
    const [newUser, setNewUser] = useState({
        username: '',
        password: ''
    });

    const filteredUsers = (users || [])?.filter((u: any) => {
        const search = searchTerm.toLowerCase();
        return u.username.toLowerCase().includes(search) ||
            String(u.publicId).toLowerCase().includes(search);
    });

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                body: JSON.stringify({
                    username: newUser.username,
                    role: 'PARTICIPANT',
                    password: newUser.password || undefined
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setIsAddModalOpen(false);
            setNewUser({ username: '', password: '' });
            mutateUsers();

            // Show the newly created credentials
            setResetCreds(data.data.credentials);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${resettingUser.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    resetPassword: !manualPassword,
                    newPassword: manualPassword || undefined
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setResetCreds(data.data.credentials);
            setIsResetModalOpen(false);
            setManualPassword('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Are you sure you want to delete participant "${user.username}"?`)) return;
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            mutateUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className={styles.container}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <button onClick={() => window.location.href = `/events/${slug}`} style={{ background: 'transparent', color: 'hsl(var(--primary))', border: 'none', cursor: 'pointer', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        ← Back to Event
                    </button>
                    <h1 className={styles.title} style={{ marginBottom: 0 }}>Manage Participants</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Event: <code style={{ color: 'hsl(var(--primary))' }}>{slug}</code></p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', position: 'relative' }}>
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder="Search participants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'hsl(var(--foreground))', outline: 'none', fontSize: '0.875rem', paddingRight: searchTerm ? '1.5rem' : '0' }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', padding: '0.25rem' }}
                                title="Clear Search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="glass-panel"
                        style={{
                            padding: '0 1.25rem',
                            borderRadius: '0.5rem',
                            background: 'hsl(var(--primary) / 0.1)',
                            border: '1px solid hsl(var(--primary) / 0.2)',
                            color: 'hsl(var(--primary))',
                            fontWeight: 600,
                            height: '2.5rem'
                        }}
                    >
                        + New Participant
                    </button>
                </div>
            </header>

            <div className="glass-panel" style={{ borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'hsl(var(--card))', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Participant</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Public ID</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Joined</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!users ? (
                            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>Loading...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>No participants found.</td></tr>
                        ) : filteredUsers.map((user: any) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 600 }}>{user.username}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <code style={{ fontSize: '0.875rem', color: 'hsl(var(--primary))' }}>{user.publicId}</code>
                                </td>
                                <td style={{ padding: '1rem', color: 'hsl(var(--muted-foreground))' }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => { setResettingUser(user); setIsResetModalOpen(true); }}
                                            className="glass-panel"
                                            style={{ background: 'hsl(var(--foreground) / 0.05)', border: 'none', color: 'hsl(var(--foreground))', padding: '0.4rem', borderRadius: '0.375rem', cursor: 'pointer' }}
                                            title="Reset Password"
                                        >
                                            🔑
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            style={{ background: 'hsl(var(--destructive) / 0.1)', border: 'none', color: 'hsl(var(--destructive))', padding: '0.4rem', borderRadius: '0.375rem', cursor: 'pointer' }}
                                            title="Delete User"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Participant Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Participant">
                <form onSubmit={handleCreateUser} className={modalStyles.form}>
                    <div>
                        <label className={loginStyles.label}>Username</label>
                        <input
                            className={loginStyles.input}
                            required
                            value={newUser.username}
                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            placeholder="e.g. boy_warrior"
                        />
                    </div>
                    <div>
                        <label className={loginStyles.label}>Initial Password (Optional)</label>
                        <input
                            className={loginStyles.input}
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            placeholder="Leave empty for random"
                        />
                    </div>
                    <div className={modalStyles.footer}>
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                            {loading ? 'Creating...' : 'Create Participant'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Password">
                {resettingUser && (
                    <form onSubmit={handleResetPassword} className={modalStyles.form}>
                        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                            Update password for <strong>{resettingUser.username}</strong>.
                        </p>
                        <div>
                            <label className={loginStyles.label}>Manual Password (Optional)</label>
                            <input
                                className={loginStyles.input}
                                value={manualPassword}
                                onChange={e => setManualPassword(e.target.value)}
                                placeholder="Type a new password..."
                            />
                            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
                                Leave empty to generate a random secure password.
                            </p>
                        </div>
                        <div className={modalStyles.footer}>
                            <button type="button" onClick={() => setIsResetModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                                {loading ? 'Processing...' : manualPassword ? 'Set Manual Password' : 'Generate Random Password'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Success Modal */}
            <Modal isOpen={!!resetCreds} onClose={() => setResetCreds(null)} title="Account Credentials">
                {resetCreds && (
                    <div>
                        <div style={{ background: 'hsl(var(--success) / 0.1)', border: '1px solid hsl(var(--success) / 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                            <p style={{ color: 'hsl(var(--success))', fontWeight: 600 }}>✓ Credentials available</p>
                        </div>
                        <div style={{ background: 'hsl(var(--foreground) / 0.05)', borderRadius: '0.5rem', padding: '1rem', fontFamily: 'Monaco, monospace' }}>
                            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>USERNAME: <span style={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}>{resetCreds.username}</span></p>
                            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>PASSWORD: <span style={{ color: 'hsl(var(--primary))', fontWeight: 'bold', fontSize: '1.125rem' }}>{resetCreds.password}</span></p>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '1rem' }}>Please share these details with the participant. They should change their password after logging in.</p>
                        <div className={modalStyles.footer}>
                            <button onClick={() => setResetCreds(null)} className={modalStyles.submitBtn}>Done</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
