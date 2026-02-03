'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Modal from '@/components/Modal';
import { fetcher } from '@/lib/utils';
import styles from '../admin/dashboard.module.css';
import modalStyles from '@/components/Modal.module.css';
import loginStyles from '../login.module.css';

const AVATARS = [
    '<svg viewBox="0 0 36 36"><circle fill="#FFD042" cx="18" cy="18" r="18"/><path fill="#664500" d="M18 21c-4.97 0-9 2.03-9 4.5s4.03 4.5 9 4.5 9-2.03 9-4.5-4.03-4.5-9-4.5z"/><circle fill="#664500" cx="12" cy="14" r="2"/><circle fill="#664500" cx="24" cy="14" r="2"/></svg>',
    '<svg viewBox="0 0 36 36"><circle fill="#FFAD42" cx="18" cy="18" r="18"/><path fill="#664500" d="M18 22c-4 0-7.5 1.5-7.5 3.5s3.5 3.5 7.5 3.5 7.5-1.5 7.5-3.5-3.5-3.5-7.5-3.5z"/><circle fill="#664500" cx="12" cy="15" r="2"/><circle fill="#664500" cx="24" cy="15" r="2"/></svg>',
];

interface DashboardContentProps {
    initialUser?: any;
}

export default function DashboardContent({ initialUser }: DashboardContentProps) {
    const { data: user, error: userError } = useSWR('/api/user/me', fetcher, {
        fallbackData: initialUser,
        revalidateOnMount: !initialUser // Only revalidate if no initial data
    });
    const [upcomingModalOpen, setUpcomingModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming'>('ongoing');
    const [searchQuery, setSearchQuery] = useState('');

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

    // Filtering logic
    const filteredEvents = events.filter((e: any) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const ongoingEvents = filteredEvents.filter((e: any) => e.status === 'ONGOING');
    const upcomingEvents = filteredEvents.filter((e: any) => e.status === 'UPCOMING');
    const finishedEvents = filteredEvents.filter((e: any) => e.status === 'FINISHED');

    const displayEvents = activeTab === 'ongoing' ? ongoingEvents : upcomingEvents;

    return (
        <div className={styles.container} style={{ paddingBottom: '5rem' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                width: '100%',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 className={styles.title} style={{ marginBottom: '0.25rem', fontSize: '2.5rem' }}>Your Events</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.95rem' }}>Welcome back, <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>{user.username}</span>!</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="search-wrapper" style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={loginStyles.input + " search-input"}
                            style={{
                                paddingLeft: '2.5rem',
                                background: 'hsl(var(--foreground) / 0.05)',
                                height: '42px'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    </div>
                    <button onClick={handleLogout} className="glass-panel" style={{
                        background: 'hsl(var(--destructive) / 0.1)',
                        border: '1px solid hsl(var(--destructive) / 0.2)',
                        color: 'hsl(var(--destructive))',
                        padding: '0 1.25rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        height: '42px'
                    }}>
                        🚪 Logout
                    </button>
                </div>
            </header>

            <main>
                {/* Tabs & Scroller Section */}
                <section style={{ marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <button
                            onClick={() => setActiveTab('ongoing')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === 'ongoing' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '0.5rem 1rem',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            Active {ongoingEvents.length > 0 && <span style={{ fontSize: '0.7rem', background: 'hsl(var(--primary) / 0.1)', padding: '0.2rem 0.5rem', borderRadius: '1rem' }}>{ongoingEvents.length}</span>}
                            {activeTab === 'ongoing' && <div style={{ position: 'absolute', bottom: '-0.6rem', left: 0, right: 0, height: '3px', background: 'hsl(var(--primary))', borderRadius: '3px' }} />}
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === 'upcoming' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '0.5rem 1rem',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            Upcoming {upcomingEvents.length > 0 && <span style={{ fontSize: '0.7rem', background: 'hsl(var(--muted-foreground) / 0.1)', padding: '0.2rem 0.5rem', borderRadius: '1rem' }}>{upcomingEvents.length}</span>}
                            {activeTab === 'upcoming' && <div style={{ position: 'absolute', bottom: '-0.6rem', left: 0, right: 0, height: '3px', background: 'hsl(var(--primary))', borderRadius: '3px' }} />}
                        </button>
                    </div>

                    <div className="event-grid-container" style={{
                        padding: '0.5rem 0.25rem',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}>
                        {displayEvents.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', width: '100%', borderRadius: '1.5rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{activeTab === 'ongoing' ? '🍃' : '🗓️'}</div>
                                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.1rem' }}>
                                    {searchQuery ? 'No matching events found.' : `No ${activeTab} events at the moment.`}
                                </p>
                            </div>
                        ) : displayEvents.map((event: any) => (
                            <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="glass-panel event-card"
                                style={{
                                    padding: '1.75rem',
                                    borderRadius: '1.5rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: '1px solid var(--border)',
                                    background: 'hsl(var(--card) / 0.5)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.25rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{event.name}</h3>
                                    {
                                        event.status === 'ONGOING' ?
                                            <></> :
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                background: event.status === 'ONGOING' ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--primary) / 0.15)',
                                                borderRadius: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.25rem'
                                            }}>
                                                ⏳
                                            </div>
                                    }
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <span style={{
                                        padding: '0.35rem 0.8rem',
                                        borderRadius: '2rem',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        background: event.status === 'ONGOING' ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--primary) / 0.15)',
                                        color: event.status === 'ONGOING' ? 'hsl(var(--success))' : 'hsl(var(--primary))',
                                        border: `1px solid ${event.status === 'ONGOING' ? 'hsl(var(--success) / 0.2)' : 'hsl(var(--primary) / 0.2)'}`
                                    }}>
                                        {event.status}
                                    </span>
                                    {event.startDate && (
                                        <span style={{
                                            padding: '0.35rem 0.8rem',
                                            borderRadius: '2rem',
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            background: 'hsl(var(--foreground) / 0.05)',
                                            color: 'hsl(var(--muted-foreground))'
                                        }}>
                                            📅 {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {event.status === 'UPCOMING' ? 'Preview Rules' : 'Go to Lobby'}
                                        <span style={{ transition: 'transform 0.2s' }}>→</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Finished Events Section */}
                {finishedEvents.length > 0 && (
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ filter: 'grayscale(1)' }}>🏆</span> Past Events
                        </h2>

                        <div className="finished-events-grid" style={{
                            display: 'grid',
                            gap: '1.25rem'
                        }}>
                            {finishedEvents.map((event: any) => (
                                <div
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className="glass-panel"
                                    style={{
                                        padding: '1.25rem 1.5rem',
                                        borderRadius: '1.25rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        opacity: 0.8,
                                        background: 'hsl(var(--muted) / 0.05)'
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.opacity = '1';
                                        e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.3)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.opacity = '0.8';
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                    }}
                                >
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{event.name}</h3>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                            {
                                                (event.endDate || event.updatedAt) ?
                                                    <span>Ended on {new Date(event.endDate || event.updatedAt).toLocaleDateString()}</span>
                                                    :
                                                    <span>Ended</span>
                                            }
                                        </div>
                                    </div>
                                    <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.1rem' }}>🏁</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Modal isOpen={upcomingModalOpen} onClose={() => setUpcomingModalOpen(false)} title="Coming Soon">
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem' }}>🚀</div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{selectedEvent?.name}</h2>
                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1rem', lineHeight: 1.6 }}>
                        The countdown is on! This event is preparing for kick-off. Check the rules below.
                    </p>

                    <div style={{
                        margin: '2rem 0',
                        padding: '1.25rem',
                        background: 'hsl(var(--primary) / 0.05)',
                        borderRadius: '1rem',
                        border: '1px solid hsl(var(--primary) / 0.1)',
                        textAlign: 'left'
                    }}>
                        <div style={{ fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Event Intel</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ opacity: 0.7 }}>Starts:</span>
                                <span>{selectedEvent?.startDate ? new Date(selectedEvent.startDate).toLocaleString() : 'TBA'}</span>
                            </div>
                            {selectedEvent?.rules && (
                                <div style={{ borderTop: '1px solid hsl(var(--primary) / 0.1)', paddingTop: '0.5rem', marginTop: '0.5rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    "{selectedEvent.rules.substring(0, 100)}..."
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => window.location.href = `/events/${selectedEvent?.slug}`}
                            className={loginStyles.button}
                            style={{ flex: 1, fontWeight: 700 }}
                        >
                            View Rules
                        </button>
                    </div>
                </div>
            </Modal>

            <style jsx>{`
                .container {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .event-grid-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 1.5rem;
                }
                @media (max-width: 768px) {
                    .container {
                        padding: 1rem;
                    }
                    .event-grid-container {
                        display: flex;
                        overflow-x: auto;
                        scroll-snap-type: x proximity;
                        margin: 0 -1rem;
                        padding: 0.5rem 2rem 0.5rem 2rem !important;
                    }
                    .event-card {
                        min-width: 300px;
                        max-width: 300px;
                        scroll-snap-align: center;
                    }
                }
                .event-grid-container::-webkit-scrollbar {
                    display: none;
                }
                .event-card:hover {
                    transform: translateY(-6px);
                    border-color: hsl(var(--primary) / 0.4) !important;
                    background: hsl(var(--card)) !important;
                    box-shadow: 0 15px 30px -10px hsl(var(--primary) / 0.15);
                }
                .event-card:hover span {
                    transform: translateX(4px);
                }

                /* Finished Events Grid */
                .finished-events-grid {
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                }

                /* Search Input */
                .search-input {
                    min-width: 250px;
                }

                @media (max-width: 768px) {
                    .container {
                        padding: 1rem;
                    }
                    /* ... existing mobile styles ... */
                    .finished-events-grid {
                        grid-template-columns: 1fr;
                    }
                    .search-wrapper {
                        flex: 1;
                    }
                    .search-input {
                        min-width: 0;
                        width: 100%;
                    }
                }

                main {
                    animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div >
    );
}
