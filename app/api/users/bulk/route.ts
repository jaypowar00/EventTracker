import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { generatePassword, generateUniquePublicId } from '@/lib/generators';
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
        if (!payload || !['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role)) {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        const body = await request.json();
        const { action, userIds, users, value, eventId, eventIds, password: defaultPassword } = body;

        // 2. Bulk Delete
        if (action === 'delete') {
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return NextResponse.json({ status: false, message: 'No users selected' }, { status: 200 });
            }

            // Prevent deleting self or Super Admin if not Super Admin
            const usersToDelete = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, role: true, username: true }
            });

            const invalidDelete = usersToDelete.find(u => u.role === 'SUPER_ADMIN' && payload.role !== 'SUPER_ADMIN');
            if (invalidDelete) {
                return NextResponse.json({ status: false, message: 'Cannot delete Super Admin' }, { status: 200 });
            }

            await prisma.user.deleteMany({
                where: { id: { in: userIds } }
            });

            await logAction({
                action: 'USER_BULK_DELETE',
                details: { count: userIds.length, userIds },
                actorId: payload.userId,
                actorName: payload.username,
                actorRole: payload.role
            });

            return NextResponse.json({ status: true, message: `Deleted ${userIds.length} users` });
        }

        // 3. Bulk Toggle Welcome
        if (action === 'toggle_welcome') {
            if (!userIds || !Array.isArray(userIds)) {
                return NextResponse.json({ status: false, message: 'No users selected' }, { status: 200 });
            }

            await prisma.user.updateMany({
                where: { id: { in: userIds } },
                data: { hasSeenWelcome: value }
            });

            return NextResponse.json({ status: true, message: `Updated ${userIds.length} users` });
        }

        // 4. Bulk Create
        if (action === 'create') {
            if (!users || !Array.isArray(users) || users.length === 0) {
                return NextResponse.json({ status: false, message: 'No user data provided' }, { status: 200 });
            }

            type CreatedUserResult = { username: string; password?: string };
            type FailedUserResult = { username: string; reason: string };

            const createdUsers: CreatedUserResult[] = [];
            const failedUsers: FailedUserResult[] = [];

            // Admin Event Context check
            let targetEventIds: string[] = [];
            if (payload.role === 'EVENT_ADMIN') {
                const adminUser = await prisma.user.findUnique({
                    where: { id: payload.userId },
                    include: { events: { select: { id: true } } }
                });
                if (!adminUser || adminUser.events.length === 0) {
                    return NextResponse.json({ status: false, message: 'Admin has no events' }, { status: 200 });
                }
                targetEventIds = [adminUser.events[0].id]; // Default to first event for now
            } else if (eventIds && Array.isArray(eventIds)) {
                targetEventIds = eventIds;
            } else if (eventId) {
                targetEventIds = [eventId];
            }


            for (const userData of users) {
                try {
                    const { username } = userData;
                    if (!username) continue;

                    // Check duplicate
                    const existing = await prisma.user.findUnique({ where: { username } });
                    if (existing) {
                        failedUsers.push({ username, reason: 'Duplicate username' });
                        continue;
                    }

                    const password = defaultPassword || generatePassword(12);
                    const passwordHash = await hashPassword(password);
                    const publicId = await generateUniquePublicId(prisma, 'user');
                    const avatarIndex = Math.floor(Math.random() * 20);

                    await prisma.$transaction(async (tx: any) => {
                        const newUser = await tx.user.create({
                            data: {
                                username,
                                passwordHash,
                                publicId,
                                role: 'PARTICIPANT', // Bulk create defaults to Participant
                                avatarIndex,
                                events: {
                                    connect: targetEventIds.map(id => ({ id }))
                                }
                            }
                        });

                        // Create Team if event is present
                        if (targetEventIds.length > 0) {
                            for (const tid of targetEventIds) {
                                const teamPublicId = await generateUniquePublicId(tx, 'team');
                                const team = await tx.team.create({
                                    data: {
                                        name: username,
                                        publicId: teamPublicId,
                                        eventId: tid,
                                        iconIndex: avatarIndex,
                                    }
                                });
                                await tx.teamMember.create({
                                    data: { userId: newUser.id, teamId: team.id }
                                });
                            }
                        }

                        createdUsers.push({ username, password });
                    });

                } catch (e: any) {
                    failedUsers.push({ username: userData.username, reason: e.message });
                }
            }

            await logAction({
                action: 'USER_BULK_CREATE',
                details: { success: createdUsers.length, failed: failedUsers.length },
                actorId: payload.userId,
                actorName: payload.username,
                actorRole: payload.role
            });

            return NextResponse.json({
                status: true,
                message: `Created ${createdUsers.length} users. Failed: ${failedUsers.length}`,
                data: { createdUsers, failedUsers }
            });
        }

        return NextResponse.json({ status: false, message: 'Invalid action' }, { status: 200 });

    } catch (error: any) {
        console.error('Bulk action error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
