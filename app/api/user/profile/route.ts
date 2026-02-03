import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/logger';

export async function PATCH(request: Request) {
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

        const body = await request.json();
        const { username, password, avatarIndex, hasSeenWelcome, eventId } = body;

        const updateData: any = {};

        // 2. Username Change (Uniqueness check)
        if (username) {
            const existing = await prisma.user.findFirst({
                where: {
                    username: { equals: username, mode: 'insensitive' },
                    NOT: { id: payload.userId }
                }
            });
            if (existing) {
                return NextResponse.json({ status: false, message: 'Username already taken' }, { status: 200 });
            }
            updateData.username = username;
        }

        // 3. Password Hash
        if (password) {
            updateData.passwordHash = await hashPassword(password);
        }

        // 4. Identity & Onboarding
        if (avatarIndex !== undefined) updateData.avatarIndex = avatarIndex;

        // Handle Event-specific Welcome Status
        if (hasSeenWelcome !== undefined && eventId) {
            await prisma.eventParticipant.update({
                where: {
                    userId_eventId: {
                        userId: payload.userId,
                        eventId: eventId
                    }
                },
                data: { hasSeenWelcome }
            });
            // We don't add this to updateData as it's a separate model
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ status: false, message: 'No changes provided' }, { status: 200 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                avatarIndex: true
            }
        });

        // 5. Log Action
        await logAction({
            action: 'USER_PROFILE_UPDATE',
            details: { updatedFields: Object.keys(updateData) },
            actorId: payload.userId,
            actorName: updatedUser.username,
            actorRole: payload.role
        });

        return NextResponse.json({
            status: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });

    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
