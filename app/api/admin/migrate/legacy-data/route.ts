import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
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

        // 2. Fetch all users with legacy events (requires schema to have both relations active)
        const users = await prisma.user.findMany({
            include: {
                events: true
            }
        });

        let migratedCount = 0;
        let errors = [];

        // 3. Migrate
        for (const user of users) {
            // @ts-ignore - access deprecated relation
            const legacyEvents = user.events;
            if (!legacyEvents || legacyEvents.length === 0) continue;

            for (const event of legacyEvents) {
                try {
                    // Create EventParticipant
                    // Check existence logic handled by database constraints usually, but using upsert is safer
                    await prisma.eventParticipant.upsert({
                        where: {
                            userId_eventId: { userId: user.id, eventId: event.id }
                        },
                        create: {
                            userId: user.id,
                            eventId: event.id,
                            hasSeenWelcome: false // Default to false so they see welcome modal again? Or true? 
                            // User asked to preserve links. Onboarding logic is new. Maybe set to false so they get the new onboarding?
                            // Or true to avoid annoyance?
                            // Safest is false -> they see the modal and can accept/skip.
                        },
                        update: {} // No op if exists
                    });
                    migratedCount++;
                } catch (e: any) {
                    errors.push(`Failed for user ${user.username} event ${event.name}: ${e.message}`);
                }
            }
        }

        return NextResponse.json({
            status: true,
            message: `Legacy migration complete. ${migratedCount} participation records created.`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Legacy migration error:', error);
        return NextResponse.json({ status: false, message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
