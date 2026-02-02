import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { generatePassword, generateUniquePublicId } from '@/lib/generators';
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
        const targetUser = await prisma.user.findUnique({
            where: { id },
            include: { events: { select: { id: true } } }
        });
        if (!targetUser) {
            return NextResponse.json({ status: false, message: 'User not found' }, { status: 200 });
        }

        // Scoping for EVENT_ADMIN
        if (payload.role === 'EVENT_ADMIN') {
            const currentUser = await prisma.user.findUnique({
                where: { id: payload.userId },
                include: { events: { select: { id: true } } }
            });

            const adminEventIds = (currentUser as any).events.map((e: any) => e.id);
            const targetUserEventIds = (targetUser as any).events.map((e: any) => e.id);

            // Allow if target is participant and shares at least one event with admin
            const hasCommonEvent = targetUserEventIds.some((id: string) => adminEventIds.includes(id));
            if (!currentUser || !hasCommonEvent || targetUser.role !== 'PARTICIPANT') {
                return NextResponse.json({ status: false, message: 'Forbidden: Scoped access required' }, { status: 200 });
            }
        }

        // 2. Input
        const body = await request.json();
        let { role, eventId, eventIds, resetPassword, newPassword } = body;

        // Security: EVENT_ADMIN cannot change role or eventIds
        if (payload.role === 'EVENT_ADMIN' && (role || eventId !== undefined || eventIds !== undefined)) {
            return NextResponse.json({ status: false, message: 'Forbidden: Event Admins cannot modify roles or events' }, { status: 200 });
        }

        const updateData: any = {};
        let newCredentials = null;

        if (role) updateData.role = role;

        // Handle Event updates
        if (eventId !== undefined && !eventIds) eventIds = eventId ? [eventId] : [];
        if (eventIds !== undefined) {
            // Deduplicate IDs
            const uniqueEventIds = Array.from(new Set(eventIds)) as string[];
            updateData.events = { set: uniqueEventIds.map((id: string) => ({ id })) };
            eventIds = uniqueEventIds; // Update the variable for later use in team creation
        }

        if (resetPassword || newPassword) {
            const password = newPassword || generatePassword(12);
            updateData.passwordHash = await hashPassword(password);
            newCredentials = { password };
        }

        // 3. Update User & Handle Teams
        const user = await prisma.$transaction(async (tx: any) => {
            const updatedUser = await tx.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    role: true,
                    avatarIndex: true
                }
            });

            // If Participant, ensure they have exactly one team in each associated event
            if ((role || targetUser.role) === 'PARTICIPANT' && eventIds !== undefined) {
                // Get current team associations
                const existingTeams = await tx.teamMember.findMany({
                    where: { userId: id },
                    include: { team: true }
                });

                const existingEventIds = existingTeams.map((m: any) => m.team.eventId);

                // Add teams for new events
                for (const targetEventId of eventIds) {
                    if (!existingEventIds.includes(targetEventId)) {
                        const teamPublicId = await generateUniquePublicId(tx, 'team');
                        const team = await tx.team.create({
                            data: {
                                name: updatedUser.username,
                                publicId: teamPublicId,
                                eventId: targetEventId,
                                iconIndex: (updatedUser as any).avatarIndex,
                            }
                        });

                        await tx.teamMember.create({
                            data: {
                                userId: id,
                                teamId: team.id
                            }
                        });
                    }
                }

                // Optional: Remove teams for events no longer associated?
                // For now, keep them for history, or we could delete if empty.
            }

            return updatedUser;
        });

        // 4. Log Action
        await logAction({
            action: resetPassword || newPassword ? 'USER_PASSWORD_RESET' : 'USER_UPDATE',
            details: {
                targetUserId: id,
                targetUsername: user.username,
                updatedFields: Object.keys(updateData).filter(k => k !== 'passwordHash'),
                eventIds: eventIds,
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
            include: { events: { select: { id: true } } }
        });

        if (!user) {
            return NextResponse.json({ status: false, message: 'User not found' }, { status: 200 });
        }

        // Scoping for EVENT_ADMIN
        if (payload.role === 'EVENT_ADMIN') {
            const currentUser = await prisma.user.findUnique({
                where: { id: payload.userId },
                include: { events: { select: { id: true } } }
            });

            const adminEventIds = (currentUser as any)?.events.map((e: any) => e.id) || [];
            const targetUserEventIds = (user as any).events.map((e: any) => e.id);
            const hasCommonEvent = targetUserEventIds.some((id: string) => adminEventIds.includes(id));

            if (!currentUser || !hasCommonEvent || user.role !== 'PARTICIPANT') {
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
