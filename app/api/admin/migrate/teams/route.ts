import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateUniquePublicId } from '@/lib/generators';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        // 1. Auth Check (Super Admin only for migration)
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        // 2. Find all participants
        const participants = await prisma.user.findMany({
            where: { role: 'PARTICIPANT' },
            include: {
                memberships: true,
                events: { select: { id: true } }
            }
        } as any);

        let migratedCount = 0;

        // 3. Migrate each participant
        for (const user of participants) {
            // Already has a team? Skip
            if (user.memberships.length > 0) continue;

            const targetEvents = (user as any).events;
            if (!targetEvents || targetEvents.length === 0) continue;

            for (const eventRef of targetEvents) {
                await prisma.$transaction(async (tx: any) => {
                    const teamPublicId = await generateUniquePublicId(tx, 'team');
                    const team = await tx.team.create({
                        data: {
                            name: user.username,
                            publicId: teamPublicId,
                            eventId: eventRef.id,
                        }
                    });

                    await tx.teamMember.create({
                        data: {
                            userId: user.id,
                            teamId: team.id
                        }
                    });
                });
            }

            migratedCount++;
        }

        return NextResponse.json({
            status: true,
            message: `Migration complete. ${migratedCount} participants backfilled with teams.`
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
