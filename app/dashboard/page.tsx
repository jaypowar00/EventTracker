import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import DashboardContent from './DashboardContent';
import { redirect } from 'next/navigation';

/**
 * Server-side data fetching for the Dashboard.
 * This pre-renders user data to eliminate the "Loading..." flash.
 */
async function getInitialUserData() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token');

    if (!token) {
        return null;
    }

    try {
        const payload = await verifyToken(token.value) as any;
        if (!payload) {
            return null;
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                username: true,
                role: true,
                publicId: true,
                createdAt: true,
                avatarIndex: true,
                participations: {
                    select: {
                        hasSeenWelcome: true,
                        event: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                status: true,
                                startDate: true,
                                endDate: true
                            }
                        }
                    }
                },
                memberships: {
                    include: {
                        team: true
                    }
                }
            }
        }) as any;

        if (!user) return null;

        // Transform for frontend compatibility (flatten participations -> events)
        const formattedUser = {
            ...user,
            participations: undefined,
            events: user.participations.map((p: any) => ({
                ...p.event,
                hasSeenWelcome: p.hasSeenWelcome
            }))
        };

        return formattedUser;
    } catch (error) {
        console.error('SSR: Error fetching user data:', error);
        return null;
    }
}

export default async function DashboardPage() {
    const initialUser = await getInitialUserData();

    // If no user found, redirect to login
    if (!initialUser) {
        redirect('/');
    }

    return <DashboardContent initialUser={initialUser} />;
}
