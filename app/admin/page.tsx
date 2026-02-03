'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Modal from '@/components/Modal';
import { fetcher } from '@/lib/utils';
import styles from './dashboard.module.css';
import modalStyles from '@/components/Modal.module.css';
import loginStyles from '../login.module.css';


export default function AdminDashboard() {
    const { data: events, error, mutate } = useSWR('/api/events', fetcher, { refreshInterval: 5000 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [newEventData, setNewEventData] = useState({ name: '', slug: '', startDate: '', endDate: '', status: 'UPCOMING' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // For editing existing events
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [selectedEventForItems, setSelectedEventForItems] = useState<any>(null);

    const [newUsername, setNewUsername] = useState('');
    const [newUserRole, setNewUserRole] = useState<'EVENT_ADMIN' | 'PARTICIPANT'>('EVENT_ADMIN');
    const [creatingUser, setCreatingUser] = useState(false);
    const [userError, setUserError] = useState('');
    const [createdCredentials, setCreatedCredentials] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState('');

    const slugify = (text: string) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

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

    const handleNameChange = (name: string) => {
        const slug = slugify(name);
        setNewEventData(prev => ({
            ...prev,
            name,
            slug: prev.slug === slugify(prev.name) ? slug : prev.slug
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                body: JSON.stringify(newEventData),
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            setNewEventData({ name: '', slug: '', startDate: '', endDate: '', status: 'UPCOMING' });
            setIsModalOpen(false);
            mutate();
        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent) return;
        setCreating(true);
        try {
            const res = await fetch(`/api/events/${editingEvent.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: editingEvent.name,
                    status: editingEvent.status,
                    startDate: editingEvent.startDate,
                    endDate: editingEvent.endDate,
                    newSlug: editingEvent.slug
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            setIsSettingsModalOpen(false);
            setEditingEvent(null);
            mutate();
        } catch (err: any) {
            alert(err.message);
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
                            onClick={() => window.location.href = '/admin/teams'}
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
                            <span>🏆</span> Teams
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
                            <button onClick={() => window.location.href = '/admin/teams'} style={{ padding: '0.75rem 1rem', background: 'transparent', color: '#d1d5db', border: 'none', textAlign: 'left', cursor: 'pointer' }}>🏆 Manage Teams</button>
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
                                    className="glass-panel"
                                    style={{
                                        padding: '1.5rem',
                                        borderRadius: '1rem',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        transition: 'background 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div onClick={() => window.location.href = `/events/${event.slug}`} style={{ cursor: 'pointer' }}>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{event.name}</h3>
                                            <code style={{ fontSize: '0.875rem', color: 'hsl(var(--primary))', padding: '0.25rem 0.5rem', background: 'hsl(var(--primary) / 0.1)', borderRadius: '0.25rem' }}>/{event.slug}</code>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <span style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: event.status === 'ONGOING' ? 'hsl(var(--success) / 0.15)' : event.status === 'UPCOMING' ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted) / 0.15)', color: event.status === 'ONGOING' ? 'hsl(var(--success))' : event.status === 'UPCOMING' ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}>{event.status}</span>
                                            <button onClick={() => { setEditingEvent(event); setIsSettingsModalOpen(true); }} className="glass-panel" style={{ padding: '0.4rem 0.8rem', background: 'hsl(var(--foreground) / 0.05)', border: '1px solid var(--border)', color: 'hsl(var(--foreground))', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>⚙️ Settings</button>
                                        </div>
                                    </div>

                                    {(event.startDate || event.endDate) && (
                                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span>📅</span>
                                            <span>
                                                {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA'}
                                                {event.endDate ? ` — ${new Date(event.endDate).toLocaleDateString()}` : ''}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Teams</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{event._count?.teams || 0}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Participants</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{event._count?.participants || 0}</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={() => { setSelectedEventForItems(event); setIsItemsModalOpen(true); }} className="glass-panel" style={{ padding: '0.5rem 1rem', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>📦 Items</button>
                                            <button onClick={() => handleDeleteEvent(event.id)} style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>Delete</button>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className={loginStyles.label}>Event Name</label>
                            <input className={loginStyles.input} value={newEventData.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Summer Camp 2026" required />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className={loginStyles.label}>URL Slug</label>
                            <input className={loginStyles.input} value={newEventData.slug} onChange={e => setNewEventData({ ...newEventData, slug: e.target.value })} placeholder="Auto-generated" />
                        </div>
                        <div>
                            <label className={loginStyles.label}>Start Date</label>
                            <input type="date" className={loginStyles.input} value={newEventData.startDate} onChange={e => setNewEventData({ ...newEventData, startDate: e.target.value })} />
                        </div>
                        <div>
                            <label className={loginStyles.label}>End Date</label>
                            <input type="date" className={loginStyles.input} value={newEventData.endDate} onChange={e => setNewEventData({ ...newEventData, endDate: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className={loginStyles.label}>Initial Status</label>
                            <select className={loginStyles.input} value={newEventData.status} onChange={e => setNewEventData({ ...newEventData, status: e.target.value })}>
                                <option value="UPCOMING">Upcoming</option>
                                <option value="ONGOING">Ongoing</option>
                                <option value="FINISHED">Finished</option>
                            </select>
                        </div>
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
                            <label className={loginStyles.label}>Associated Event (Choose one or more)</label>
                            <select className={loginStyles.input} value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                                <option value="">None (Global Access)</option>
                                {events?.map((event: any) => (
                                    <option key={event.id} value={event.id}>{event.name}</option>
                                ))}
                            </select>
                            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.4rem' }}>Note: You can add more events later in User Management.</p>
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

            {/* Event Settings Modal */}
            <Modal isOpen={isSettingsModalOpen} onClose={() => { setIsSettingsModalOpen(false); setEditingEvent(null); }} title="Event Settings">
                {editingEvent && (
                    <form onSubmit={handleUpdateEvent} className={modalStyles.form}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className={loginStyles.label}>Event Name</label>
                                <input className={loginStyles.input} value={editingEvent.name} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} required />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className={loginStyles.label}>URL Slug</label>
                                <input className={loginStyles.input} value={editingEvent.slug} onChange={e => setEditingEvent({ ...editingEvent, slug: e.target.value })} />
                            </div>
                            <div>
                                <label className={loginStyles.label}>Start Date</label>
                                <input type="date" className={loginStyles.input} value={editingEvent.startDate ? new Date(editingEvent.startDate).toISOString().split('T')[0] : ''} onChange={e => setEditingEvent({ ...editingEvent, startDate: e.target.value })} />
                            </div>
                            <div>
                                <label className={loginStyles.label}>End Date</label>
                                <input type="date" className={loginStyles.input} value={editingEvent.endDate ? new Date(editingEvent.endDate).toISOString().split('T')[0] : ''} onChange={e => setEditingEvent({ ...editingEvent, endDate: e.target.value })} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className={loginStyles.label}>Status</label>
                                <select className={loginStyles.input} value={editingEvent.status} onChange={e => setEditingEvent({ ...editingEvent, status: e.target.value })}>
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="ONGOING">Ongoing</option>
                                    <option value="FINISHED">Finished</option>
                                </select>
                            </div>
                        </div>
                        <div className={modalStyles.footer}>
                            <button type="button" onClick={() => { setIsSettingsModalOpen(false); setEditingEvent(null); }} className={modalStyles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={creating} className={modalStyles.submitBtn}>{creating ? 'Saving...' : 'Save Settings'}</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Item Management Placeholder/Redirect Modal */}
            <Modal isOpen={isItemsModalOpen} onClose={() => { setIsItemsModalOpen(false); setSelectedEventForItems(null); }} title={`Manage Items - ${selectedEventForItems?.name}`}>
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem' }}>You can manage beverage items and point presets for this event.</p>
                    <button
                        onClick={() => window.location.href = `/events/${selectedEventForItems?.slug}`}
                        className={loginStyles.button}
                        style={{ width: '100%' }}
                    >
                        Go to Event Page to Manage Items
                    </button>
                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.6 }}>Full item management integration coming soon to this dashboard.</p>
                </div>
            </Modal>
        </div>
    );
}
