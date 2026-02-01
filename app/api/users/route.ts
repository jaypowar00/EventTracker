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

        // 2. Input Validation
        const body = await request.json();
        let { username, role, password: customPassword, eventId } = body;

        // Scoping for EVENT_ADMIN
        if (payload.role === 'EVENT_ADMIN') {
            const currentUser = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!currentUser || !currentUser.eventId) {
                return NextResponse.json({ status: false, message: 'Admin event context missing' }, { status: 200 });
            }
            // Force role to PARTICIPANT and eventId to admin's event
            role = 'PARTICIPANT';
            eventId = currentUser.eventId;
        }

        if (!username || !role) {
            return NextResponse.json({ status: false, message: 'Username and Role are required' }, { status: 200 });
        }

        if (!['EVENT_ADMIN', 'PARTICIPANT'].includes(role) && payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ status: false, message: 'Invalid role selection' }, { status: 200 });
        }

        // 3. Check username uniqueness
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json({ status: false, message: 'Username already exists' }, { status: 200 });
        }

        // 4. Generate credentials
        const password = customPassword || generatePassword(12);
        const publicId = await generateUniquePublicId(prisma, 'user');
        const passwordHash = await hashPassword(password);

        // 5. Create User and Associate Team (if Participant)
        const user = await prisma.$transaction(async (tx: any) => {
            const avatarIndex = Math.floor(Math.random() * 20); // Random initial avatar
            const newUser = await tx.user.create({
                data: {
                    username,
                    passwordHash,
                    publicId,
                    role,
                    avatarIndex,
                    eventId: eventId || null,
                },
                select: {
                    id: true,
                    username: true,
                    publicId: true,
                    role: true,
                    eventId: true,
                    createdAt: true,
                },
            });

            // COMPULSORY: Automatically create team for PARTICIPANT
            if (role === 'PARTICIPANT' && eventId) {
                const teamPublicId = await generateUniquePublicId(tx, 'team');
                const team = await tx.team.create({
                    data: {
                        name: username,
                        publicId: teamPublicId,
                        eventId: eventId,
                        iconIndex: avatarIndex, // Same as user's initial avatar
                    }
                });

                await tx.teamMember.create({
                    data: {
                        userId: newUser.id,
                        teamId: team.id
                    }
                });
            }

            return newUser;
        });

        // 6. Log Action
        await logAction({
            action: 'USER_CREATE',
            details: {
                createdUserId: user.id,
                createdUsername: user.username,
                targetUsername: user.username, // Added for redundancy/compatibility
                role: user.role,
                eventId: user.eventId
            },
            actorId: payload.userId,
            actorName: payload.username,
            actorRole: payload.role
        });

        // 7. Return user details with plain password (only time it's shown)
        return NextResponse.json({
            status: true,
            message: 'User created successfully',
            data: {
                user,
                credentials: {
                    username: user.username,
                    password: password, // Plain password for admin to share
                    publicId: user.publicId,
                },
            },
        });

    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value);
        if (!payload) {
            return NextResponse.json({ status: false, message: 'Invalid token' }, { status: 200 });
        }

        // 2. Fetch all users (excluding SUPER_ADMIN for security)
        const users = await prisma.user.findMany({
            where: {
                role: {
                    not: 'SUPER_ADMIN',
                },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                publicId: true,
                role: true,
                createdAt: true,
                event: {
                    select: {
                        name: true,
                        slug: true
                    }
                }
            },
        });

        return NextResponse.json({ status: true, message: 'Users fetched successfully', data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
