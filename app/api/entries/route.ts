import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload) {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        // 2. Input Validation
        const body = await request.json();
        const { itemName, quantity, eventId } = body;

        if (!itemName || !quantity || !eventId) {
            return NextResponse.json({ status: false, message: 'Item Name, Quantity and Event ID are required' }, { status: 200 });
        }

        const count = parseInt(quantity);
        if (isNaN(count) || count <= 0) {
            return NextResponse.json({ status: false, message: 'Quantity must be a positive number' }, { status: 200 });
        }

        // 3. User & Event Context
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { memberships: { include: { team: true } } }
        });

        if (!user || user.eventId !== eventId) {
            return NextResponse.json({ status: false, message: 'User not associated with this event' }, { status: 200 });
        }

        const team = user.memberships[0]?.team;
        if (!team) {
            return NextResponse.json({ status: false, message: 'User has no team association' }, { status: 200 });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (event?.status === 'FINISHED' && !['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role)) {
            return NextResponse.json({ status: false, message: 'This event has finished. No more entries allowed.' }, { status: 200 });
        }

        // 4. Find or Create Item
        let item = await prisma.item.findFirst({
            where: {
                name: { equals: itemName },
                eventId: eventId
            }
        });

        if (!item) {
            item = await prisma.item.create({
                data: {
                    name: itemName,
                    defaultPoints: 1, // Default as requested
                    eventId: eventId
                }
            });
        }

        // 5. Create Entry
        const entry = await prisma.entry.create({
            data: {
                count: count,
                pointsAwarded: count * item.defaultPoints, // Snapshot value
                userId: user.id,
                teamId: team.id,
                itemId: item.id
            }
        });

        // 6. Log Action
        await logAction({
            action: 'ENTRY_CREATE',
            details: {
                entryId: entry.id,
                itemName: item.name,
                count: count,
                teamId: team.id,
                eventId: eventId
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({
            status: true,
            message: 'Entry added successfully',
            data: entry
        });

    } catch (error: any) {
        console.error('Error adding entry:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
