'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { AVATARS } from '@/lib/avatars';
import styles from '@/app/admin/dashboard.module.css';
import loginStyles from '@/app/login.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (!data.status) throw new Error(data.message);
    return data.data;
});

export default function ProfilePage() {
    const { data: user, mutate: mutateUser } = useSWR('/api/user/me', fetcher);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPicker, setShowPicker] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        newPassword: '',
        confirmPassword: '',
        avatarIndex: 0
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                username: user.username,
                avatarIndex: user.avatarIndex || 0
            }));
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                body: JSON.stringify({
                    username: formData.username !== user.username ? formData.username : undefined,
                    password: formData.newPassword || undefined,
                    avatarIndex: formData.avatarIndex
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
            setShowPicker(false);
            mutateUser();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className={styles.container}>Loading...</div>;

    return (
        <div className={styles.container} style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <h1 className={styles.title} style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)' }}>Account Profile</h1>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Manage your identity and security settings.</p>
            </header>

            <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                {/* Avatar Display & Toggle */}
                <aside style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: '140px', height: '140px', borderRadius: '2rem', overflow: 'hidden', border: '3.5px solid hsl(var(--primary))', padding: '0.6rem', background: 'hsl(var(--primary) / 0.05)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
                            <div dangerouslySetInnerHTML={{ __html: AVATARS[formData.avatarIndex] }} style={{ width: '100%', height: '100%' }} />
                        </div>
                        <button
                            onClick={() => setShowPicker(!showPicker)}
                            style={{
                                position: 'absolute',
                                bottom: '-5px',
                                right: '-5px',
                                background: 'hsl(var(--primary))',
                                color: '#fff',
                                border: '3px solid hsl(var(--background))',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                            }}
                            title="Change Avatar"
                        >
                            📸
                        </button>
                    </div>

                    {showPicker && (
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '500px', animation: 'fadeInDown 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <label className={loginStyles.label} style={{ margin: 0 }}>Select New Avatar</label>
                                <button onClick={() => setShowPicker(false)} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>Close</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                                {AVATARS.map((svg, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, avatarIndex: i })}
                                        style={{
                                            background: formData.avatarIndex === i ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--foreground) / 0.03)',
                                            border: `2px solid ${formData.avatarIndex === i ? 'hsl(var(--primary))' : 'transparent'}`,
                                            padding: '0.4rem',
                                            borderRadius: '0.75rem',
                                            cursor: 'pointer',
                                            aspectRatio: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: svg }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                <main className="glass-panel" style={{ padding: 'clamp(1.25rem, 5vw, 2rem)', borderRadius: '1.25rem' }}>
                    <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label className={loginStyles.label}>Username</label>
                            <input
                                className={loginStyles.input}
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                placeholder="Enter username..."
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                            <div>
                                <label className={loginStyles.label}>New Password</label>
                                <input
                                    type="password"
                                    className={loginStyles.input}
                                    value={formData.newPassword}
                                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                    placeholder="Leave blank to keep current"
                                />
                            </div>
                            <div>
                                <label className={loginStyles.label}>Confirm New Password</label>
                                <input
                                    type="password"
                                    className={loginStyles.input}
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Match new password"
                                />
                            </div>
                        </div>

                        {message.text && (
                            <p style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                fontSize: '0.875rem',
                                background: message.type === 'error' ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--primary) / 0.1)',
                                color: message.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                                border: `1px solid ${message.type === 'error' ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--primary) / 0.2)'}`,
                                textAlign: 'center'
                            }}>
                                {message.text}
                            </p>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                className={loginStyles.button}
                                style={{ flex: 1, minWidth: '160px', padding: '0.875rem' }}
                            >
                                {loading ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => window.history.back()}
                                style={{ flex: 1, minWidth: '160px', background: 'transparent', border: '1px solid var(--border)', color: 'hsl(var(--foreground))', padding: '0.875rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}
                            >
                                Back
                            </button>
                        </div>
                    </form>
                </main>
            </div>

            <style jsx>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (min-width: 1024px) {
                    .profile-grid {
                        grid-template-columns: 240px 1fr;
                        align-items: start;
                    }
                }
            `}</style>
        </div>
    );
}
