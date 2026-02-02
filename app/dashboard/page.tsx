'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Modal from '@/components/Modal';
import styles from '../admin/dashboard.module.css';
import modalStyles from '@/components/Modal.module.css';
import loginStyles from '../login.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (!data.status) throw new Error(data.message);
    return data.data;
});

const AVATARS = [
    '<svg viewBox="0 0 36 36"><circle fill="#FFD042" cx="18" cy="18" r="18"/><path fill="#664500" d="M18 21c-4.97 0-9 2.03-9 4.5s4.03 4.5 9 4.5 9-2.03 9-4.5-4.03-4.5-9-4.5z"/><circle fill="#664500" cx="12" cy="14" r="2"/><circle fill="#664500" cx="24" cy="14" r="2"/></svg>',
    '<svg viewBox="0 0 36 36"><circle fill="#FFAD42" cx="18" cy="18" r="18"/><path fill="#664500" d="M18 22c-4 0-7.5 1.5-7.5 3.5s3.5 3.5 7.5 3.5 7.5-1.5 7.5-3.5-3.5-3.5-7.5-3.5z"/><circle fill="#664500" cx="12" cy="15" r="2"/><circle fill="#664500" cx="24" cy="15" r="2"/></svg>',
    // ... more avatars if needed, but we'll fetch from user info anyway
];

export default function UserDashboard() {
    const { data: user, error: userError } = useSWR('/api/user/me', fetcher);
    const [upcomingModalOpen, setUpcomingModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    const handleEventClick = (event: any) => {
        if (event.status === 'UPCOMING') {
            setSelectedEvent(event);
            setUpcomingModalOpen(true);
        } else {
            window.location.href = `/events/${event.slug}`;
        }
    };

    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    };

    if (userError) return <div className={loginStyles.error}>Failed to load dashboard. Please try logging in again.</div>;
    if (!user) return <div style={{ color: 'white', textAlign: 'center', marginTop: '4rem' }}>Loading your events...</div>;

    const events = user.events || [];

    return (
        <div className={styles.container}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3rem',
                width: '100%'
            }}>
                <div>
                    <h1 className={styles.title} style={{ marginBottom: '0.25rem' }}>Your Events</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Welcome back, {user.username}!</p>
                </div>

                <button onClick={handleLogout} className="glass-panel" style={{
                    background: 'hsl(var(--destructive) / 0.1)',
                    border: '1px solid hsl(var(--destructive) / 0.2)',
                    color: 'hsl(var(--destructive))',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                    🚪 Logout
                </button>
            </header>

            <main>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {events.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                            <p style={{ color: 'hsl(var(--muted-foreground))' }}>You are not enrolled in any events yet.</p>
                        </div>
                    ) : events.map((event: any) => (
                        <div
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className="glass-panel"
                            style={{
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                border: '1px solid var(--border)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.3)';
                                e.currentTarget.style.background = 'hsl(var(--foreground) / 0.03)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{event.name}</h3>
                                <span style={{
                                    padding: '0.3rem 0.75rem',
                                    borderRadius: '2rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: event.status === 'ONGOING' ? 'hsl(var(--success) / 0.15)' :
                                        event.status === 'UPCOMING' ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted) / 0.15)',
                                    color: event.status === 'ONGOING' ? 'hsl(var(--success))' :
                                        event.status === 'UPCOMING' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                                }}>
                                    {event.status}
                                </span>
                            </div>

                            {(event.startDate || event.endDate) && (
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span>📅</span>
                                    <span>
                                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA'}
                                        {event.endDate ? ` — ${new Date(event.endDate).toLocaleDateString()}` : ''}
                                    </span>
                                </div>
                            )}

                            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--primary))', fontWeight: 600, marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {event.status === 'UPCOMING' ? 'Wait for kick-off' : 'View Leaderboard'} <span>→</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <Modal isOpen={upcomingModalOpen} onClose={() => setUpcomingModalOpen(false)} title="Event Not Started">
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{selectedEvent?.name}</h2>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>This event has not yet started!</p>
                    {selectedEvent?.startDate && (
                        <p style={{ marginTop: '1rem', fontWeight: 600, color: 'hsl(var(--primary))' }}>
                            Kick-off: {new Date(selectedEvent.startDate).toLocaleDateString()}
                        </p>
                    )}
                    <button
                        onClick={() => setUpcomingModalOpen(false)}
                        className={loginStyles.button}
                        style={{ marginTop: '2rem', width: '100%' }}
                    >
                        Understood
                    </button>
                </div>
            </Modal>

            <style jsx>{`
                main {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
