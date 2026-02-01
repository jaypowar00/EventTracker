'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Modal from '@/components/Modal';
import styles from './dashboard.module.css';
import modalStyles from '@/components/Modal.module.css';
import loginStyles from '../login.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (!data.status) throw new Error(data.message);
    return data.data;
});

export default function AdminDashboard() {
    const { data: events, error, mutate } = useSWR('/api/events', fetcher, { refreshInterval: 5000 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [newEventSlug, setNewEventSlug] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const [newUsername, setNewUsername] = useState('');
    const [newUserRole, setNewUserRole] = useState<'EVENT_ADMIN' | 'PARTICIPANT'>('EVENT_ADMIN');
    const [creatingUser, setCreatingUser] = useState(false);
    const [userError, setUserError] = useState('');
    const [createdCredentials, setCreatedCredentials] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState('');

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            mutate();
        } catch (err: any) {
            alert('Error deleting event: ' + err.message);
        }
    };

    const slugify = (text: string) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleNameChange = (name: string) => {
        setNewEventName(name);
        if (!newEventSlug || newEventSlug === slugify(newEventName)) {
            setNewEventSlug(slugify(name));
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');
        const finalSlug = newEventSlug || slugify(newEventName);
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                body: JSON.stringify({ name: newEventName, slug: finalSlug }),
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            setNewEventName('');
            setNewEventSlug('');
            setIsModalOpen(false);
            mutate();
        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingUser(true);
        setUserError('');
        setCreatedCredentials(null);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                body: JSON.stringify({
                    username: newUsername,
                    role: newUserRole,
                    eventId: selectedEventId
                }),
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            setCreatedCredentials(data.data.credentials);
            setNewUsername('');
        } catch (err: any) {
            setUserError(err.message);
        } finally {
            setCreatingUser(false);
        }
    };

    const closeAdminModal = () => {
        setIsAdminModalOpen(false);
        setCreatedCredentials(null);
        setNewUsername('');
        setUserError('');
        setSelectedEventId('');
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout failed:', error);
        }
        window.location.href = '/';
    };

    return (
        <div className={styles.container}>
            {/* Header with Title and Navigation */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                width: '100%'
            }}>
                <h1 className={styles.title} style={{ marginBottom: 0 }}>Master Dashboard</h1>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative' }}>
                    {/* Desktop Navigation Links */}
                    <nav style={{ display: 'flex', gap: '0.75rem' }} className="desktop-only">
                        <button
                            onClick={() => window.location.href = '/admin/users'}
                            className="glass-panel"
                            style={{
                                padding: '0.625rem 1.25rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <span>👥</span> Users
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/logs'}
                            className="glass-panel"
                            style={{
                                padding: '0.625rem 1.25rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <span>📜</span> Logs
                        </button>
                    </nav>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="desktop-only"
                        style={{
                            background: 'hsl(var(--destructive) / 0.1)',
                            border: '1px solid hsl(var(--destructive) / 0.2)',
                            color: 'hsl(var(--destructive))',
                            padding: '0.625rem 1.25rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span>🚪</span> Logout
                    </button>

                    {/* Mobile Controls */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="mobile-only glass-panel"
                        style={{
                            padding: '0.625rem',
                            borderRadius: '0.5rem',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                        }}
                    >
                        ☰
                    </button>

                    {isMobileMenuOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.5rem',
                            background: 'hsl(var(--card))',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid hsl(var(--card-border))',
                            borderRadius: '0.5rem',
                            padding: '0.5rem',
                            zIndex: 1000,
                            minWidth: '180px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                        }}>
                            <button onClick={() => window.location.href = '/admin/users'} style={{ padding: '0.75rem 1rem', background: 'transparent', color: '#d1d5db', border: 'none', textAlign: 'left', cursor: 'pointer' }}>👥 Manage Users</button>
                            <button onClick={() => window.location.href = '/admin/logs'} style={{ padding: '0.75rem 1rem', background: 'transparent', color: '#d1d5db', border: 'none', textAlign: 'left', cursor: 'pointer' }}>📜 Activity Logs</button>
                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.25rem 0' }} />
                            <button onClick={handleLogout} style={{ padding: '0.75rem 1rem', background: 'transparent', color: '#ef4444', border: 'none', textAlign: 'left', cursor: 'pointer' }}>🚪 Logout</button>
                        </div>
                    )}
                </div>
            </header>

            <main>
                <div className={styles.grid}>
                    <div className={`glass-panel ${styles.card}`}>
                        <h3 className={styles.cardLabel}>Total Events</h3>
                        <p className={styles.cardValue}>{events ? events.length : '--'}</p>
                    </div>
                    <div className={`glass-panel ${styles.card}`}>
                        <h3 className={styles.cardLabel}>Active Users</h3>
                        <p className={styles.cardValue}>--</p>
                    </div>
                    <div className={`glass-panel ${styles.card}`}>
                        <h3 className={styles.cardLabel}>System Status</h3>
                        <div className={styles.statusFlex}>
                            <span className={styles.statusDot} />
                            <span className={styles.statusText}>Operational</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 mb-8" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <h2 className={styles.sectionTitle}>Quick Actions</h2>
                    <div className={styles.actionsGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        <button onClick={() => setIsModalOpen(true)} className={`glass-panel ${styles.actionBtn}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                            <span style={{ fontSize: '2rem' }}>📅</span>
                            <span style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>New Event</span>
                        </button>
                        <button onClick={() => setIsAdminModalOpen(true)} className={`glass-panel ${styles.actionBtn}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                            <span style={{ fontSize: '2rem' }}>👤</span>
                            <span style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>Add Admin</span>
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <h2 className={styles.sectionTitle}>Recent Events</h2>
                    {!events ? (
                        <div style={{ color: '#9ca3af' }}>Loading events...</div>
                    ) : events.length === 0 ? (
                        <div style={{ color: '#9ca3af' }}>No events found. Create one to get started.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {events.map((event: any) => (
                                <div
                                    key={event.id}
                                    onClick={(e) => {
                                        // Ignore if delete button was clicked
                                        if ((e.target as HTMLElement).closest('button')) return;
                                        window.location.href = `/events/${event.slug}`;
                                    }}
                                    className="glass-panel"
                                    style={{
                                        padding: '1.5rem',
                                        borderRadius: '1rem',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease, background 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--foreground) / 0.03)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{event.name}</h3>
                                            <code style={{ fontSize: '0.875rem', color: 'hsl(var(--primary))', padding: '0.25rem 0.5rem', background: 'hsl(var(--primary) / 0.1)', borderRadius: '0.25rem' }}>/{event.slug}</code>
                                        </div>
                                        <span style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: event.status === 'ONGOING' ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--muted) / 0.15)', color: event.status === 'ONGOING' ? 'hsl(var(--success))' : 'hsl(var(--muted))' }}>{event.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Teams</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{event._count.teams}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Participants</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{event._count.participants || 0}</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto' }}>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Event Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Event">
                <form onSubmit={handleCreate} className={modalStyles.form}>
                    {createError && <div className={loginStyles.error}>{createError}</div>}
                    <div>
                        <label className={loginStyles.label}>Event Name</label>
                        <input className={loginStyles.input} value={newEventName} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Summer Camp 2026" required />
                    </div>
                    <div>
                        <label className={loginStyles.label}>URL Slug (optional)</label>
                        <input className={loginStyles.input} value={newEventSlug} onChange={e => setNewEventSlug(e.target.value)} placeholder="Auto-generated" />
                    </div>
                    <div className={modalStyles.footer}>
                        <button type="button" onClick={() => setIsModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={creating} className={modalStyles.submitBtn}>{creating ? 'Creating...' : 'Create Event'}</button>
                    </div>
                </form>
            </Modal>

            {/* Add User Modal */}
            <Modal isOpen={isAdminModalOpen} onClose={closeAdminModal} title="Add New User">
                {!createdCredentials ? (
                    <form onSubmit={handleCreateUser} className={modalStyles.form}>
                        {userError && <div className={loginStyles.error}>{userError}</div>}
                        <div>
                            <label className={loginStyles.label}>Username</label>
                            <input className={loginStyles.input} value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="e.g. john_doe" required />
                        </div>
                        <div>
                            <label className={loginStyles.label}>Role</label>
                            <select className={loginStyles.input} value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)}>
                                <option value="EVENT_ADMIN">Event Admin</option>
                                <option value="PARTICIPANT">Participant</option>
                            </select>
                        </div>
                        <div>
                            <label className={loginStyles.label}>Associated Event (Optional)</label>
                            <select className={loginStyles.input} value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                                <option value="">None (Global Access)</option>
                                {events?.map((event: any) => (
                                    <option key={event.id} value={event.id}>{event.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={modalStyles.footer}>
                            <button type="button" onClick={closeAdminModal} className={modalStyles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={creatingUser} className={modalStyles.submitBtn}>{creatingUser ? 'Creating...' : 'Create User'}</button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                            <p style={{ color: 'hsl(var(--success))', fontWeight: 600 }}>✓ User created successfully!</p>
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '0.5rem', padding: '1rem', fontFamily: 'Monaco, monospace' }}>
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>USERNAME: <span style={{ color: '#fff' }}>{createdCredentials.username}</span></p>
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>PASSWORD: <span style={{ color: 'hsl(var(--primary))' }}>{createdCredentials.password}</span></p>
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>PUBLIC ID: <span style={{ color: '#fff' }}>{createdCredentials.publicId}</span></p>
                        </div>
                        <div className={modalStyles.footer}>
                            <button onClick={closeAdminModal} className={modalStyles.submitBtn}>Done</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
