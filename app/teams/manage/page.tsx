'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { AVATARS } from '@/lib/avatars';
import Modal from '@/components/Modal';
import styles from '@/app/admin/dashboard.module.css';
import loginStyles from '@/app/login.module.css';
import modalStyles from '@/components/Modal.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (!data.status) throw new Error(data.message);
    return data.data;
});

export default function ManageTeamPage() {
    const { data: user, mutate: mutateUser } = useSWR('/api/user/me', fetcher);
    // Fetch leaderboard for team switching
    const { data: leaderboard, mutate: mutateLeaderboard } = useSWR(user?.eventId ? `/api/events/${user.eventId}/leaderboard` : null, fetcher);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPicker, setShowPicker] = useState(false);

    const team = user?.memberships?.[0]?.team;

    const [formData, setFormData] = useState({
        name: '',
        iconIndex: 0
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createData, setCreateData] = useState({ name: '', iconIndex: 0 });
    const [showCreatePicker, setShowCreatePicker] = useState(false);

    useEffect(() => {
        if (team) {
            setFormData({
                name: team.name,
                iconIndex: team.iconIndex || 0
            });
        }
    }, [team]);

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!team) return;

        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'PATCH',
                body: JSON.stringify({
                    teamId: team.id,
                    name: formData.name,
                    iconIndex: formData.iconIndex
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setMessage({ type: 'success', text: 'Team updated successfully!' });
            setShowPicker(false);
            mutateUser();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTeam = async (teamId: string) => {
        if (!confirm('Are you sure you want to switch to this team?')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                body: JSON.stringify({ action: 'JOIN', teamId: teamId })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setMessage({ type: 'success', text: 'Switched team successfully!' });
            mutateUser();
            mutateLeaderboard();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'CREATE',
                    teamName: createData.name,
                    iconIndex: createData.iconIndex,
                    eventId: user.eventId
                })
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message);

            setIsCreateModalOpen(false);
            setCreateData({ name: '', iconIndex: 0 });
            setMessage({ type: 'success', text: 'New team created and joined!' });
            mutateUser();
            mutateLeaderboard();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className={styles.container}>Loading...</div>;
    if (!team) return (
        <div className={styles.container} style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '1.5rem' }}>
                <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>You are not currently a member of any team.</p>
                <button
                    onClick={() => window.history.back()}
                    className={loginStyles.button}
                    style={{ width: 'auto' }}
                >
                    Return Back
                </button>
            </div>
        </div>
    );

    return (
        <div className={styles.container} style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <h1 className={styles.title} style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)' }}>Manage Team</h1>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Customize your team identity or switch to another team.</p>
            </header>

            <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                {/* Left Side: Avatar & Switcher */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Team Icon Display & Toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: '140px', height: '140px', borderRadius: '2rem', overflow: 'hidden', border: '3.5px solid hsl(var(--primary))', padding: '0.8rem', background: 'hsl(var(--primary) / 0.05)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
                                <div dangerouslySetInnerHTML={{ __html: AVATARS[formData.iconIndex] }} style={{ width: '100%', height: '100%' }} />
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
                                title="Change Icon"
                            >
                                🎨
                            </button>
                        </div>

                        {showPicker && (
                            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '300px', animation: 'fadeInDown 0.3s ease' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <label className={loginStyles.label} style={{ margin: 0 }}>Choose Icon</label>
                                    <button onClick={() => setShowPicker(false)} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>Close</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', padding: '0.25rem' }}>
                                    {AVATARS.map((svg, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, iconIndex: i })}
                                            style={{
                                                background: formData.iconIndex === i ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--foreground) / 0.03)',
                                                border: `2px solid ${formData.iconIndex === i ? 'hsl(var(--primary))' : 'transparent'}`,
                                                padding: '0.3rem',
                                                borderRadius: '0.5rem',
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
                    </div>

                    {/* Team Switcher */}
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Switch Team</h3>
                            {leaderboard?.find((t: any) => t.id === team.id)?.memberCount > 1 && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    style={{ fontSize: '0.75rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)', padding: '0.3rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    ✨ Create New
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {leaderboard?.filter((t: any) => t.id !== team.id).map((otherTeam: any) => (
                                <button
                                    key={otherTeam.id}
                                    onClick={() => handleJoinTeam(otherTeam.id)}
                                    disabled={loading}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        border: '1px solid var(--border)',
                                        background: 'hsl(var(--foreground) / 0.03)',
                                        borderRadius: '0.75rem',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        width: '100%',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ width: '32px', height: '32px' }} dangerouslySetInnerHTML={{ __html: AVATARS[otherTeam.iconIndex || 0] }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherTeam.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{otherTeam.totalPoints} pts</div>
                                    </div>
                                    <span style={{ color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600 }}>Join</span>
                                </button>
                            ))}
                            {leaderboard?.filter((t: any) => t.id !== team.id).length === 0 && (
                                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>No other teams available.</p>
                            )}
                        </div>
                    </div>
                </aside>

                <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 5vw, 2rem)', borderRadius: '1.25rem' }}>
                        <form onSubmit={handleUpdateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label className={loginStyles.label}>Team Name</label>
                                <input
                                    className={loginStyles.input}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter team name..."
                                    required
                                />
                            </div>

                            {message.text && (
                                <p style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.75rem',
                                    fontSize: '0.875rem',
                                    background: message.type === 'error' ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--primary) / 0.1)',
                                    color: message.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                                    border: `1px solid ${message.type === 'error' ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--primary) / 0.2)'}`,
                                    textAlign: 'center',
                                    animation: 'fadeInDown 0.3s ease'
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
                                    {loading ? 'Saving...' : 'Update Name & Icon'}
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
                    </div>

                    {/* Current Members Section */}
                    {team && (
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                👥 Team Members
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>
                                    ({leaderboard?.find((t: any) => t.id === team.id)?.memberCount || 0})
                                </span>
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {leaderboard?.find((t: any) => t.id === team.id)?.members?.map((member: any) => (
                                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', background: 'hsl(var(--foreground) / 0.03)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid hsl(var(--primary))' }} dangerouslySetInnerHTML={{ __html: AVATARS[member.avatarIndex || 0] }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{member.username} {member.id === user.id && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(You)</span>}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>ID: {member.publicId}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '1rem' }}>{member.points} pts</div>
                                        </div>
                                    </div>
                                ))}
                                {!leaderboard && <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>Loading member data...</p>}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Team">
                <form onSubmit={handleCreateTeam} className={modalStyles.form}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '1.5rem', overflow: 'hidden', border: '3px solid hsl(var(--primary))', padding: '0.6rem', background: 'hsl(var(--primary) / 0.05)' }}>
                                <div dangerouslySetInnerHTML={{ __html: AVATARS[createData.iconIndex] }} style={{ width: '100%', height: '100%' }} />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreatePicker(!showCreatePicker)}
                                style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'hsl(var(--primary))', color: '#fff', border: '2px solid hsl(var(--background))', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
                            >
                                🎨
                            </button>
                        </div>

                        {showCreatePicker && (
                            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '1rem', width: '100%' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', padding: '0.25rem' }}>
                                    {AVATARS.map((svg, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => { setCreateData({ ...createData, iconIndex: i }); setShowCreatePicker(false); }}
                                            style={{ background: createData.iconIndex === i ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--foreground) / 0.03)', border: `2px solid ${createData.iconIndex === i ? 'hsl(var(--primary))' : 'transparent'}`, padding: '0.25rem', borderRadius: '0.4rem', cursor: 'pointer', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            dangerouslySetInnerHTML={{ __html: svg }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={loginStyles.label}>Team Name</label>
                        <input
                            className={loginStyles.input}
                            value={createData.name}
                            onChange={e => setCreateData({ ...createData, name: e.target.value })}
                            placeholder="Enter unique team name..."
                            required
                        />
                    </div>

                    <div className={modalStyles.footer}>
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className={modalStyles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={loading} className={modalStyles.submitBtn}>
                            {loading ? 'Creating...' : 'Create & Join'}
                        </button>
                    </div>
                </form>
            </Modal>

            <style jsx>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (min-width: 1024px) {
                    .profile-grid {
                        grid-template-columns: 320px 1fr !important;
                        align-items: start;
                    }
                }
            `}</style>
        </div>
    );
}
