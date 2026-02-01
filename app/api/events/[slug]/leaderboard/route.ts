import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

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

        // 2. Fetch Teams and calculate Dynamic Points
        const teams = await prisma.team.findMany({
            where: { eventId: event.id },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatarIndex: true,
                                publicId: true
                            }
                        }
                    }
                },
                entries: {
                    include: {
                        item: true
                    }
                }
            }
        });

        const leaderboard = teams.map(team => {
            // Group points by user
            const memberPoints: Record<string, number> = {};

            let totalPoints = 0;
            team.entries.forEach(entry => {
                const points = entry.count * entry.item.defaultPoints;
                totalPoints += points;
                memberPoints[entry.userId] = (memberPoints[entry.userId] || 0) + points;
            });

            // Map members to include their points
            const members = team.members.map(m => ({
                id: m.user.id,
                username: m.user.username,
                avatarIndex: m.user.avatarIndex,
                publicId: m.user.publicId,
                points: memberPoints[m.user.id] || 0
            })).sort((a, b) => b.points - a.points);

            return {
                id: team.id,
                name: team.name,
                publicId: team.publicId,
                totalPoints: totalPoints,
                iconIndex: team.iconIndex,
                isRanked: totalPoints > 0,
                memberCount: members.length,
                members: members
            };
        });

        // 3. Sort by points descending
        leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

        return NextResponse.json({ status: true, data: leaderboard });

    } catch (error: any) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
