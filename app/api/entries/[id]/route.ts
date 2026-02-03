import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction } from '@/lib/logger';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // 2. Find Entry
        const entry = await prisma.entry.findUnique({
            where: { id: id },
            include: { user: true, team: true, item: true }
        });

        if (!entry) {
            return NextResponse.json({ status: false, message: 'Entry not found' }, { status: 200 });
        }

        // 3. Authorization: Only owner or admin
        const isAdmin = ['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role);
        const isOwner = entry.userId === payload.userId;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ status: false, message: 'Forbidden: You can only delete your own entries' }, { status: 200 });
        }

        // 3.5. Finished Event Lockdown for Participants
        if (!isAdmin && isOwner) {
            const event = await prisma.event.findUnique({
                where: { id: entry.team.eventId }
            });
            if (event?.status === 'FINISHED') {
                return NextResponse.json({ status: false, message: 'This event has finished. Participants cannot delete entries.' }, { status: 200 });
            }
        }

        // 4. Delete Entry
        await prisma.entry.delete({
            where: { id: id }
        });

        // 5. Log Action
        await logAction({
            action: 'ENTRY_DELETE',
            details: {
                entryId: id,
                itemName: entry.item.name,
                points: entry.pointsAwarded,
                teamName: entry.team.name,
                originalOwner: entry.user.username
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role,
            eventId: entry.team.eventId
        });

        return NextResponse.json({
            status: true,
            message: 'Entry deleted successfully'
        });

    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // 2. Find Entry
        const entry = await prisma.entry.findUnique({
            where: { id: id },
            include: { team: true, item: true }
        });

        if (!entry) {
            return NextResponse.json({ status: false, message: 'Entry not found' }, { status: 200 });
        }

        // 3. Authorization: Only owner or admin
        const isAdmin = ['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role);
        const isOwner = entry.userId === payload.userId;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ status: false, message: 'Forbidden: You can only edit your own entries' }, { status: 200 });
        }

        // 4. Input Validation
        const body = await request.json();
        const { quantity, volume, percentage } = body;

        const count = parseInt(quantity || entry.count.toString());
        const vol = parseInt(volume !== undefined ? volume.toString() : entry.volume.toString());
        const perc = parseFloat(percentage !== undefined ? percentage.toString() : entry.percentage.toString());

        if (isNaN(count) || count <= 0) {
            return NextResponse.json({ status: false, message: 'Quantity must be a positive number' }, { status: 200 });
        }

        // 5. Recalculate Points
        const calculatedPoints = Math.round((vol * perc * count) / 10);

        // 6. Update Entry
        const updatedEntry = await prisma.entry.update({
            where: { id: id },
            data: {
                count: count,
                volume: vol,
                percentage: perc,
                pointsAwarded: calculatedPoints
            }
        });

        // 7. Log Action
        await logAction({
            action: 'ENTRY_UPDATE',
            details: {
                entryId: id,
                old: { count: entry.count, vol: entry.volume, perc: entry.percentage, points: entry.pointsAwarded },
                new: { count, vol, perc, points: calculatedPoints },
                itemName: entry.item.name,
                teamName: entry.team.name
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role,
            eventId: entry.team.eventId
        });

        return NextResponse.json({
            status: true,
            message: 'Entry updated successfully',
            data: updatedEntry
        });

    } catch (error: any) {
        console.error('Error updating entry:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
