import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction } from '@/lib/logger';
import { generateUniquePublicId } from '@/lib/generators';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');
        if (!token) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });

        const payload = await verifyToken(token.value) as any;
        if (!payload) return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });

        const body = await request.json();
        const { action, teamId, teamName, iconIndex, eventId } = body;

        // --- 1. JOIN / SWITCH TEAM ---
        if (action === 'JOIN') {
            if (!teamId) return NextResponse.json({ status: false, message: 'Team ID required' }, { status: 200 });

            return await prisma.$transaction(async (tx: any) => {
                // Find current membership
                const currentMember = await tx.teamMember.findFirst({
                    where: { userId: payload.userId },
                    include: { team: true }
                });

                const oldTeamId = currentMember?.teamId;

                // Move to new team
                if (currentMember) {
                    await tx.teamMember.update({
                        where: { id: currentMember.id },
                        data: { teamId: teamId }
                    });
                } else {
                    await tx.teamMember.create({
                        data: {
                            userId: payload.userId,
                            teamId: teamId
                        }
                    });
                }

                // CLEANUP: If old team has 0 members, delete it
                if (oldTeamId && oldTeamId !== teamId) {
                    const remainingMembers = await tx.teamMember.count({
                        where: { teamId: oldTeamId }
                    });
                    if (remainingMembers === 0) {
                        await tx.team.delete({ where: { id: oldTeamId } });
                    }
                }

                return NextResponse.json({ status: true, message: 'Joined team successfully' });
            });
        }

        // --- 2. CREATE DEFAULT (FOR SKIP) ---
        if (action === 'CREATE_DEFAULT') {
            if (!eventId) return NextResponse.json({ status: false, message: 'Event ID required' }, { status: 200 });

            return await prisma.$transaction(async (tx: any) => {
                const user = await tx.user.findUnique({ where: { id: payload.userId } });

                // Does user already have a team?
                const existing = await tx.teamMember.findFirst({ where: { userId: payload.userId } });
                if (existing) return NextResponse.json({ status: true, message: 'User already has a team' });

                const teamPublicId = await generateUniquePublicId(tx, 'team');
                const team = await tx.team.create({
                    data: {
                        name: user.username,
                        publicId: teamPublicId,
                        eventId: eventId,
                        iconIndex: user.avatarIndex
                    }
                });

                await tx.teamMember.create({
                    data: {
                        userId: payload.userId,
                        teamId: team.id
                    }
                });

                return NextResponse.json({ status: true, message: 'Default team established' });
            });
        }

        return NextResponse.json({ status: false, message: 'Invalid action' }, { status: 200 });
    } catch (error: any) {
        console.error('Teams API error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');
        if (!token) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });

        const payload = await verifyToken(token.value) as any;
        if (!payload) return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });

        const body = await request.json();
        const { teamId, name, iconIndex } = body;

        if (!teamId) return NextResponse.json({ status: false, message: 'Team ID required' }, { status: 200 });

        // Authorization check: Is user a member of this team?
        const membership = await prisma.teamMember.findFirst({
            where: { userId: payload.userId, teamId: teamId }
        });

        if (!membership && payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ status: false, message: 'Forbidden: You are not a member of this team' }, { status: 200 });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (iconIndex !== undefined) updateData.iconIndex = iconIndex;

        const updatedTeam = await prisma.team.update({
            where: { id: teamId },
            data: updateData
        });

        // Log Action
        await logAction({
            action: 'TEAM_UPDATE',
            details: { teamId, updatedFields: Object.keys(updateData) },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({ status: true, message: 'Team updated successfully', data: updatedTeam });
    } catch (error: any) {
        console.error('Team update error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
