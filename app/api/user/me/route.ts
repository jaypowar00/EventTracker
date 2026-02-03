import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload) {
            return NextResponse.json({ status: false, message: 'Invalid session' }, { status: 200 });
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
                    } as any
                }
            } as any
        });

        if (!user) {
            return NextResponse.json({ status: false, message: 'User not found' }, { status: 200 });
        }

        // Transform to flat structure for frontend compatibility
        const formattedUser = {
            ...user,
            participations: undefined,
            events: user.participations.map((p: any) => ({
                ...p.event,
                hasSeenWelcome: p.hasSeenWelcome
            }))
        };

        return NextResponse.json({
            status: true,
            data: formattedUser
        });

    } catch (error: any) {
        console.error('Error fetching current user:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
