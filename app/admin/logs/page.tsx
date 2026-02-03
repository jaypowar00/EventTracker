'use client';

import useSWR from 'swr';
import { fetcher, formatDateTime } from '@/lib/utils';
import styles from '../dashboard.module.css';


export default function AuditLogsPage() {
    const { data: logs, error } = useSWR('/api/logs/list', fetcher, { refreshInterval: 10000 });

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'hsl(var(--success))';
        if (action.includes('DELETE')) return 'hsl(var(--destructive))';
        if (action.includes('UPDATE') || action.includes('RESET')) return 'hsl(var(--primary))';
        return 'hsl(var(--muted-foreground))';
    };

    const renderLogDetails = (log: any) => {
        try {
            const details = JSON.parse(log.details);
            const target = details.targetUsername || details.createdUsername || details.eventName || details.deletedEventName || details.deletedUsername || null;

            switch (log.action) {
                case 'USER_CREATE':
                    return `Created user "${target || 'new user'}" with role ${details.role}.`;
                case 'USER_DELETE':
                    return `Deleted user "${target || 'someone'}" (${details.deletedRole || 'no role'}).`;
                case 'USER_UPDATE':
                    if (details.eventName) {
                        return `Assigned user "${target}" to event "${details.eventName}".`;
                    }
                    if (details.updatedFields?.length > 0) {
                        const fields = details.updatedFields.map((f: string) => {
                            if (f === 'hasSeenWelcome') return 'welcome status';
                            if (f === 'avatarIndex') return 'profile avatar';
                            return f;
                        }).join(', ');
                        return `Updated ${fields} for user "${target || 'someone'}".`;
                    }
                    return `Updated details for user "${target || 'someone'}".`;
                case 'USER_PROFILE_UPDATE':
                    if (details.updatedFields?.length > 0) {
                        const fields = details.updatedFields.map((f: string) => {
                            if (f === 'hasSeenWelcome') return 'welcome status';
                            if (f === 'avatarIndex') return 'profile avatar';
                            return f;
                        }).join(', ');
                        return `Updated ${fields}.`;
                    }
                    return `Updated profile settings.`;
                case 'USER_PASSWORD_RESET':
                    const resetType = details.isManualReset ? 'manually' : 'automatically';
                    return `Reset password for user "${target || 'someone'}" ${resetType}.`;
                case 'USER_PASSWORD_CHANGE':
                    return `User changed their own password.`;
                case 'USER_RENAME':
                    return `User renamed from "${details.oldUsername}" to "${details.newUsername}".`;
                case 'EVENT_CREATE':
                    return `Created new event "${target}".`;
                case 'EVENT_DELETE':
                    return `Deleted event "${target}".`;
                case 'EVENT_UPDATE':
                    return `Updated settings for event "${target}".`;
                case 'ENTRY_CREATE':
                    return `Added entry: ${details.itemName} x${details.count}`;
                case 'TEAM_UPDATE':
                    const teamFields = (details.updatedFields || []).map((f: string) => f === 'iconIndex' ? 'team icon' : f).join(', ') || 'settings';
                    return `Updated ${teamFields} for team.`;
                default:
                    return JSON.stringify(details);
            }
        } catch (e) {
            return log.details;
        }
    };

    return (
        <div className={styles.container} style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <button
                    onClick={() => window.location.href = '/admin'}
                    style={{
                        background: 'transparent',
                        color: 'hsl(var(--primary))',
                        border: 'none',
                        cursor: 'pointer',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 0',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        opacity: 0.8,
                        transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                >
                    ← Back to Dashboard
                </button>
                <h1 className={styles.title} style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>System Activity</h1>
                <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem', fontSize: '0.95rem' }}>History of all administrative and participant actions.</p>
            </header>

            <div className="logs-wrapper">
                {/* Desktop View Table */}
                <div className="glass-panel desktop-only" style={{ borderRadius: '1.5rem', border: '1px solid var(--border)', overflow: 'hidden', background: 'hsl(var(--card) / 0.5)' }}>
                    <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'hsl(var(--card))', boxShadow: '0 1px 0 var(--border)' }}>
                                <tr>
                                    <th style={{ width: '160px', padding: '1.25rem 1.75rem', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Time</th>
                                    <th style={{ width: '200px', padding: '1.25rem 1.75rem', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Actor</th>
                                    <th style={{ width: '160px', padding: '1.25rem 1.75rem', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Action</th>
                                    <th style={{ padding: '1.25rem 1.75rem', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!logs ? (
                                    <tr><td colSpan={4} style={{ padding: '8rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '1rem' }}>Loading system activity...</td></tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '8rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '1rem' }}>
                                            No activity recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log: any) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease', cursor: 'default' }} className="log-row">
                                            <td style={{ padding: '1.25rem 1.75rem', whiteSpace: 'nowrap', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
                                                {formatDateTime(log.timestamp)}
                                            </td>
                                            <td style={{ padding: '1.25rem 1.75rem' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{log.actorName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.1rem' }}>{log.actorRole.replace('_', ' ')}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.75rem' }}>
                                                <span style={{
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 900,
                                                    background: 'hsl(var(--foreground) / 0.05)',
                                                    color: getActionColor(log.action),
                                                    border: `1px solid ${getActionColor(log.action)}44`,
                                                    display: 'inline-block',
                                                    letterSpacing: '0.02em'
                                                }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.75rem', color: 'hsl(var(--foreground))', lineHeight: '1.6', fontSize: '0.95rem', fontWeight: 500 }}>{renderLogDetails(log)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile View Cards */}
                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!logs ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>Loading activity...</p>
                    ) : logs.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>No activity recorded yet.</p>
                    ) : (
                        logs.map((log: any) => (
                            <div key={log.id} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                        {formatDateTime(log.timestamp)}
                                    </span>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.4rem',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        background: 'hsl(var(--foreground) / 0.05)',
                                        color: getActionColor(log.action),
                                        border: `1px solid ${getActionColor(log.action)}33`
                                    }}>
                                        {log.action}
                                    </span>
                                </div>
                                <div style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'hsl(var(--foreground))', lineHeight: '1.5' }}>{renderLogDetails(log)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                                    <strong>{log.actorName}</strong> • {log.actorRole}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style jsx>{`
                .mobile-only { display: none; }
                .desktop-only { display: block; }
                .log-row:hover { background: hsl(var(--foreground) / 0.02); }
                @media (max-width: 1023px) {
                    .mobile-only { display: flex; }
                    .desktop-only { display: none; }
                }
            `}</style>
        </div>
    );
}
