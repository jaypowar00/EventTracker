import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction } from '@/lib/logger';

export async function GET() {
    try {
        // 1. Auth Check (Optional for listing? Maybe only admins see all events, public sees via specific slug?)
        // For now, let's assume this is the ADMIN List, so we strictly require auth.
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        // 2. Fetch Events
        const events = await prisma.event.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { teams: true, users: true },
                },
                createdByUser: {
                    select: { username: true }
                }
            },
        });

        const data = events.map((event: any) => ({
            ...event,
            _count: {
                ...event._count,
                participants: event._count.users
            }
        }));

        return NextResponse.json({ status: true, message: 'Events fetched successfully', data });
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ status: false, message: 'Forbidden: Only Super Admins can create events' }, { status: 200 });
        }

        // 2. Input Validation
        const body = await request.json();
        const { name, slug, startDate, endDate, status } = body;

        if (!name || !slug) {
            return NextResponse.json({ status: false, message: 'Name and Slug are required' }, { status: 200 });
        }

        // 3. Slug Uniqueness Check
        const existing = await prisma.event.findUnique({
            where: { slug },
        });

        if (existing) {
            return NextResponse.json({ status: false, message: 'Slug already taken' }, { status: 200 });
        }

        // 4. Create Event
        const event = await prisma.event.create({
            data: {
                name,
                slug,
                status: status || 'UPCOMING',
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                createdByUserId: payload.userId,
            } as any,
        });

        // 5. Log Action
        await logAction({
            action: 'EVENT_CREATE',
            details: {
                eventId: event.id,
                eventName: event.name,
                eventSlug: event.slug
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({ status: true, message: 'Event created successfully', data: event });

    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
