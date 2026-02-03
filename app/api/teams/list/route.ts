import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction } from '@/lib/logger';

/**
 * GET /api/teams/list
 * Returns all teams with member count and event info
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || !['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role)) {
            return NextResponse.json({ status: false, message: 'Admin access required' }, { status: 200 });
        }

        const teams = await prisma.team.findMany({
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        status: true
                    }
                },
                members: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: true,
                        entries: true
                    }
                }
            },
            orderBy: [
                { event: { name: 'asc' } },
                { name: 'asc' }
            ]
        });

        // Transform for frontend
        const formattedTeams = teams.map(team => ({
            id: team.id,
            name: team.name,
            publicId: team.publicId,
            iconIndex: team.iconIndex,
            createdAt: team.createdAt,
            eventId: team.eventId,
            eventName: team.event.name,
            eventSlug: team.event.slug,
            eventStatus: team.event.status,
            memberCount: team._count.members,
            entryCount: team._count.entries,
            members: team.members.map(m => ({
                id: m.user.id,
                username: m.user.username
            }))
        }));

        return NextResponse.json({ status: true, data: formattedTeams });

    } catch (error: any) {
        console.error('Error fetching teams:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/teams/list
 * Bulk delete teams by IDs
 */
export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || !['SUPER_ADMIN', 'EVENT_ADMIN'].includes(payload.role)) {
            return NextResponse.json({ status: false, message: 'Admin access required' }, { status: 200 });
        }

        const { teamIds } = await request.json();

        if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
            return NextResponse.json({ status: false, message: 'No team IDs provided' }, { status: 200 });
        }

        // Get team names for logging
        const teamsToDelete = await prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true, eventId: true }
        });

        // Delete teams (cascades to members, entries, history, requests)
        const result = await prisma.team.deleteMany({
            where: { id: { in: teamIds } }
        });

        // Log action
        await logAction({
            action: 'TEAM_BULK_DELETE',
            details: {
                count: result.count,
                teamNames: teamsToDelete.map(t => t.name)
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        return NextResponse.json({
            status: true,
            message: `Deleted ${result.count} team(s) successfully`,
            data: { deletedCount: result.count }
        });

    } catch (error: any) {
        console.error('Error bulk deleting teams:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
