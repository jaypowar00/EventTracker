import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword, verifyPassword } from '@/lib/auth';
import { logAction } from '@/lib/logger';
import { cookies } from 'next/headers';

export async function PATCH(request: Request) {
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

        const body = await request.json();
        const { username, currentPassword, newPassword } = body;

        // Fetch current user and handle potential non-existence
        const currentUser = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { events: { select: { id: true } } }
        });

        if (!currentUser) {
            return NextResponse.json({ status: false, message: 'User not found' }, { status: 200 });
        }

        const updates: any = {};

        // 1. Handle Username Update
        if (username && username !== currentUser.username) {
            // Check uniqueness
            const existing = await prisma.user.findUnique({ where: { username } });
            if (existing) {
                return NextResponse.json({ status: false, message: 'Username already taken' }, { status: 200 });
            }

            updates.username = username;

            await logAction({
                actorId: currentUser.id,
                actorName: currentUser.username,
                actorRole: currentUser.role,
                action: 'USER_RENAME',
                details: {
                    oldUsername: currentUser.username,
                    newUsername: username
                },
                eventId: currentUser.events[0]?.id
            });
        }

        // 2. Handle Password Change
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ status: false, message: 'Current password required' }, { status: 200 });
            }

            const isCorrect = await verifyPassword(currentPassword, currentUser.passwordHash);
            if (!isCorrect) {
                return NextResponse.json({ status: false, message: 'Incorrect current password' }, { status: 200 });
            }

            updates.passwordHash = await hashPassword(newPassword);

            await logAction({
                actorId: currentUser.id,
                actorName: currentUser.username,
                actorRole: currentUser.role,
                action: 'USER_PASSWORD_CHANGE',
                details: {
                    message: 'User changed their own password'
                },
                eventId: currentUser.events[0]?.id
            });
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ status: false, message: 'No changes provided' }, { status: 200 });
        }

        await prisma.user.update({
            where: { id: currentUser.id },
            data: updates
        });

        return NextResponse.json({
            status: true,
            message: 'Settings updated successfully'
        });

    } catch (error: any) {
        console.error('Settings update error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
