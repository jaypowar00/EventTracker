import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { generatePassword } from '@/lib/generators';
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

        // Fetch target user for scoping check
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json({ status: false, message: 'User not found' }, { status: 200 });
        }

        // Scoping for EVENT_ADMIN
        if (payload.role === 'EVENT_ADMIN') {
            const currentUser = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!currentUser || currentUser.eventId !== targetUser.eventId || targetUser.role !== 'PARTICIPANT') {
                return NextResponse.json({ status: false, message: 'Forbidden: Scoped access required' }, { status: 200 });
            }
        }

        // 2. Input
        const body = await request.json();
        const { role, eventId, resetPassword, newPassword } = body;

        // Security: EVENT_ADMIN cannot change role or eventId
        if (payload.role === 'EVENT_ADMIN' && (role || eventId !== undefined)) {
            return NextResponse.json({ status: false, message: 'Forbidden: Event Admins cannot modify roles or events' }, { status: 200 });
        }

        const updateData: any = {};
        let newCredentials = null;

        if (role) updateData.role = role;
        if (eventId !== undefined) updateData.eventId = eventId; // Allow setting to null

        if (resetPassword || newPassword) {
            const password = newPassword || generatePassword(12);
            updateData.passwordHash = await hashPassword(password);
            newCredentials = { password };
        }

        // 3. Update User
        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                username: true,
                role: true,
                eventId: true
            }
        });

        // 4. Log Action
        let eventName = null;
        if (updateData.eventId) {
            const event = await prisma.event.findUnique({ where: { id: updateData.eventId } });
            eventName = event?.name;
        }

        await logAction({
            action: resetPassword || newPassword ? 'USER_PASSWORD_RESET' : 'USER_UPDATE',
            details: {
                targetUserId: id,
                targetUsername: user.username,
                updatedFields: Object.keys(updateData).filter(k => k !== 'passwordHash'),
                eventName: eventName,
                isManualReset: !!newPassword
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({
            status: true,
            message: 'User updated successfully',
            data: {
                user,
                credentials: newCredentials
            }
        });

    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json({ status: false, message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

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
        if (!payload || !['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role)) {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        // Cannot delete self
        if (id === payload.userId) {
            return NextResponse.json({ status: false, message: 'Cannot delete your own account' }, { status: 200 });
        }

        // 2. Get User for Logging and Scoping
        const user = await prisma.user.findUnique({
            where: { id },
            select: { username: true, role: true, eventId: true }
        });

        if (!user) {
            return NextResponse.json({ status: false, message: 'User not found' }, { status: 200 });
        }

        // Scoping for EVENT_ADMIN
        if (payload.role === 'EVENT_ADMIN') {
            const currentUser = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!currentUser || currentUser.eventId !== user.eventId || user.role !== 'PARTICIPANT') {
                return NextResponse.json({ status: false, message: 'Forbidden: Scoped access required' }, { status: 200 });
            }
        }

        // 3. Delete User (Cascade deletes depend on schema. We might need manual cleaning if needed)
        await prisma.$transaction(async (tx) => {
            // Find teams the user is in
            const memberships = await tx.teamMember.findMany({
                where: { userId: id },
                select: { teamId: true }
            });

            // Delete User
            await tx.user.delete({
                where: { id },
            });

            // Cleanup orphaned teams (0 members)
            for (const member of memberships) {
                const memberCount = await tx.teamMember.count({
                    where: { teamId: member.teamId }
                });
                if (memberCount === 0) {
                    await tx.team.delete({ where: { id: member.teamId } });
                }
            }
        });

        // 4. Log Action
        await logAction({
            action: 'USER_DELETE',
            details: {
                deletedUserId: id,
                deletedUsername: user.username,
                deletedRole: user.role
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({ status: true, message: 'User deleted successfully' });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
