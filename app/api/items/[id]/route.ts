import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction } from '@/lib/logger';

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
        if (!payload || !['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role)) {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        // 2. Find Item
        const item = await prisma.item.findUnique({
            where: { id: id },
            include: { event: true }
        });

        if (!item) {
            return NextResponse.json({ status: false, message: 'Item not found' }, { status: 200 });
        }

        // 3. Scoping for EVENT_ADMIN
        if (payload.role === 'EVENT_ADMIN') {
            const adminUser = await prisma.user.findUnique({
                where: { id: payload.userId },
                include: { events: { select: { id: true } } }
            });
            const adminEventIds = adminUser?.events.map((e: any) => e.id) || [];
            if (!adminEventIds.includes(item.eventId)) {
                return NextResponse.json({ status: false, message: 'Forbidden: Scoped access required' }, { status: 200 });
            }
        }

        // 4. Update Logic
        const body = await request.json();
        const { defaultPoints, name, defaultVolume, defaultPercentage } = body;

        const updateData: any = {};
        if (defaultPoints !== undefined) updateData.defaultPoints = parseInt(defaultPoints);
        if (name) updateData.name = name;
        if (defaultVolume !== undefined) updateData.defaultVolume = parseInt(defaultVolume);
        if (defaultPercentage !== undefined) updateData.defaultPercentage = parseFloat(defaultPercentage);

        const updatedItem = await prisma.item.update({
            where: { id: id },
            data: updateData
        });

        // 5. Log Action
        await logAction({
            action: 'ITEM_UPDATE',
            details: {
                itemId: id,
                itemName: item.name,
                eventId: item.eventId,
                updatedFields: Object.keys(updateData)
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role,
            eventId: item.eventId
        });

        return NextResponse.json({
            status: true,
            message: 'Item updated successfully',
            data: updatedItem
        });

    } catch (error: any) {
        console.error('Error updating item:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
