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
                hasSeenWelcome: true,
                avatarIndex: true,
                events: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        status: true,
                        startDate: true,
                        endDate: true
                    } as any
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

        return NextResponse.json({
            status: true,
            data: user
        });

    } catch (error: any) {
        console.error('Error fetching current user:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
