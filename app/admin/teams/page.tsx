'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import styles from '../dashboard.module.css';
import loginStyles from '../../login.module.css';

export default function TeamManagementPage() {
    const { data: teams, mutate: mutateTeams } = useSWR('/api/teams/list', fetcher);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterZeroMembers, setFilterZeroMembers] = useState(false);
    const [filterEvent, setFilterEvent] = useState<string>('');
    const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    // Get unique events for filter dropdown
    const uniqueEvents = teams ? [...new Map(teams.map((t: any) => [t.eventId, { id: t.eventId, name: t.eventName }])).values()] : [];

    // Filter teams
    const filteredTeams = teams?.filter((team: any) => {
        const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.eventName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesZeroFilter = !filterZeroMembers || team.memberCount === 0;
        const matchesEventFilter = !filterEvent || team.eventId === filterEvent;
        return matchesSearch && matchesZeroFilter && matchesEventFilter;
    }) || [];

    // Count zero-member teams
    const zeroMemberCount = teams?.filter((t: any) => t.memberCount === 0).length || 0;

    const handleSelectAll = () => {
        if (selectedTeams.size === filteredTeams.length) {
            setSelectedTeams(new Set());
        } else {
            setSelectedTeams(new Set(filteredTeams.map((t: any) => t.id)));
        }
    };

    const handleSelectTeam = (teamId: string) => {
        const newSelected = new Set(selectedTeams);
        if (newSelected.has(teamId)) {
            newSelected.delete(teamId);
        } else {
            newSelected.add(teamId);
        }
        setSelectedTeams(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedTeams.size === 0) return;

        const confirmMsg = `Are you sure you want to delete ${selectedTeams.size} team(s)? This will also delete all their entries, history, and requests.`;
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/teams/list', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamIds: Array.from(selectedTeams) })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            alert(data.message);
            setSelectedTeams(new Set());
            mutateTeams();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <button
                        onClick={() => window.location.href = '/admin'}
                        style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        ← Back to Admin
                    </button>
                </div>
                <h1 className={styles.title}>Team Management</h1>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
                    View and manage all teams across events. {zeroMemberCount > 0 && (
                        <span style={{ color: 'hsl(var(--destructive))' }}>
                            {zeroMemberCount} team(s) with zero members.
                        </span>
                    )}
                </p>
            </header>

            {/* Filters Bar */}
            <div className="glass-panel" style={{
                padding: '1.25rem',
                borderRadius: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center'
            }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="Search teams or events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={loginStyles.input}
                        style={{ paddingLeft: '2.5rem', height: '42px' }}
                    />
                    <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                </div>

                <select
                    value={filterEvent}
                    onChange={(e) => setFilterEvent(e.target.value)}
                    className={loginStyles.input}
                    style={{ width: 'auto', minWidth: '180px', height: '42px' }}
                >
                    <option value="">All Events</option>
                    {uniqueEvents.map((event: any) => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                </select>

                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: filterZeroMembers ? 'hsl(var(--destructive) / 0.1)' : 'transparent',
                    border: filterZeroMembers ? '1px solid hsl(var(--destructive) / 0.3)' : '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: filterZeroMembers ? 'hsl(var(--destructive))' : 'inherit'
                }}>
                    <input
                        type="checkbox"
                        checked={filterZeroMembers}
                        onChange={(e) => setFilterZeroMembers(e.target.checked)}
                        style={{ accentColor: 'hsl(var(--destructive))' }}
                    />
                    Zero Members Only
                </label>

                {selectedTeams.size > 0 && (
                    <button
                        onClick={handleBulkDelete}
                        disabled={loading}
                        style={{
                            background: 'hsl(var(--destructive))',
                            color: '#fff',
                            border: 'none',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        🗑️ Delete {selectedTeams.size} Team(s)
                    </button>
                )}
            </div>

            {/* Stats */}
            <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                Showing {filteredTeams.length} of {teams?.length || 0} teams
                {selectedTeams.size > 0 && ` • ${selectedTeams.size} selected`}
            </div>

            {/* Teams Table */}
            <div className="glass-panel" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'hsl(var(--foreground) / 0.03)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filteredTeams.length > 0 && selectedTeams.size === filteredTeams.length}
                                        onChange={handleSelectAll}
                                        style={{ accentColor: 'hsl(var(--primary))' }}
                                    />
                                </th>
                                <th style={{ padding: '1rem' }}>Team</th>
                                <th style={{ padding: '1rem' }}>Event</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Members</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Entries</th>
                                <th style={{ padding: '1rem' }}>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!teams ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                                        Loading teams...
                                    </td>
                                </tr>
                            ) : filteredTeams.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                                        No teams found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTeams.map((team: any) => (
                                    <tr
                                        key={team.id}
                                        style={{
                                            borderTop: '1px solid var(--border)',
                                            background: selectedTeams.has(team.id) ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                                            transition: 'background 0.15s'
                                        }}
                                    >
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTeams.has(team.id)}
                                                onChange={() => handleSelectTeam(team.id)}
                                                style={{ accentColor: 'hsl(var(--primary))' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ fontWeight: 600 }}>{team.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                                ID: {team.publicId}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div>{team.eventName}</div>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '0.25rem',
                                                background: team.eventStatus === 'ONGOING' ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--muted-foreground) / 0.1)',
                                                color: team.eventStatus === 'ONGOING' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
                                                fontWeight: 600
                                            }}>
                                                {team.eventStatus}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <span style={{
                                                fontWeight: 700,
                                                color: team.memberCount === 0 ? 'hsl(var(--destructive))' : 'inherit'
                                            }}>
                                                {team.memberCount}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            {team.entryCount}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>
                                            {new Date(team.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
