import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');

        // 1. Find Event
        const event = await prisma.event.findFirst({
            where: {
                OR: [
                    { id: slug },
                    { slug: slug }
                ]
            }
        });

        if (!event) {
            return NextResponse.json({ status: false, message: 'Event not found' }, { status: 200 });
        }

        // 2. Fetch Recent Entries
        const where: any = { team: { eventId: event.id } };
        if (teamId) where.teamId = teamId;

        const entries = await prisma.entry.findMany({
            where: where,
            orderBy: { timestamp: 'desc' },
            take: 50, // Last 50 entries
            include: {
                user: { select: { username: true, avatarIndex: true } },
                team: { select: { name: true } },
                item: { select: { name: true, defaultPoints: true } }
            }
        });

        // 3. Formulate Dynamic Messages
        const history = entries.map(entry => {
            return {
                id: entry.id,
                timestamp: entry.timestamp,
                username: entry.user.username,
                avatarIndex: entry.user.avatarIndex,
                teamName: entry.team.name,
                itemId: entry.itemId,
                itemName: entry.item.name,
                volume: entry.volume,
                percentage: entry.percentage,
                count: entry.count,
                points: entry.pointsAwarded,
                message: `${entry.user.username} earned ${entry.pointsAwarded} pts for ${entry.team.name}`
            };
        });

        return NextResponse.json({ status: true, data: history });

    } catch (error: any) {
        console.error('History error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
