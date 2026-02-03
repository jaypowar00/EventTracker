import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction } from '@/lib/logger';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const event = await prisma.event.findFirst({
            where: {
                OR: [
                    { id: slug },
                    { slug: slug }
                ]
            },
            include: {
                _count: {
                    select: { teams: true, participants: true }
                }
            }
        });

        if (!event) {
            return NextResponse.json({ status: false, message: 'Event not found' }, { status: 200 });
        }

        return NextResponse.json({ status: true, data: event });
    } catch (error: any) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || !['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role)) {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        // 2. Find Event
        const event = await prisma.event.findFirst({
            where: {
                OR: [
                    { id: slug },
                    { slug: slug }
                ]
            }
        });

        if (!event) {
            return NextResponse.json({ status: false, message: 'Event not found' }, { status: 200 });
        }

        // 3. Scoping for EVENT_ADMIN
        if (payload.role === 'EVENT_ADMIN' && payload.eventId !== event.id) {
            return NextResponse.json({ status: false, message: 'Forbidden: Scoped access required' }, { status: 200 });
        }

        // 4. Update Logic
        const body = await request.json();
        const { rules, name, status, newSlug, startDate, endDate } = body;

        const updateData: any = {};
        if (rules !== undefined) updateData.rules = rules;
        if (name) updateData.name = name;
        if (status) updateData.status = status;
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
        if (newSlug && payload.role === 'SUPER_ADMIN') updateData.slug = newSlug;

        const updatedEvent = await prisma.event.update({
            where: { id: event.id },
            data: updateData
        });

        // 5. Log Action
        await logAction({
            action: 'EVENT_UPDATE',
            details: {
                eventId: event.id,
                eventName: updatedEvent.name,
                updatedFields: Object.keys(updateData)
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({
            status: true,
            message: 'Event updated successfully',
            data: updatedEvent
        });

    } catch (error: any) {
        console.error('Error updating event:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ status: false, message: 'Forbidden: Only Super Admins can delete events' }, { status: 200 });
        }

        // 2. Find Event (can be by ID or Slug)
        const event = await prisma.event.findFirst({
            where: {
                OR: [
                    { id: slug },
                    { slug: slug }
                ]
            }
        });

        if (!event) {
            return NextResponse.json({ status: false, message: 'Event not found' }, { status: 200 });
        }

        // 3. Delete Event
        await prisma.event.delete({
            where: { id: event.id },
        });

        // 4. Log Action
        await logAction({
            action: 'EVENT_DELETE',
            details: {
                deletedEventId: event.id,
                deletedEventName: event.name,
                deletedEventSlug: event.slug
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({ status: true, message: 'Event deleted successfully' });

    } catch (error: any) {
        console.error('Error deleting event:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
