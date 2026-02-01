import { prisma } from './prisma';

export async function logAction({
    action,
    details,
    actorId,
    actorName,
    actorRole,
    eventId
}: {
    action: string;
    details: any;
    actorId?: string;
    actorName: string;
    actorRole: string;
    eventId?: string;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                details: JSON.stringify(details),
                actorId,
                actorName,
                actorRole,
                eventId,
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}
