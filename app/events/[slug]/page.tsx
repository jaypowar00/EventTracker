'use client';

import { use, useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Modal from '@/components/Modal';
import { AVATARS } from '@/lib/avatars';
import { fetcher, formatPoints, formatTime12H } from '@/lib/utils';
import styles from '@/app/admin/dashboard.module.css';
import modalStyles from '@/components/Modal.module.css';
import loginStyles from '@/app/login.module.css';


export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);

    // Data Fetching
    const { data: user, mutate: mutateUser } = useSWR('/api/user/me', fetcher);
    const { data: event, mutate: mutateEvent } = useSWR(`/api/events/${slug}`, fetcher);
    const { data: leaderboard, mutate: mutateLeaderboard } = useSWR(`/api/events/${slug}/leaderboard`, fetcher, { refreshInterval: 5000 });
    const { data: history, mutate: mutateHistory } = useSWR(`/api/events/${slug}/history`, fetcher, { refreshInterval: 5000 });

    // UI State
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [activeHistoryTab, setActiveHistoryTab] = useState<'global' | 'your'>('global');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [entryData, setEntryData] = useState({ itemName: '', quantity: '1', volume: '30', percentage: '4.8' });
    const [itemSearch, setItemSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [editedRules, setEditedRules] = useState('');
    const [editedEvent, setEditedEvent] = useState({ name: '', slug: '' });
    const [newItemData, setNewItemData] = useState({ name: '', volume: '30', percentage: '4.8' });
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [editFormData, setEditFormData] = useState({ quantity: '', volume: '', percentage: '' });

    useEffect(() => {
        if (event) {
            setEditedRules(event.rules || '');
            setEditedEvent({ name: event.name, slug: event.slug });
        }
    }, [event]);

    // Handle Onboarding Trigger
    useEffect(() => {
        if (user && event && user.role === 'PARTICIPANT') {
            const userEvent = user.events?.find((e: any) => e.id === event.id);
            if (userEvent && userEvent.hasSeenWelcome === false) {
                setIsWelcomeModalOpen(true);
            }
        }
    }, [user, event]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/entries', {
                method: 'POST',
                body: JSON.stringify({
                    itemName: entryData.itemName,
                    quantity: entryData.quantity,
                    volume: entryData.volume,
                    percentage: entryData.percentage,
                    eventId: event.id
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setIsEntryModalOpen(false);
            setEntryData({ itemName: '', quantity: '1', volume: '30', percentage: '4.8' });
            setItemSearch('');
            mutateLeaderboard();
            mutateHistory();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRules = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/events/${slug}`, {
                method: 'PATCH',
                body: JSON.stringify({ rules: editedRules })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setIsRulesModalOpen(false);
            mutateEvent();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!event) return;
        const newStatus = event.status === 'ONGOING' ? 'FINISHED' : 'ONGOING';
        if (!confirm(`Are you sure you want to mark this event as ${newStatus}?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/events/${slug}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);
            mutateEvent();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItemPoints = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/items/${editingItem.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: editingItem.name,
                    defaultVolume: editingItem.defaultVolume,
                    defaultPercentage: editingItem.defaultPercentage
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setEditingItem(null);
            mutateHistory();
            // Also re-fetch items if modal is open
            if (isItemsModalOpen) mutateItems();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/events/${slug}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: editedEvent.name,
                    newSlug: user?.role === 'SUPER_ADMIN' ? editedEvent.slug : undefined
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            if (data.data.slug !== slug) {
                window.location.href = `/events/${data.data.slug}`;
                return;
            }

            setIsSettingsModalOpen(false);
            mutateEvent();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/events/${slug}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    name: newItemData.name,
                    defaultVolume: newItemData.volume,
                    defaultPercentage: newItemData.percentage
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setNewItemData({ name: '', volume: '30', percentage: '4.8' });
            mutateItems();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const { data: allItems, mutate: mutateItems } = useSWR(isItemsModalOpen ? `/api/events/${slug}/items?q=${searchQuery}` : null, fetcher);
    const { data: itemSuggestions } = useSWR(isEntryModalOpen ? `/api/events/${slug}/items?q=${itemSearch}` : null, fetcher);

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('Are you sure you want to delete this entry? This will revert the points.')) return;

        try {
            const res = await fetch(`/api/entries/${entryId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            mutateHistory();
            mutateLeaderboard();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUpdateEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEntry) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/entries/${editingEntry.id}`, {
                method: 'PATCH',
                body: JSON.stringify(editFormData)
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setEditingEntry(null);
            mutateHistory();
            mutateLeaderboard();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSkipWelcome = async () => {
        try {
            // Mark as seen and ensure default team exists
            await fetch('/api/user/profile', {
                method: 'PATCH',
                body: JSON.stringify({ hasSeenWelcome: true, eventId: event.id })
            });
            await fetch('/api/teams', {
                method: 'POST',
                body: JSON.stringify({ action: 'CREATE_DEFAULT', eventId: event.id })
            });
            setIsWelcomeModalOpen(false);
            mutateUser();
            mutateLeaderboard();
        } catch (err) {
            console.error('Failed to skip welcome:', err);
        }
    };

    const handleJoinTeam = async (teamId: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                body: JSON.stringify({ action: 'JOIN', teamId: teamId })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            // Mark welcome as seen if first time
            // Check if this specific event has seen welcome
            const userEvent = user?.events?.find((e: any) => e.id === event.id);
            if (userEvent && !userEvent.hasSeenWelcome) {
                await fetch('/api/user/profile', {
                    method: 'PATCH',
                    body: JSON.stringify({ hasSeenWelcome: true, eventId: event.id })
                });
            }

            setIsWelcomeModalOpen(false);
            mutateUser();
            mutateLeaderboard();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const rankedTeams = leaderboard?.filter((t: any) => t.totalPoints > 0) || [];
    const unrankedTeams = leaderboard?.filter((t: any) => t.totalPoints === 0) || [];

    const topThree = rankedTeams.slice(0, 3);
    const restOfRanked = rankedTeams.slice(3);
    const allRemaining = [...restOfRanked, ...unrankedTeams];

    const currentTeam = user?.memberships?.[0]?.team;

    return (
        <div className={styles.container} style={{ marginBottom: '64px' }} >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {event?.name}
                            {event?.status === 'FINISHED' && (
                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '2rem', background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.2)', textTransform: 'uppercase', fontWeight: 700 }}>Finished</span>
                            )}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>Tracker • {user?.role?.replace('_', ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) || 'Loading...'}</p>
                            {['SUPER_ADMIN', 'EVENT_ADMIN'].includes(user?.role) && (
                                <button
                                    onClick={handleToggleStatus}
                                    style={{ fontSize: '0.71rem', padding: '0.1rem 0.6rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', opacity: 0.6, fontWeight: 600 }}
                                >
                                    {event?.status === 'ONGOING' ? '🏁 Finish Event' : '▶️ Resume Event'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {user?.role === 'PARTICIPANT' && (
                        <button
                            onClick={() => setIsEntryModalOpen(true)}
                            className="glass-panel desktop-only"
                            style={{
                                background: event?.status === 'FINISHED' ? 'var(--muted)' : 'hsl(var(--primary) / 0.1)',
                                color: event?.status === 'FINISHED' ? 'var(--muted-foreground)' : 'hsl(var(--primary))',
                                padding: '0.5rem 1.25rem',
                                borderRadius: '0.5rem',
                                border: '1px solid hsl(var(--primary) / 0.2)',
                                cursor: event?.status === 'FINISHED' ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                opacity: event?.status === 'FINISHED' ? 0.5 : 1
                            }}
                            disabled={event?.status === 'FINISHED'}
                        >
                            ➕ Add Entry
                        </button>
                    )}

                    {['SUPER_ADMIN', 'EVENT_ADMIN'].includes(user?.role) && (
                        <button
                            onClick={() => setIsItemsModalOpen(true)}
                            className="glass-panel desktop-only"
                            style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: '1px solid hsl(var(--primary) / 0.2)', cursor: 'pointer', fontWeight: 600 }}
                        >
                            📦 Item Library
                        </button>
                    )}

                    {/* User Dropdown */}
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            className="glass-panel"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'hsl(var(--foreground) / 0.05)',
                                color: 'hsl(var(--foreground))',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '2rem',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid hsl(var(--primary))' }} dangerouslySetInnerHTML={{ __html: AVATARS[user?.avatarIndex || 0] }} />
                            <span>{user?.username || 'User'}</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>▼</span>
                        </button>

                        {isUserDropdownOpen && (
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: 'calc(100% + 0.75rem)',
                                right: 0,
                                width: '200px',
                                background: 'hsl(var(--card))',
                                borderRadius: '0.75rem',
                                padding: '0.5rem',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                zIndex: 100,
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Logged in as</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
                                </div>
                                <button onClick={() => window.location.href = '/profile'} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: 'none', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', fontSize: '0.875rem' }}>👤 My Profile</button>

                                {user?.role === 'PARTICIPANT' && (
                                    <button onClick={() => window.location.href = `/teams/manage?eventId=${event?.id}`} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: 'none', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', fontSize: '0.875rem' }}>👥 Manage Team</button>
                                )}

                                {['SUPER_ADMIN', 'EVENT_ADMIN'].includes(user?.role) && (
                                    <button onClick={() => setIsItemsModalOpen(true)} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: 'none', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', fontSize: '0.875rem' }}>📦 Item Library</button>
                                )}

                                {['SUPER_ADMIN', 'EVENT_ADMIN'].includes(user?.role) ? (
                                    <button onClick={() => setIsRulesModalOpen(true)} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: 'none', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', fontSize: '0.875rem' }}>📜 Set Rules</button>
                                ) : (
                                    <button onClick={() => setIsRulesModalOpen(true)} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: 'none', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', fontSize: '0.875rem' }}>📜 Event Rules</button>
                                )}

                                {['SUPER_ADMIN', 'EVENT_ADMIN'].includes(user?.role) && (
                                    <button onClick={() => setIsSettingsModalOpen(true)} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: 'none', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', fontSize: '0.875rem' }}>⚙️ Event Settings</button>
                                )}

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.4rem 0' }} />
                                <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: 'none', background: 'transparent', color: 'hsl(var(--destructive))', cursor: 'pointer', fontSize: '0.875rem' }}>🚪 Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="event-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Leaderboard Section */}
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🏆 Leaderboard
                        </h2>

                        {/* Podium */}
                        <div className="podium-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '2rem', alignItems: 'end', }}>
                            {[1, 0, 2].map((idx) => {
                                const team = topThree[idx];
                                if (!team) return <div key={idx} className="glass-panel" style={{ height: '120px', opacity: 0.15, borderRadius: '1rem' }} />;
                                return (
                                    <div
                                        key={team.id}
                                        onClick={() => setSelectedTeam(team)}
                                        className="glass-panel podium-card clickable"
                                        style={{
                                            padding: '1rem 0.25rem',
                                            textAlign: 'center',
                                            borderRadius: '1.25rem',
                                            border: team.id === currentTeam?.id
                                                ? '1.5px solid #3b82f6'
                                                : `1.5px solid ${idx === 0 ? 'hsl(var(--primary) / 0.4)' : 'var(--border)'}`,
                                            marginBottom: '0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            background: team.id === currentTeam?.id
                                                ? 'rgba(59, 130, 246, 0.12)'
                                                : (idx === 0 ? 'hsl(var(--primary) / 0.08)' : 'transparent'),
                                            position: 'relative',
                                            boxShadow: team.id === currentTeam?.id
                                                ? '0 10px 30px -10px rgba(59, 130, 246, 0.4)'
                                                : (idx === 0 ? '0 10px 30px -10px hsl(var(--primary) / 0.3)' : 'none'),
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s ease, background 0.2s ease',
                                            flexShrink: 0,
                                            width: '100%',
                                        }}
                                    >
                                        <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)' }}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <div style={{
                                            width: idx === 0 ? '64px' : '48px',
                                            height: idx === 0 ? '64px' : '48px',
                                            margin: '0 auto 0.75rem',
                                            border: idx === 0 ? '2px solid hsl(var(--primary))' : '1.5px solid var(--border)',
                                            borderRadius: '1rem',
                                            padding: idx === 0 ? '8px' : '6px',
                                            background: 'hsl(var(--background) / 0.5)'
                                        }} dangerouslySetInnerHTML={{ __html: AVATARS[team.iconIndex || 0] }} />
                                        <h3 style={{
                                            fontSize: idx === 0 ? '0.9rem' : '0.8rem',
                                            fontWeight: 700,
                                            marginBottom: '0.25rem',
                                            whiteSpace: 'normal',
                                            lineHeight: 1.1,
                                            padding: '0 4px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>{team.name}</h3>
                                        <div
                                            style={{ color: 'hsl(var(--primary))', fontWeight: 800, fontSize: idx === 0 ? '1.1rem' : '1rem' }}
                                            title={team.totalPoints.toLocaleString() + " points"}
                                        >
                                            {formatPoints(team.totalPoints)} pts
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* List */}
                        <div className="glass-panel" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'hsl(var(--card))', borderBottom: '1px solid var(--border)' }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Rank</th>
                                        <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Team</th>
                                        <th style={{ padding: '0.75rem 1.75rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', textAlign: 'right' }}>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard?.length === 0 ? (
                                        <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>No teams joined yet.</td></tr>
                                    ) : allRemaining.map((team: any) => {
                                        const globalIndex = leaderboard.findIndex((t: any) => t.id === team.id);
                                        return (
                                            <tr
                                                key={team.id}
                                                onClick={() => setSelectedTeam(team)}
                                                style={{
                                                    borderBottom: '1px solid var(--border)',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s ease',
                                                    background: team.id === currentTeam?.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent'
                                                }}
                                                className="leaderboard-row"
                                            >
                                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: team.id === currentTeam?.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                                                    {team.totalPoints > 0 ? `#${globalIndex + 1}` : '-'}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: AVATARS[team.iconIndex || 0] }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ color: team.id === currentTeam?.id ? '#3b82f6' : 'inherit', fontWeight: team.id === currentTeam?.id ? 700 : 600 }}>
                                                            {team.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: team.id === currentTeam?.id ? '#3b82f6' : 'inherit' }}>
                                                    {team.totalPoints > 0 ? `${formatPoints(team.totalPoints)} pts` : <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>(unranked)</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>


                </main>

                <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: 'fit-content', position: 'sticky', top: '1rem' }}>
                    {/* Points History */}
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                📊 Points History
                            </h2>
                            <div className="glass-panel" style={{ display: 'flex', background: 'hsl(var(--foreground) / 0.05)', padding: '0.2rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                <button
                                    onClick={() => setActiveHistoryTab('global')}
                                    style={{
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '0.4rem',
                                        border: 'none',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: activeHistoryTab === 'global' ? 'hsl(var(--background))' : 'transparent',
                                        color: activeHistoryTab === 'global' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                        boxShadow: activeHistoryTab === 'global' ? 'var(--shadow-sm)' : 'none'
                                    }}
                                >
                                    Global
                                </button>
                                {user?.role === 'PARTICIPANT' && (
                                    <button
                                        onClick={() => setActiveHistoryTab('your')}
                                        style={{
                                            padding: '0.3rem 0.8rem',
                                            borderRadius: '0.4rem',
                                            border: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: activeHistoryTab === 'your' ? 'hsl(var(--background))' : 'transparent',
                                            color: activeHistoryTab === 'your' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                            boxShadow: activeHistoryTab === 'your' ? 'var(--shadow-sm)' : 'none'
                                        }}
                                    >
                                        Your
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                            {(!history || history.length === 0) ? (
                                <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '2rem 0' }}>No points earned yet.</p>
                            ) : (
                                (activeHistoryTab === 'global' ? history : history.filter((item: any) => item.username === user?.username)).length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '2rem 0' }}>{activeHistoryTab === 'your' ? "You haven't earned any points yet." : "No entries found."}</p>
                                ) : (activeHistoryTab === 'global' ? history : history.filter((item: any) => item.username === user?.username)).map((item: any) => (
                                    <div key={item.id} style={{
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        background: 'hsl(var(--foreground) / 0.03)',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.875rem',
                                        position: 'relative',
                                        minHeight: 'fit-content'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid hsl(var(--primary))' }} dangerouslySetInnerHTML={{ __html: AVATARS[item.avatarIndex || 0] }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700 }}>{item.username} {item.username === user?.username && <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(You)</span>}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>{item.teamName}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div
                                                    style={{ color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '1rem' }}
                                                    title={item.points.toLocaleString() + " points"}
                                                >
                                                    +{formatPoints(item.points)} pts
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className="glass-panel"
                                            style={{
                                                padding: '0.6rem',
                                                background: 'hsl(var(--foreground) / 0.02)',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--border)',
                                                marginBottom: '0.25rem',
                                                cursor: (user?.role === 'SUPER_ADMIN' || user?.username === item.username) ? 'pointer' : 'default',
                                                transition: 'background 0.2s ease'
                                            }}
                                            onClick={() => {
                                                if (user?.role === 'SUPER_ADMIN' || user?.username === item.username) {
                                                    setEditingEntry(item);
                                                    setEditFormData({
                                                        quantity: item.count.toString(),
                                                        volume: item.volume.toString(),
                                                        percentage: item.percentage.toString()
                                                    });
                                                }
                                            }}
                                            title={(user?.role === 'SUPER_ADMIN' || user?.username === item.username) ? "Click to edit or delete" : ""}
                                        >
                                            <div style={{ fontWeight: 600, marginBottom: '0.2rem', fontSize: '0.85rem', wordBreak: 'break-word' }}>{item.count}x {item.itemName}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 }}>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <span>💧 {item.volume}ml</span>
                                                    <span>🍷 {item.percentage}% ABV</span>
                                                </div>
                                                <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>🕒 {formatTime12H(item.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Rules Section (Full Width Bottom) */}
            {event?.rules && (
                <section
                    className="glass-panel"
                    style={{
                        padding: '2rem',
                        borderRadius: '1.25rem',
                        marginTop: '3rem',
                        marginBottom: '4rem',
                        border: '1px solid var(--border)',
                        background: 'hsl(var(--card))'
                    }}
                >
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: 'hsl(var(--foreground))'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>📜</span> Event Rules & Guidelines
                    </h2>
                    <div style={{
                        color: 'hsl(var(--muted-foreground))',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8,
                        fontSize: '0.95rem'
                    }}>
                        {event.rules}
                    </div>
                </section>
            )}

            {/* Welcome Onboarding Modal */}
            <Modal isOpen={isWelcomeModalOpen} onClose={() => { }} title={`Welcome to ${event?.name}!`} hideClose={true}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', borderRadius: '50%', border: '3px solid hsl(var(--primary))', padding: '8px' }} dangerouslySetInnerHTML={{ __html: AVATARS[user?.avatarIndex || 0] }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Glad you're here, {user?.username}!</h3>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Join an existing team to compete together, or stay in your personal team.
                    </p>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label className={loginStyles.label}>Available Teams</label>
                    {leaderboard?.filter((t: any) => t.id !== currentTeam?.id).map((team: any) => (
                        <button
                            key={team.id}
                            onClick={() => handleJoinTeam(team.id)}
                            className="glass-panel"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem',
                                width: '100%',
                                border: '1px solid var(--border)',
                                background: 'hsl(var(--foreground) / 0.03)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: '0.75rem'
                            }}
                        >
                            <div style={{ width: '32px', height: '32px' }} dangerouslySetInnerHTML={{ __html: AVATARS[team.iconIndex || 0] }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{team.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{team.totalPoints} points</div>
                            </div>
                            <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>Join →</span>
                        </button>
                    ))}
                    {leaderboard?.filter((t: any) => t.id !== currentTeam?.id).length === 0 && (
                        <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>No other teams yet. You can always change this later!</p>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button onClick={handleSkipWelcome} className={loginStyles.button}>
                        Skip For Now (Stay in Individual Team)
                    </button>
                    <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                        * You can manage your team and icon from the profile dropdown later.
                    </p>
                </div>
            </Modal>

            {/* Entry Modal */}
            <Modal
                isOpen={isEntryModalOpen}
                onClose={() => setIsEntryModalOpen(false)}
                title="Add New Entry"
                closeOnOutsideClick={false}
                onClick={() => setShowSuggestions(false)}
            >
                <form onSubmit={handleAddEntry} className={modalStyles.form} onClick={() => setShowSuggestions(false)}>
                    <div style={{ position: 'relative' }}>
                        <label className={loginStyles.label}>Item Name</label>
                        <input
                            className={loginStyles.input}
                            required
                            value={entryData.itemName}
                            onChange={e => {
                                setEntryData({ ...entryData, itemName: e.target.value });
                                setItemSearch(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Example: Beer, Wine, Cider..."
                        />
                        {showSuggestions && itemSuggestions && itemSuggestions.length > 0 && (
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                background: 'hsl(var(--card))',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                                marginTop: '4px',
                                maxHeight: '250px',
                                overflowY: 'auto',
                                boxShadow: '0 15px 35px rgba(0,0,0,0.3)'
                            }}>
                                {itemSuggestions.map((item: any) => (
                                    <div
                                        key={item.id}
                                        style={{ padding: '1rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '1rem' }}
                                        className="suggestion-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEntryData({
                                                ...entryData,
                                                itemName: item.name,
                                                volume: item.defaultVolume?.toString() || entryData.volume,
                                                percentage: item.defaultPercentage?.toString() || entryData.percentage
                                            });
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                            Preset: {item.defaultVolume}ml • {item.defaultPercentage}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className={loginStyles.label}>Volume (ml)</label>
                            <input
                                type="number"
                                className={loginStyles.input}
                                required
                                min="1"
                                value={entryData.volume}
                                onChange={e => setEntryData({ ...entryData, volume: e.target.value })}
                                placeholder="e.g. 30"
                            />
                        </div>
                        <div>
                            <label className={loginStyles.label}>Percentage (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                className={loginStyles.input}
                                required
                                min="0"
                                value={entryData.percentage}
                                onChange={e => setEntryData({ ...entryData, percentage: e.target.value })}
                                placeholder="e.g. 4.8"
                            />
                        </div>
                    </div>
                    <div>
                        <label className={loginStyles.label}>Quantity</label>
                        <input
                            type="number"
                            className={loginStyles.input}
                            required
                            min="1"
                            value={entryData.quantity}
                            onChange={e => setEntryData({ ...entryData, quantity: e.target.value })}
                        />
                    </div>
                    <div style={{ background: 'hsl(var(--primary) / 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid hsl(var(--primary) / 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>Estimated Points</div>
                        <div
                            style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--primary))', cursor: 'help' }}
                            title={"Exact calculation: " + Math.round((parseInt(entryData.volume || '0') * parseFloat(entryData.percentage || '0') * parseInt(entryData.quantity || '0')) / 10).toLocaleString() + " pts"}
                        >
                            {formatPoints(Math.round((parseInt(entryData.volume || '0') * parseFloat(entryData.percentage || '0') * parseInt(entryData.quantity || '0')) / 10))} pts
                        </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '-0.5rem' }}>
                        * Items are subject to point verification by admins.
                    </p>
                    <div className={modalStyles.footer}>
                        <button type="button" onClick={() => setIsEntryModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                            {loading ? 'Submitting...' : 'Submit Entry'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Rules Modal */}
            <Modal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} title={['SUPER_ADMIN', 'EVENT_ADMIN'].includes(user?.role) ? "Edit Event Rules" : "Event Rules"}>
                {['SUPER_ADMIN', 'EVENT_ADMIN'].includes(user?.role) ? (
                    <form onSubmit={handleUpdateRules} className={modalStyles.form}>
                        <div>
                            <label className={loginStyles.label}>Rules / Description</label>
                            <textarea
                                className={loginStyles.input}
                                style={{ minHeight: '300px', fontFamily: 'inherit', resize: 'vertical' }}
                                value={editedRules}
                                onChange={e => setEditedRules(e.target.value)}
                                placeholder="Enter event rules, guidelines, or points info..."
                            />
                        </div>
                        <div className={modalStyles.footer}>
                            <button type="button" onClick={() => setIsRulesModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                                {loading ? 'Saving...' : 'Save Rules'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'hsl(var(--foreground))', padding: '1rem', background: 'hsl(var(--foreground) / 0.03)', borderRadius: '0.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
                        {event?.rules || "No rules have been set for this event yet."}
                    </div>
                )}
            </Modal>

            {/* Team Details Popup */}
            <Modal
                isOpen={!!selectedTeam}
                onClose={() => setSelectedTeam(null)}
                title="Team Details"
                className="team-details-modal"
            >
                {selectedTeam && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.5rem' }}>
                            <div style={{ textAlign: 'center', position: 'sticky', top: 0, background: 'hsl(var(--card))', zIndex: 10, padding: '1rem 0' }}>
                                <div style={{ width: '80px', height: '80px', margin: '0 auto 1rem', borderRadius: '1.25rem', border: '3px solid hsl(var(--primary))', padding: '8px', background: 'hsl(var(--primary) / 0.05)' }} dangerouslySetInnerHTML={{ __html: AVATARS[selectedTeam.iconIndex || 0] }} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>{selectedTeam.name}</h3>
                                <div
                                    style={{ color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '1.2rem', cursor: 'help' }}
                                    title={"Exact score: " + selectedTeam.totalPoints.toLocaleString() + " points"}
                                >
                                    {formatPoints(selectedTeam.totalPoints)} Points
                                </div>
                            </div>

                            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        👥 Members ({selectedTeam.memberCount})
                                    </h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    {selectedTeam.members.map((member: any) => (
                                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'hsl(var(--foreground) / 0.03)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid hsl(var(--primary))' }} dangerouslySetInnerHTML={{ __html: AVATARS[member.avatarIndex || 0] }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{member.username}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>ID: {member.publicId}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{formatPoints(member.points)} pts</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Internal Team History */}
                            <TeamHistory teamId={selectedTeam.id} eventSlug={slug} currentUser={user} />
                        </div>

                        <div className={modalStyles.footer} style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => setSelectedTeam(null)} className={modalStyles.submitBtn} style={{ width: '100%' }}>Close Preview</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Manage All Items Modal */}
            <Modal
                isOpen={isItemsModalOpen}
                onClose={() => setIsItemsModalOpen(false)}
                title="Item Library"
                closeOnOutsideClick={false}
                className="library-modal"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Add New Item Section */}
                    <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid hsl(var(--primary) / 0.1)' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'hsl(var(--primary))' }}>✨ Add New Item</h4>
                        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                className={loginStyles.input}
                                placeholder="Item Name (e.g. Red Feni)"
                                value={newItemData.name}
                                onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                                required
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <input
                                    type="number"
                                    className={loginStyles.input}
                                    placeholder="Vol (ml)"
                                    value={newItemData.volume}
                                    onChange={e => setNewItemData({ ...newItemData, volume: e.target.value })}
                                    required
                                />
                                <input
                                    type="number"
                                    step="0.1"
                                    className={loginStyles.input}
                                    placeholder="ABV (%)"
                                    value={newItemData.percentage}
                                    onChange={e => setNewItemData({ ...newItemData, percentage: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" disabled={loading} className={loginStyles.button} style={{ padding: '0.6rem' }}>
                                {loading ? 'Adding...' : 'Add to Library'}
                            </button>
                        </form>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                className={loginStyles.input}
                                style={{ paddingLeft: '2.5rem' }}
                                placeholder="Search library..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {!allItems ? (
                                <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>Loading library...</p>
                            ) : allItems.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>No items found.</p>
                            ) : allItems.map((item: any) => (
                                <div key={item.id} className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                            Preset: {item.defaultVolume}ml • {item.defaultPercentage}%
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        style={{ padding: '0.4rem 0.75rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={modalStyles.footer}>
                        <button onClick={() => setIsItemsModalOpen(false)} className={modalStyles.submitBtn} style={{ width: '100%' }}>Close Library</button>
                    </div>
                </div>
            </Modal>

            {/* Edit Item Points Modal */}
            <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title={`Edit Point Allocation`}>
                {editingItem && (
                    <form onSubmit={handleUpdateItemPoints} className={modalStyles.form}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editingItem.name}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Update Library Preset</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className={loginStyles.label}>Volume (ml)</label>
                                <input
                                    type="number"
                                    className={loginStyles.input}
                                    required
                                    min="0"
                                    value={editingItem.defaultVolume}
                                    onChange={e => setEditingItem({ ...editingItem, defaultVolume: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className={loginStyles.label}>Percentage (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className={loginStyles.input}
                                    required
                                    min="0"
                                    value={editingItem.defaultPercentage}
                                    onChange={e => setEditingItem({ ...editingItem, defaultPercentage: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ background: 'hsl(var(--warning) / 0.1)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid hsl(var(--warning) / 0.2)', fontSize: '0.75rem', color: 'hsl(var(--warning-foreground))', marginTop: '0.5rem' }}>
                            ⚠️ This change only affects **future** entries. Past entries on the leaderboard will remain unchanged.
                        </div>
                        <div className={modalStyles.footer}>
                            <button type="button" onClick={() => setEditingItem(null)} className={modalStyles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                                {loading ? 'Saving...' : 'Update Preset'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Edit Entry Modal */}
            <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Entry">
                {editingEntry && (
                    <form onSubmit={handleUpdateEntry} className={modalStyles.form}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{editingEntry.itemName}</h3>
                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Update entry details</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className={loginStyles.label}>Volume (ml)</label>
                                <input
                                    type="number"
                                    className={loginStyles.input}
                                    value={editFormData.volume}
                                    onChange={e => setEditFormData({ ...editFormData, volume: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className={loginStyles.label}>Percentage (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className={loginStyles.input}
                                    value={editFormData.percentage}
                                    onChange={e => setEditFormData({ ...editFormData, percentage: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className={loginStyles.label}>Quantity</label>
                            <input
                                type="number"
                                className={loginStyles.input}
                                value={editFormData.quantity}
                                onChange={e => setEditFormData({ ...editFormData, quantity: e.target.value })}
                                required
                            />
                        </div>

                        <div style={{ background: 'hsl(var(--primary) / 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid hsl(var(--primary) / 0.1)', marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>New Estimated Points</div>
                            <div
                                style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--primary))', cursor: 'help' }}
                                title={"Exact calculation: " + Math.round((parseInt(editFormData.volume || '0') * parseFloat(editFormData.percentage || '0') * parseInt(editFormData.quantity || '0')) / 10).toLocaleString() + " pts"}
                            >
                                {formatPoints(Math.round((parseInt(editFormData.volume || '0') * parseFloat(editFormData.percentage || '0') * parseInt(editFormData.quantity || '0')) / 10))} pts
                            </div>
                        </div>

                        <div className={modalStyles.footer} style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this entry?')) {
                                        handleDeleteEntry(editingEntry.id);
                                        setEditingEntry(null);
                                    }
                                }}
                                className={modalStyles.cancelBtn}
                                style={{ color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive) / 0.2)' }}
                            >
                                🗑️ Delete
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" onClick={() => setEditingEntry(null)} className={modalStyles.cancelBtn}>Cancel</button>
                                <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                                    {loading ? 'Saving...' : 'Update Entry'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Event Settings Modal */}
            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Event Settings">
                <form onSubmit={handleUpdateEvent} className={modalStyles.form}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className={loginStyles.label}>Event Name</label>
                            <input
                                className={loginStyles.input}
                                value={editedEvent.name}
                                onChange={e => setEditedEvent({ ...editedEvent, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className={loginStyles.label}>Event URL Slug</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>/events/</span>
                                <input
                                    className={loginStyles.input}
                                    value={editedEvent.slug}
                                    onChange={e => setEditedEvent({ ...editedEvent, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    required
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={handleToggleStatus}
                                className={loginStyles.button}
                                style={{
                                    width: '100%',
                                    background: event?.status === 'ONGOING' ? 'hsl(var(--warning) / 0.1)' : 'hsl(var(--primary) / 0.1)',
                                    color: event?.status === 'ONGOING' ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                                    border: `1px solid ${event?.status === 'ONGOING' ? 'hsl(var(--warning) / 0.2)' : 'hsl(var(--primary) / 0.2)'}`
                                }}
                            >
                                {event?.status === 'ONGOING' ? '⛔ Finish Event' : '▶️ Resume Event'}
                            </button>
                        </div>
                    </div>
                    <div className={modalStyles.footer} style={{ marginTop: '1.5rem' }}>
                        <button type="button" onClick={() => setIsSettingsModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Floating Action Button for Mobile */}
            {(user?.role === 'PARTICIPANT') && (
                <button
                    className="mobile-fab"
                    onClick={() => setIsEntryModalOpen(true)}
                    title="Add Entry"
                    style={{
                        opacity: event?.status === 'FINISHED' && user?.role === 'PARTICIPANT' ? 0.3 : 1,
                        cursor: event?.status === 'FINISHED' && user?.role === 'PARTICIPANT' ? 'not-allowed' : 'pointer'
                    }}
                    disabled={event?.status === 'FINISHED' && user?.role === 'PARTICIPANT'}
                >
                    ➕
                </button>
            )}

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .desktop-only { display: block; }
                .mobile-fab { display: none; }

                @media (max-width: 1023px) {
                    .event-dashboard-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .podium-container {
                        justify-items: center;
                    }
                    .desktop-only { display: none !important; }
                    .mobile-fab {
                        display: flex;
                        position: fixed;
                        bottom: 2rem;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 64px;
                        height: 64px;
                        background: hsl(var(--primary));
                        color: white;
                        border: 4px solid hsl(var(--background));
                        border-radius: 50%;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.75rem;
                        cursor: pointer;
                        box-shadow: 0 10px 25px -5px hsl(var(--primary) / 0.5);
                        z-index: 99;
                        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    .mobile-fab:active {
                        transform: translateX(-50%) scale(0.9);
                    }
                }
                
                @media (min-width: 1024px) {
                    .event-dashboard-grid {
                        grid-template-columns: 1fr 350px !important;
                    }
                }

                :global(.team-details-modal) {
                    height: 80vh !important;
                    min-height: 400px;
                    max-height: 80vh !important;
                    margin-top: -6vh !important;
                    display: flex;
                    flex-direction: column;
                }

                @media (max-width: 1023px) {
                    * {
                        scrollbar-width: thin;
                        scrollbar-color: hsl(var(--primary) / 0.2) transparent;
                    }
                    *::-webkit-scrollbar {
                        width: 4px;
                    }
                    *::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    *::-webkit-scrollbar-thumb {
                        background: hsl(var(--primary) / 0.2);
                        border-radius: 10px;
                    }
                }
                    :global(.library-modal) {
                        max-height: 80vh !important;
                        margin-top: -6vh !important;
                        display: flex;
                        flex-direction: column;
                    }

                    :global(.library-modal > div:last-child) {
                        overflow-y: auto !important;
                        flex: 1;
                        padding-right: 0.5rem;
                    }
                `}</style>
        </div>
    );
}

function TeamHistory({ teamId, eventSlug, currentUser }: { teamId: string, eventSlug: string, currentUser: any }) {
    const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
        if (!data.status) throw new Error(data.message);
        return data.data;
    });

    const { data: history } = useSWR(`/api/events/${eventSlug}/history?teamId=${teamId}`, fetcher);

    if (!history) return null;

    return (
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                📜 Activity Log
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '200px', overflowY: 'auto' }}>
                {history.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '1rem' }}>No entries yet.</p>
                ) : history.map((item: any) => (
                    <div key={item.id} style={{
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        background: 'hsl(var(--foreground) / 0.03)',
                        border: '1px solid var(--border)',
                        fontSize: '0.85rem',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1.2px solid hsl(var(--primary))' }} dangerouslySetInnerHTML={{ __html: AVATARS[item.avatarIndex || 0] }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{item.username} {item.username === currentUser?.username && <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>(You)</span>}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div
                                    style={{ color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '0.9rem' }}
                                    title={item.points.toLocaleString() + " points"}
                                >
                                    +{formatPoints(item.points)} pts
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '0.5rem', background: 'hsl(var(--foreground) / 0.02)', borderRadius: '0.4rem', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.15rem', fontSize: '0.8rem', wordBreak: 'break-word' }}>{item.count}x {item.itemName}</div>
                            <div style={{ fontSize: '0.65rem', color: '#3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <span>💧 {item.volume}ml</span>
                                    <span>🍷 {item.percentage}% ABV</span>
                                </div>
                                <span style={{ opacity: 0.6, fontSize: '0.6rem' }}>🕒 {formatTime12H(item.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
