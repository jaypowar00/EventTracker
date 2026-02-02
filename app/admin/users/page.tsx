'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Modal from '@/components/Modal';
import styles from '../dashboard.module.css';
import modalStyles from '@/components/Modal.module.css';
import loginStyles from '../../login.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (!data.status) throw new Error(data.message);
    return data.data;
});

export default function UserManagementPage() {
    const { data: users, mutate: mutateUsers } = useSWR('/api/users/list', fetcher);
    const { data: events } = useSWR('/api/events', fetcher);

    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [resetCreds, setResetCreds] = useState<any>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resettingUser, setResettingUser] = useState<any>(null);
    const [manualPassword, setManualPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [newUser, setNewUser] = useState({
        username: '',
        role: 'PARTICIPANT',
        eventIds: [] as string[],
        password: ''
    });

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isBulkCreate, setIsBulkCreate] = useState(false);
    const [bulkCreateText, setBulkCreateText] = useState('');
    const [bulkResult, setBulkResult] = useState<any>(null);

    const filteredUsers = (users || [])?.filter((u: any) => {
        const search = searchTerm.toLowerCase();
        return u.username.toLowerCase().includes(search) ||
            String(u.publicId).toLowerCase().includes(search);
    });

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUsers(filteredUsers.map((u: any) => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (id: string) => {
        if (selectedUsers.includes(id)) {
            setSelectedUsers(selectedUsers.filter(uid => uid !== id));
        } else {
            setSelectedUsers([...selectedUsers, id]);
        }
    };

    const handleBulkAction = async (action: 'delete' | 'toggle_welcome', value?: boolean) => {
        if (!confirm(`Are you sure you want to ${action} ${selectedUsers.length} users?`)) return;
        setLoading(true);
        try {
            const res = await fetch('/api/users/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    userIds: selectedUsers,
                    value
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            mutateUsers();
            setSelectedUsers([]);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isBulkCreate) {
                // Parse bulk text
                const lines = bulkCreateText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const usersToCreate = lines.map(l => ({ username: l }));

                const res = await fetch('/api/users/bulk', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'create',
                        users: usersToCreate,
                        eventIds: newUser.eventIds, // Send all selected event IDs
                        password: newUser.password || undefined // Send the default password if provided
                    })
                });
                const data = await res.json();
                if (!data.status) throw new Error(data.message);

                setBulkResult(data.data);
                setIsAddModalOpen(false);
                setBulkCreateText('');
                mutateUsers();

            } else {
                const res = await fetch('/api/users', {
                    method: 'POST',
                    body: JSON.stringify({
                        username: newUser.username,
                        role: newUser.role,
                        eventIds: newUser.eventIds,
                        password: newUser.password || undefined
                    })
                });
                const data = await res.json();
                if (!data.status) throw new Error(data.message);

                setIsAddModalOpen(false);
                setNewUser({ username: '', role: 'PARTICIPANT', eventIds: [], password: '' });
                mutateUsers();
                setResetCreds(data.data.credentials);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            mutateUsers();
        } catch (err: any) {
            alert(err.message);
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

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    role: editingUser.role,
                    eventIds: editingUser.eventIds || []
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            setIsEditModalOpen(false);
            mutateUsers();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeStyle = (role: string) => {
        const base = {
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 700,
            border: '1px solid currentColor'
        };

        if (role === 'SUPER_ADMIN') return { ...base, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' };
        if (role === 'EVENT_ADMIN') return { ...base, background: 'hsl(var(--secondary) / 0.1)', color: 'hsl(var(--secondary))' };
        return { ...base, background: 'hsl(var(--muted) / 0.1)', color: 'hsl(var(--muted-foreground))' };
    };

    return (
        <div className={styles.container} style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
            <header className="admin-header" style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <button onClick={() => window.location.href = '/admin'} style={{ background: 'transparent', color: 'hsl(var(--primary))', border: 'none', cursor: 'pointer', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}>
                            ← Back
                        </button>
                        <h1 className={styles.title} style={{ marginBottom: 0 }}>User Management</h1>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="glass-panel"
                        style={{
                            padding: '0 1.5rem',
                            borderRadius: '0.75rem',
                            background: 'hsl(var(--primary) / 0.1)',
                            border: '1px solid hsl(var(--primary) / 0.2)',
                            color: 'hsl(var(--primary))',
                            fontWeight: 700,
                            height: '2.75rem',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>+</span> Add New User
                    </button>
                </div>

                <div className="search-container" style={{ marginTop: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '1rem', position: 'relative', maxWidth: '500px' }}>
                        <span style={{ fontSize: '1.1rem', opacity: 0.7 }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search by name or unique ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'hsl(var(--foreground))', outline: 'none', fontSize: '0.95rem', width: '100%' }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: '0.25rem', fontSize: '1.1rem' }}>✕</button>
                        )}
                    </div>
                </div>
            </header>

            {/* Bulk Actions Toolbar */}
            {selectedUsers.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'hsl(var(--card))',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    zIndex: 100
                }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUsers.length} selected</span>
                    <div style={{ height: '20px', width: '1px', background: 'var(--border)' }}></div>
                    <button onClick={() => handleBulkAction('toggle_welcome', true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem' }} title="Mark as Seen Welcome">👁️</button>
                    <button onClick={() => handleBulkAction('toggle_welcome', false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem' }} title="Mark as Unseen Welcome">🚫</button>
                    <div style={{ height: '20px', width: '1px', background: 'var(--border)' }}></div>
                    <button onClick={() => handleBulkAction('delete')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem' }} title="Delete Selected">🗑️</button>
                </div>
            )}

            <div className="users-wrapper">
                {/* Desktop View Table */}
                <div className="glass-panel desktop-only" style={{ borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'hsl(var(--card))', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '1.25rem 1.5rem', width: '40px' }}>
                                    <input type="checkbox" onChange={handleSelectAll} checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} />
                                </th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Details</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seen Welcome</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Associated Event</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: '5rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>No users found matching your search.</td></tr>
                            ) : filteredUsers.map((user: any) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease', background: selectedUsers.includes(user.id) ? 'hsl(var(--primary) / 0.05)' : 'transparent' }} className="user-row">
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelectUser(user.id)} />
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.username}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.1rem' }}>ID: {user.publicId}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <span style={getRoleBadgeStyle(user.role)}>{user.role}</span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        {user.hasSeenWelcome ? '✅ Yes' : '❌ No'}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem' }}>
                                        {user.events && user.events.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {user.events.map((e: any, idx: number) => (
                                                    <span key={`${e.id}-${idx}`} style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{e.name}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.7 }}>Global Access</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => { setEditingUser({ ...user, eventIds: user.events?.map((e: any) => e.id) || [] }); setIsEditModalOpen(true); }} style={{ background: 'hsl(var(--foreground) / 0.05)', border: 'none', padding: '0.625rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s ease' }} className="action-btn" title="Edit User">✏️</button>
                                            <button onClick={() => { setResettingUser(user); setIsResetModalOpen(true); }} style={{ background: 'hsl(var(--foreground) / 0.05)', border: 'none', padding: '0.625rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s ease' }} className="action-btn" title="Reset Password">🔑</button>
                                            <button onClick={() => handleDelete(user.id, user.username)} style={{ background: 'hsl(var(--destructive) / 0.1)', border: 'none', color: 'hsl(var(--destructive))', padding: '0.625rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s ease' }} className="action-btn delete" title="Delete User">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredUsers.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>No users found.</p>
                    ) : filteredUsers.map((user: any) => (
                        <div key={user.id} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)', background: selectedUsers.includes(user.id) ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--card))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelectUser(user.id)} />
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.username}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>ID: {user.publicId}</div>
                                    </div>
                                    <span style={getRoleBadgeStyle(user.role)}>{user.role}</span>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                <span>📅 {new Date(user.createdAt).toLocaleDateString()}</span>
                                <span>{user.hasSeenWelcome ? '✅ Seen Intro' : '🚫 Not Seen'}</span>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                {user.events && user.events.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        {user.events.map((e: any, idx: number) => (
                                            <span key={`${e.id}-${idx}`} style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>{e.name}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '0.8rem', opacity: 0.6, fontStyle: 'italic' }}>Global Access</span>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <button onClick={() => { setEditingUser({ ...user, eventIds: user.events?.map((e: any) => e.id) || [] }); setIsEditModalOpen(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', background: 'hsl(var(--foreground) / 0.05)', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                                    <span>✏️</span> Edit
                                </button>
                                <button onClick={() => { setResettingUser(user); setIsResetModalOpen(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', background: 'hsl(var(--foreground) / 0.05)', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                                    <span>🔑</span> Reset
                                </button>
                                <button onClick={() => handleDelete(user.id, user.username)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', background: 'hsl(var(--destructive) / 0.1)', border: 'none', color: 'hsl(var(--destructive))', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                                    <span>🗑️</span> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals remain the same but use the updated shared components */}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={isBulkCreate ? "Bulk Create Users" : "Add New User"}>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <button onClick={() => setIsBulkCreate(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: !isBulkCreate ? 700 : 400, color: !isBulkCreate ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>Single User</button>
                    <button onClick={() => setIsBulkCreate(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: isBulkCreate ? 700 : 400, color: isBulkCreate ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>Bulk Mode</button>
                </div>

                <form onSubmit={handleCreateUser} className={modalStyles.form}>

                    {!isBulkCreate ? (
                        <>
                            <div>
                                <label className={loginStyles.label}>Username</label>
                                <input
                                    className={loginStyles.input}
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    placeholder="Enter username"
                                    required
                                />
                            </div>

                            <div>
                                <label className={loginStyles.label}>Role</label>
                                <select
                                    className={loginStyles.input}
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="PARTICIPANT">Participant</option>
                                    <option value="EVENT_ADMIN">Event Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className={loginStyles.label}>Primary Event (Optional)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                    {events?.map((e: any) => (
                                        <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={newUser.eventIds.includes(e.id)}
                                                onChange={(event) => {
                                                    const currentIds = newUser.eventIds;
                                                    const newIds = event.target.checked
                                                        ? [...currentIds, e.id]
                                                        : currentIds.filter(id => id !== e.id);
                                                    setNewUser({ ...newUser, eventIds: newIds });
                                                }}
                                            />
                                            {e.name}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={loginStyles.label}>Custom Password (Optional)</label>
                                <input
                                    className={loginStyles.input}
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder="Leave empty for auto-generation"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className={loginStyles.label}>Usernames (One per line)</label>
                            <textarea
                                className={loginStyles.input}
                                style={{ minHeight: '200px', fontFamily: 'monospace' }}
                                value={bulkCreateText}
                                onChange={e => setBulkCreateText(e.target.value)}
                                placeholder={"JohnDoe\nJaneDoe\n..."}
                                required
                            />
                            <div style={{ marginTop: '1rem' }}>
                                <label className={loginStyles.label}>Assign to Events (Optional)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                    {events?.map((e: any) => (
                                        <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={newUser.eventIds.includes(e.id)}
                                                onChange={(event) => {
                                                    const currentIds = newUser.eventIds;
                                                    const newIds = event.target.checked
                                                        ? [...currentIds, e.id]
                                                        : currentIds.filter(id => id !== e.id);
                                                    setNewUser({ ...newUser, eventIds: newIds });
                                                }}
                                            />
                                            {e.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label className={loginStyles.label}>Default Password (Optional)</label>
                                <input
                                    className={loginStyles.input}
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder="Leave empty for auto-generation"
                                    type="text"
                                />
                                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
                                    Visible text to avoid typos. Used for all created users.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className={modalStyles.footer}>
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={loading} className={modalStyles.submitBtn}>{loading ? 'Creating...' : (isBulkCreate ? 'Create All' : 'Create User')}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!bulkResult} onClose={() => setBulkResult(null)} title="Bulk Creation Result">
                {bulkResult && (
                    <div>
                        <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ color: 'hsl(var(--success))' }}>Created ({bulkResult.createdUsers.length})</h4>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'hsl(var(--card))', padding: '0.5rem' }}>
                                {bulkResult.createdUsers.map((u: any, i: number) => (
                                    <div key={i} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '0.2rem 0' }}>
                                        <span>{u.username}</span>
                                        <code style={{ background: 'hsl(var(--muted))', padding: '0 0.2rem' }}>{u.password}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {bulkResult.failedUsers.length > 0 && (
                            <div>
                                <h4 style={{ color: 'hsl(var(--destructive))' }}>Failed ({bulkResult.failedUsers.length})</h4>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'hsl(var(--card))', padding: '0.5rem' }}>
                                    {bulkResult.failedUsers.map((u: any, i: number) => (
                                        <div key={i} style={{ fontSize: '0.85rem', color: 'hsl(var(--destructive))' }}>
                                            {u.username}: {u.reason}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className={modalStyles.footer}>
                            <button onClick={() => setBulkResult(null)} className={modalStyles.submitBtn}>Done</button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
                {editingUser && (
                    <form onSubmit={handleUpdateUser} className={modalStyles.form}>
                        <div>
                            <label className={loginStyles.label}>Username</label>
                            <input className={loginStyles.input} value={editingUser.username} disabled style={{ opacity: 0.6 }} />
                        </div>
                        <div>
                            <label className={loginStyles.label}>Role</label>
                            <select className={loginStyles.input} value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                                <option value="SUPER_ADMIN">Super Admin</option>
                                <option value="EVENT_ADMIN">Event Admin</option>
                                <option value="PARTICIPANT">Participant</option>
                            </select>
                        </div>
                        <div>
                            <label className={loginStyles.label}>Events</label>
                            <div className="glass-panel" style={{ maxHeight: '150px', overflowY: 'auto', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {events?.map((e: any) => (
                                    <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={editingUser.eventIds?.includes(e.id)}
                                            onChange={(event) => {
                                                const currentIds = editingUser.eventIds || [];
                                                const newIds = event.target.checked
                                                    ? [...currentIds, e.id]
                                                    : currentIds.filter((id: string) => id !== e.id);
                                                setEditingUser({ ...editingUser, eventIds: newIds });
                                            }}
                                        />
                                        {e.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className={modalStyles.footer}>
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={loading} className={modalStyles.submitBtn}>{loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Password">
                {resettingUser && (
                    <form onSubmit={handleResetPassword} className={modalStyles.form}>
                        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Update password for <strong>{resettingUser.username}</strong>.</p>
                        <div>
                            <label className={loginStyles.label}>Manual Password (Optional)</label>
                            <input className={loginStyles.input} value={manualPassword} onChange={e => setManualPassword(e.target.value)} placeholder="Type a new password..." />
                        </div>
                        <div className={modalStyles.footer}>
                            <button type="button" onClick={() => setIsResetModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={loading} className={modalStyles.submitBtn}>{loading ? 'Processing...' : 'Reset Password'}</button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal isOpen={!!resetCreds} onClose={() => setResetCreds(null)} title="Credentials">
                {resetCreds && (
                    <div>
                        <div style={{ background: 'hsl(var(--success) / 0.1)', border: '1px solid hsl(var(--success) / 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                            <p style={{ color: 'hsl(var(--success))', fontWeight: 600 }}>✓ Success</p>
                        </div>
                        <div style={{ background: 'hsl(var(--foreground) / 0.05)', borderRadius: '0.5rem', padding: '1.25rem', fontFamily: 'monospace' }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Username</div>
                                <div style={{ fontWeight: 700 }}>{resetCreds.username}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Password</div>
                                <div style={{ fontWeight: 700, color: 'hsl(var(--primary))', fontSize: '1.25rem' }}>{resetCreds.password}</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '1rem' }}>Share these safely. Password is shown only once.</p>
                        <div className={modalStyles.footer}>
                            <button onClick={() => setResetCreds(null)} className={modalStyles.submitBtn}>Done</button>
                        </div>
                    </div>
                )}
            </Modal>

            <style jsx>{`
                .mobile-only { display: none; }
                .desktop-only { display: block; }
                @media (max-width: 1023px) {
                    .mobile-only { display: flex; }
                    .desktop-only { display: none; }
                    .search-container { margin-top: 1rem; }
                    .search-container div { max-width: none !important; }
                }
            `}</style>
        </div>
    );
}
