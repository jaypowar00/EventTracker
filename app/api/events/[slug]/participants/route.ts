import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload) {
            return NextResponse.json({ status: false, message: 'Invalid session' }, { status: 200 });
        }

        // Check if Event Admin for THIS event
        const event = await prisma.event.findUnique({ where: { slug } });
        if (!event) return NextResponse.json({ status: false, message: 'Event not found' }, { status: 200 });

        if (payload.role !== 'SUPER_ADMIN') {
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                include: { participations: { select: { eventId: true } } }
            });

            const isAssociated = user?.participations.some(p => p.eventId === event.id);
            if (!user || user.role !== 'EVENT_ADMIN' || !isAssociated) {
                return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
            }
        }

        const users = await prisma.user.findMany({
            where: {
                participations: {
                    some: { eventId: event.id }
                },
                role: 'PARTICIPANT'
            },
            select: {
                id: true,
                username: true,
                publicId: true,
                createdAt: true
            },
            orderBy: {
                username: 'asc'
            }
        });

        return NextResponse.json({
            status: true,
            data: users
        });

    } catch (error: any) {
        console.error('Error listing event participants:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
